# Lustre — Chief Technology Officer: Enterprise Readiness Roadmap

**Reference:** CTO-ENT-001
**Author:** Chief Technology Officer
**Date:** March 2026
**Status:** Draft for Executive Review
**Companion Documents:** CRM-ENT-001 (CCO), OPS-ENT-001 (COO), CFO-ENT-001 (CFO), CPO-ENT-001 (CPO)

---

## Executive Summary

Lustre is, technically speaking, better than it has any right to be at MVP stage. The choice of multi-tenant Row-Level Security at the database layer, a fully type-safe TypeScript codebase, and server-side rendering from day one reflects disciplined early engineering decisions. These choices will save us months of remediation work that less careful teams face when they try to grow.

But good foundations do not automatically become enterprise infrastructure. There is a meaningful gap between an MVP that works and a platform that enterprise customers can trust. That gap is not primarily about adding features — the COO, CCO, and CPO documents address what features to build and how to operate them. This document addresses the underlying technical architecture, engineering discipline, and platform strategy that determines whether the features we build will hold up under the demands of real enterprise customers.

My assessment is that we have three distinct categories of technical work ahead:

**Category 1 — Technical risk to neutralise.** These are gaps in the current architecture that represent genuine risk: no schema migration tooling, no structured error handling strategy, no secrets management beyond environment variables, and a server action pattern that will not scale to API-first enterprise integrations. These must be resolved before we close our first enterprise contract.

**Category 2 — Platform investments to make.** These are deliberate architectural decisions that will compound in value over the next 12 months: a well-designed versioned public API, an event-driven architecture for async work, a coherent build vs. buy strategy for third-party services, and an engineering operating model that allows the team to ship with confidence.

**Category 3 — Technical bets to take.** These are forward-looking architectural decisions where we must commit to a direction: how we handle schema evolution as the data model grows, where we draw service boundaries (and when), what our AI/ML strategy is, and how we architect for multi-region deployment when the time comes.

This document is deliberately distinct from the operational, commercial, and product plans. It does not repeat what the COO says about CI/CD, what the CCO says about CRM features, or what the CPO says about analytics tooling. It addresses the technical substrate that all of those plans depend on.

---

## 1. Codebase Assessment — The Technical Reality

### 1.1 What the Engineering Team Got Right

**Row-Level Security as the tenancy model.** Enforcing multi-tenancy at the database layer — not the application layer — is the correct architectural decision for a SaaS CRM. It means that a bug in the application code cannot cause data leakage between tenants; the database enforces the boundary. This is the single most important security property of the system and it was made correctly at the start.

**TypeScript throughout.** Full type coverage from the database query layer through to the UI components means the compiler catches an entire class of bugs at build time. The types in `/src/lib/types/index.ts` accurately represent the database schema and are used consistently across actions and queries. This is not universal in MVP codebases and it will pay dividends.

**Server actions over a REST API.** For the current scale and team size, Next.js server actions are the right choice. They eliminate an entire layer of API boilerplate, enforce type safety across the client-server boundary, and co-locate mutations with the UI that triggers them. This was the pragmatic call and it was correct.

**Immutable audit logging.** The decision to enforce audit log immutability at the RLS level — no UPDATE or DELETE policies on the audit table — reflects genuine security thinking. This is the kind of decision that is nearly impossible to retrofit once an enterprise customer has signed a contract and is relying on audit trail integrity.

**Append-only activity timeline.** Same reasoning as the audit log. Activities are never deleted, only created. This gives enterprise customers a reliable history of client interactions that holds up to scrutiny.

### 1.2 Technical Debt Inventory

The following are specific, identified technical debts in the current codebase. These are not theoretical concerns — they are concrete issues that will become blockers as we scale.

**TD-001: No database migration tooling.**
All schema changes are applied manually via the Supabase dashboard. There is no migration history, no rollback mechanism, and no way to reproduce the production schema in a new environment. The files `supabase/rls.sql` and `supabase/audit.sql` are snapshots, not migrations. This is the highest-severity technical debt we carry. A single wrong SQL statement applied in production with no rollback path is an existential risk.

**TD-002: Server actions cannot be consumed by external clients.**
The entire mutation layer is built on Next.js server actions, which are HTTP endpoints tied to React's form action protocol. They are not a public API. The CCO plan correctly calls for a REST API — but it will require a full rewrite of the mutation layer to expose it externally, not a simple wrapper. This will be significantly more work than it appears.

**TD-003: The `SUPABASE_SERVICE_ROLE_KEY` is used in application code.**
The service role key in `/src/lib/supabase/service.ts` bypasses all RLS policies. It is currently used only for the quote share token lookup (public quote page). This is the minimal blast radius version of a service role key usage, but the pattern is established and will be copied. Any future developer who needs to "just bypass RLS for a minute" has a convenient template to follow. The service role key must be restricted to a dedicated server-side function with no user-facing path.

**TD-004: No structured error handling across server actions.**
Error handling in server actions is inconsistent. Some actions return typed error objects; others throw unhandled exceptions. There is no centralised error boundary strategy, no standardised error response shape, and no guarantee that an unhandled exception in a server action does not expose internal stack traces to the client. This is both a security issue (information disclosure) and a reliability issue (invisible failures).

**TD-005: Synchronous PDF generation blocking the request thread.**
The PDF generation endpoint at `/api/quotes/[id]/pdf` uses `@react-pdf/renderer` synchronously, blocking the serverless function thread while rendering. This is rate-limited (50 req/min) as a workaround, but the root issue is that it is the wrong architecture. PDF generation should be an async job that produces a URL the client polls or is notified about.

**TD-006: No pagination on any list query.**
All queries in `/src/lib/queries/` return unbounded result sets. A client list, job list, or quote list with 10,000 records would return all 10,000 in a single database round-trip. This is not a problem today with small tenants. It will become a performance cliff at enterprise scale.

**TD-007: No database index strategy beyond primary keys.**
The Supabase RLS filter `organisation_id` is used on every query, but beyond the audit log index (which is present in `audit.sql`), there is no evidence of a systematic indexing strategy. Queries involving `status`, `scheduled_date`, and `created_by` will degrade as row counts grow.

**TD-008: Custom fields cannot be added without schema changes.**
The data model has no extensibility mechanism. Enterprise customers universally require custom fields — a cleaning company might need to track "contract reference number" per client, or "access code expiry date" per property. Currently, this requires a schema change and deployment for every customer request. An EAV (Entity-Attribute-Value) table or JSONB metadata column is needed.

**TD-009: The `next_quote_number()` RPC function is a serialisation bottleneck.**
Quote number generation uses a database RPC that likely uses a sequence or row lock. Under concurrent load (multiple users in a large organisation creating quotes simultaneously), this will create lock contention. The implementation needs reviewing before enterprise load arrives.

**TD-010: Email templates are hardcoded strings.**
The Resend email templates in `/src/lib/email/index.ts` are HTML string literals. There is no templating system, no preview mechanism, no version control for email content changes, and no mechanism for organisations to customise email branding. This is fine for MVP; it is not acceptable when an enterprise customer wants their email domain and branding on transactional emails.

---

## 2. Architecture Strategy — Where We Are Going

### 2.1 The Monolith Is Correct — For Now

There is a strong temptation in enterprise planning discussions to propose a microservices migration as evidence of technical ambition. I am not making that recommendation.

The Lustre monolith is the right architecture for the next 12 months. It is fast to develop in, easy to reason about, and has no network latency between components. Every microservices migration I have witnessed in a company of this size has consumed 6–12 months of engineering time and delivered zero user-visible features.

What I am recommending is a **modular monolith with clean internal boundaries**: a single deployable unit whose internal structure prepares us to extract services when — and only when — there is a concrete operational reason to do so. The two most likely extraction candidates, in order of likelihood, are:

1. **The notification/messaging service** — when we add webhooks, SMS, and push notifications, the volume and reliability requirements of outbound messaging differ from synchronous web requests. This is the first natural extraction point, likely in Month 8–10.

2. **The PDF/document generation service** — already identified as a blocking pattern (TD-005). A dedicated document rendering service with a job queue is the correct fix, and it is naturally separable from the main application.

Neither of these should be extracted speculatively. They should be extracted when we have a concrete problem that the monolith cannot solve — not before.

### 2.2 The API Platform Strategy

The current architecture has no external API. The COO and CCO plans both call for one. My position on how to build it:

**The API must be designed before it is built.**

A public API is a contract. Once enterprise customers integrate against it, every breaking change costs us real money in customer engineering time, support escalations, and contract renegotiation. The cost of designing it right is a few weeks of up-front work. The cost of getting it wrong is years of backwards-compatibility debt.

**Principles for the Lustre API:**

*Design-first, not code-first.* Write the OpenAPI 3.1 specification before any implementation begins. Every endpoint, request shape, response shape, and error code must be agreed and reviewed before a single line of server code is written. This enforces deliberate API design and produces documentation as a by-product.

*Versioned from day one.* The API will be versioned at the URL path level: `/api/v1/clients`, `/api/v2/clients`. URL versioning is explicit, easy to route, and easy to document. Header versioning sounds elegant but creates debugging nightmares. We will never release an unversioned API endpoint.

*Resource-oriented, not action-oriented.* The API models nouns (clients, jobs, quotes) not verbs (sendQuote, completeJob). State changes are expressed as PATCH or PUT on a resource's `status` field. This is RESTful, predictable, and easy to document.

*Idempotency keys on all mutations.* Every POST and PATCH endpoint must accept an `Idempotency-Key` header. Enterprise integrations operate over unreliable networks and will retry requests. Without idempotency, retries create duplicate records. This is a non-negotiable correctness requirement.

*Pagination on every collection endpoint.* Cursor-based pagination (not offset-based). Cursor pagination is stable under concurrent inserts and is the only correct pagination model for a real-time CRM where records can be inserted between pages.

**Implementation path:**

The server actions layer must be refactored to separate the business logic from the transport layer before a public API is built. The current pattern is:

```
[React form] → [Server action] → [Supabase query]
```

This needs to become:

```
[React form] → [Server action]  ─┐
                                  ├→ [Service layer] → [Supabase query]
[API route]   → [API handler]   ─┘
```

The service layer contains the business logic. The server action and the API handler are both thin transport adapters that call the service layer. This refactor is the prerequisite for a public API and it is the correct internal architecture regardless of whether we ever build a public API.

**Timeline:** API design complete by end of Month 3. Service layer refactor complete by Month 5. API v1 (read-only endpoints for core resources) in closed beta by Month 7.

### 2.3 Event-Driven Architecture for Async Work

The current architecture is entirely synchronous. Every user action blocks the HTTP request until the operation completes. For a simple CRM this is acceptable. For an enterprise platform with webhooks, email sequences, document generation, and automation rules, synchronous processing is both a performance problem and an architectural limitation.

The COO plan mentions Inngest as an async queue. I concur with that choice. What I want to add here is the **architectural principle**:

> Any operation that does not need to complete before the user sees a response should be asynchronous.

The initial list of operations that must become async jobs:

| Operation | Current | Target | Trigger |
|-----------|---------|--------|---------|
| PDF generation | Sync HTTP | Async job → webhook/poll | User requests download |
| Quote email delivery | Sync (Resend) | Async job + delivery receipt | Quote sent action |
| Outbound webhooks (new) | N/A | Async job with retry | Any entity state change |
| Bulk CSV import (new) | N/A | Async job with progress | User uploads file |
| GDPR data export (new) | N/A | Async job → email link | User requests export |
| Automation rule execution (new) | N/A | Async job | Triggering event |
| Daily/weekly digest emails | N/A | Scheduled job | Cron |

Inngest as the job queue is the right choice because it integrates natively with Vercel's serverless architecture, provides durable execution (jobs survive function cold starts), has built-in retry logic with exponential backoff, and gives us a visual dashboard of job execution without building one ourselves.

The architectural rule: **Inngest functions are always triggered by events, never called directly.** Calling job functions directly from server actions bypasses the durability guarantee and creates coupling between the transport and processing layers.

### 2.4 Database Architecture at Scale

The current PostgreSQL schema via Supabase is well-structured for an MVP. Enterprise scale introduces specific challenges that must be planned for.

**Pagination (fix TD-006):**
All list queries must implement cursor-based pagination within the next two months. This is not optional — it is correctness. The implementation uses Postgres `WHERE id > :cursor ORDER BY id LIMIT :page_size` with opaque cursor tokens returned in API responses.

**Indexing strategy (fix TD-007):**
The following composite indexes must be created as part of a formal indexing review:

```sql
-- Client list performance (filtered by org + status + created date)
CREATE INDEX idx_clients_org_status ON clients (organisation_id, status, created_at DESC);

-- Job scheduling queries (filtered by org + date range + status)
CREATE INDEX idx_jobs_org_date_status ON jobs (organisation_id, scheduled_date, status);

-- Quote pipeline (filtered by org + status)
CREATE INDEX idx_quotes_org_status ON quotes (organisation_id, status, created_at DESC);

-- Activity timeline (filtered by client + created date)
CREATE INDEX idx_activities_client_date ON activities (client_id, created_at DESC);

-- Follow-up workqueue (filtered by org + status + due date)
CREATE INDEX idx_followups_org_due ON follow_ups (organisation_id, status, due_date);

-- Audit log queries (filtered by org + date range)
-- Already exists per audit.sql — verify it is composite
CREATE INDEX idx_audit_org_created ON audit_logs (organisation_id, created_at DESC);
```

Each index must be benchmarked before and after against representative query patterns. We must never add an index without evidence and never leave queries unindexed that run on the hot path.

**Custom fields architecture (fix TD-008):**
The correct implementation for custom fields at this scale is a JSONB `metadata` column per entity table, combined with a `custom_field_definitions` table that stores the schema:

```sql
-- Schema for custom field definitions (per organisation)
CREATE TABLE custom_field_definitions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organisations(id),
  entity_type text NOT NULL, -- 'client' | 'property' | 'job' | 'quote'
  field_key   text NOT NULL,
  field_label text NOT NULL,
  field_type  text NOT NULL, -- 'text' | 'number' | 'date' | 'boolean' | 'select'
  options     jsonb,         -- for 'select' type
  required    boolean DEFAULT false,
  sort_order  integer DEFAULT 0,
  UNIQUE (org_id, entity_type, field_key)
);
```

The `metadata` JSONB column is indexed with a GIN index for query performance:

```sql
CREATE INDEX idx_clients_metadata ON clients USING GIN (metadata);
```

This approach avoids the maintenance overhead of EAV tables while retaining query performance, and it keeps the schema clean. JSONB fields are validated at the application layer against the `custom_field_definitions` schema before write.

**Full-text search:**
The CPO plan requires global search across all entities. The correct implementation uses Postgres `tsvector` columns with GIN indexes — this is already available in Supabase without any additional service:

```sql
-- Generated tsvector column on clients table
ALTER TABLE clients ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(first_name, '') || ' ' ||
      coalesce(last_name, '') || ' ' ||
      coalesce(email, '') || ' ' ||
      coalesce(phone, '')
    )
  ) STORED;

CREATE INDEX idx_clients_search ON clients USING GIN (search_vector);
```

Similar generated columns on `jobs`, `quotes`, and `properties`. The global search query becomes a `ts_query` across all tables with a UNION, scoped to `organisation_id`. This will handle thousands of records without any external search service.

**Read replica strategy:**
Supabase Pro supports read replicas. For the first 18 months, a single read replica is sufficient. Analytics queries, report generation, and CSV exports should target the read replica to avoid impacting transactional write performance. This is a configuration change, not an architecture change — but it must be planned for in how we structure our query clients.

### 2.5 Schema Migration Strategy (fix TD-001)

This is the most urgent technical risk in the codebase. We will address it completely.

**Tool: Supabase CLI migrations.**
Supabase provides a migration management system via its CLI. Every schema change must go through this system. The migration workflow is:

```
1. Developer creates migration: supabase migration new <description>
2. Migration SQL written in the generated file
3. Migration tested locally: supabase db reset
4. Migration reviewed in pull request (code review required)
5. Migration applied to staging: supabase db push --linked (staging project)
6. Migration verified in staging (automated smoke tests)
7. Migration applied to production: supabase db push --linked (production project)
```

**Bootstrapping the migration history:**
We currently have two SQL files (`rls.sql`, `audit.sql`) that represent the current schema. The bootstrapping task is:

1. Write a single `20260301000000_initial_schema.sql` migration that captures the full current schema
2. Apply this as the first migration in a local Supabase instance
3. Verify it produces an identical schema to production
4. From this point forward, every schema change is a migration file

**Migration governance rules:**
- Migrations are never edited after they are merged
- All migrations must be backwards-compatible for at least one release (blue-green deployment safety)
- Breaking changes (column renames, type changes) require a two-step migration across two releases
- Every migration must be reversible — a corresponding `down` migration is required
- Column or table deletions require a 2-week deprecation notice in a feature flag before execution

### 2.6 Build vs. Buy Framework

The temptation at growth stage is to build everything. The temptation at enterprise stage is to buy everything. Both are wrong. The correct framework is:

**Build when:** The capability is a core differentiator, we have clear domain expertise, or the vendor would own data we cannot afford to expose.

**Buy when:** The capability is infrastructure (not product), the problem is genuinely hard (authentication, payments, search), or the build cost exceeds 3 months of engineering time for an equivalent vendor solution.

The following vendor decisions are confirmed from a technical perspective:

| Capability | Decision | Vendor | Rationale |
|------------|---------|--------|-----------|
| Database | Buy | Supabase | Managed PostgreSQL with RLS is core infrastructure |
| Authentication | Buy | Supabase Auth + WorkOS | Supabase for standard auth; WorkOS for enterprise SSO (SAML/OIDC) |
| Email delivery | Buy | Resend | Transactional email is solved infrastructure |
| Async jobs | Buy | Inngest | Durable function execution on Vercel is not a buildable problem |
| Error tracking | Buy | Sentry | The cost of building error aggregation is not justified |
| Payments | Buy | Stripe | Non-negotiable — payment processing is regulated infrastructure |
| Search | Build | Postgres tsvector | Supabase full-text search covers our scale for 24+ months |
| PDF generation | Partially build | @react-pdf/renderer + async wrapper | The renderer stays, the architecture changes |
| SMS | Buy | Twilio | Carrier relationships are not a buildable moat |
| Automation engine | Build | Custom on Inngest | Our automation rules are domain-specific to field service |
| Feature flags | Buy | PostHog | Consistent with analytics (CPO recommendation) |
| Rate limiting | Buy | Upstash Redis | Already in use and correct |

**WorkOS specifically for enterprise SSO:**
The COO plan mentions SSO support. My technical recommendation is WorkOS over Auth0 or rolling our own Supabase SSO configuration. WorkOS provides a single API for SAML 2.0, OIDC, Google Workspace, and Microsoft Entra ID. The integration is a one-time implementation that handles all enterprise identity providers. The cost is per enterprise seat — it scales with the enterprise accounts that justify the capability. Attempting to implement enterprise SSO without a dedicated provider is 4–6 months of engineering work that will still produce an inferior result.

---

## 3. Security Architecture

### 3.1 The Current Security Model

The foundation is sound. RLS-enforced multi-tenancy means the data layer is secure by construction. Input validation via `_validate.ts` and parameterised queries via the Supabase client prevent SQL injection. Security headers in `next.config.ts` provide browser-level protections.

The gaps are in the **application-level security model**, not the database security model.

### 3.2 Secrets Management

The current secrets model is environment variables stored in Vercel's UI. For an MVP, this is acceptable. For an enterprise platform handling customer business data, it is not.

**Required: Secrets rotation capability.**
Every secret must be rotatable without a deployment. The current architecture does not support this — rotating the Supabase service role key requires a deployment. We need a secrets management solution that supports zero-downtime rotation.

**Recommended approach:** Vercel's environment variable system with Doppler as the secrets management layer. Doppler stores secrets, rotates them on schedule, and syncs them to Vercel. The application code remains unchanged — it still reads environment variables. The operational model gains secrets auditing, rotation, and access control.

**The `SUPABASE_SERVICE_ROLE_KEY` problem (TD-003):**
The service role key must be moved out of the application code path entirely. The specific usage — public quote page token lookup — must be refactored to use RLS-compliant public access:

```sql
-- RLS policy that allows unauthenticated read of a specific quote by share token
CREATE POLICY "Public quotes accessible by share token"
  ON quotes FOR SELECT
  TO anon
  USING (share_token = current_setting('request.jwt.claims')::jsonb->>'share_token');
```

Or alternatively, move the public quote lookup to a Supabase Edge Function that has its own scoped service access, rather than exposing the service role key to the Next.js application layer.

### 3.3 Authentication Architecture Evolution

**Current state:** Supabase Auth email/password with httpOnly session cookies. This is secure and correct for the current user base.

**Phase 1 additions (Months 1–3):**
- Password reset flow (currently unimplemented — a critical gap)
- Email verification enforcement (currently users can sign up with unverified emails)
- Session revocation capability (admin can invalidate all sessions for a user)
- Failed login attempt rate limiting (already in place via Upstash — verify it covers the right endpoints)

**Phase 2 additions (Months 4–6):**
- TOTP-based MFA via Supabase Auth's built-in MFA support
- Recovery codes generated and stored (encrypted) at MFA enrollment
- MFA enforcement at organisation level (admin can mandate MFA for all users)
- Trusted device registry (skip MFA challenge on known devices for 30 days)

**Phase 3 additions (Months 7–9):**
- WorkOS integration for enterprise SSO (SAML 2.0, OIDC)
- Just-in-time (JIT) user provisioning from SAML assertions
- SCIM provisioning for automated user lifecycle management from enterprise IdPs
- IP allowlisting at the middleware level (enterprise accounts only)

### 3.4 Authorisation Architecture — RBAC Redesign

The current two-role model (`admin` | `team_member`) is not sufficient for enterprise. The CCO plan describes the commercial requirements for RBAC; this section describes the technical implementation.

**Recommended model: Resource-scoped RBAC with role inheritance.**

```sql
CREATE TABLE roles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organisations(id),
  name         text NOT NULL,
  permissions  jsonb NOT NULL,  -- structured permission set
  is_system    boolean DEFAULT false,  -- system roles cannot be deleted
  UNIQUE (org_id, name)
);

CREATE TABLE user_roles (
  profile_id   uuid NOT NULL REFERENCES profiles(id),
  role_id      uuid NOT NULL REFERENCES roles(id),
  scope_type   text,   -- NULL = org-wide; 'branch' = branch-scoped
  scope_id     uuid,   -- branch_id or NULL
  PRIMARY KEY (profile_id, role_id)
);
```

**System-defined base roles (seeded at org creation):**

| Role | Permissions |
|------|-------------|
| `Owner` | All permissions including billing and user management |
| `Admin` | All permissions except billing |
| `Manager` | Manage jobs, quotes, clients in their scope; view reporting |
| `Operative` | View and update assigned jobs only; create activities |
| `Viewer` | Read-only access to all resources |

Custom roles are composable from a defined permission set. The permission set is a flat enum stored in the `permissions` JSONB array:

```json
["clients:read", "clients:write", "clients:delete",
 "jobs:read", "jobs:write", "jobs:assign",
 "quotes:read", "quotes:write", "quotes:send",
 "reporting:view", "reporting:export",
 "settings:billing", "settings:users", "settings:org"]
```

RLS policies are rewritten to check the user's effective permission set rather than a hardcoded role string. This makes the authorisation model fully composable without RLS policy changes.

### 3.5 Data Encryption Strategy

**At rest:** Supabase handles encryption at rest (AES-256). No changes required.

**In transit:** TLS 1.3 enforced by Vercel and Supabase. No changes required.

**Application-level encryption for sensitive fields:**
Some fields in the current schema store data that should be encrypted at the application layer, not just at rest:

- `properties.alarm_instructions` — alarm codes are sensitive
- `properties.access_instructions` — may contain key safe codes
- `clients.notes` — may contain PII or sensitive client information

These fields should be encrypted using a per-organisation encryption key before storage and decrypted only on read. The implementation uses AES-256-GCM with a key derived from a master key + organisation_id. This provides defence in depth: even a database backup does not expose these fields without the master key.

**Implementation:** A thin encryption utility (`/src/lib/encryption.ts`) wraps write operations on designated fields. Key management uses Vercel environment variables initially, upgrading to Doppler-managed keys in Phase 2.

### 3.6 GDPR Technical Implementation

The CCO plan describes GDPR as a commercial requirement. This section describes the technical architecture.

**Right to erasure (Article 17):**
Cannot be implemented by deleting rows — the immutable audit log and activity timeline create referential integrity constraints. The correct implementation is pseudonymisation:

```sql
-- When a DSAR deletion request is processed
UPDATE clients SET
  first_name = '[Deleted]',
  last_name = '[Deleted]',
  email = NULL,
  phone = NULL,
  secondary_phone = NULL,
  notes = NULL
WHERE id = :client_id AND organisation_id = :org_id;
```

A `gdsar_requests` table tracks the request, the requestor identity, the timestamp, and the outcome. The audit log entry for the deletion is retained (the act of deletion is itself auditable), but the personal data is removed from the client record.

**Right to data portability (Article 20):**
Implemented as an async job that generates a structured ZIP archive containing:
- All client records as CSV
- All job records as CSV
- All quote records as CSV (with line items)
- All activity records as CSV
- All follow-up records as CSV
- Organisation settings as JSON

The archive is generated to Supabase Storage, a time-limited signed URL is generated (24-hour expiry), and the URL is emailed to the admin's registered address. The archive is deleted from storage after 48 hours.

**Data residency:**
Currently defaulting to Supabase's regional deployment (likely `eu-west-1` or similar). For enterprise customers in regulated industries, we must confirm and document the data residency. This should be captured in the standard enterprise contract as a data processing addendum (DPA).

---

## 4. Engineering Team and Operating Model

### 4.1 Engineering Team Structure for Enterprise Delivery

The current team is building a product in MVP mode. Enterprise delivery requires a different operating model — not necessarily more people, but different roles and clearer ownership.

**Phase 1 team structure (Months 1–4):**

| Role | Responsibility | Headcount |
|------|---------------|-----------|
| Staff Engineer / Tech Lead | Architecture decisions, code review standards, technical debt roadmap | 1 |
| Full-stack Engineers | Feature delivery across the stack | 2–3 |
| QA Engineer | Test strategy, E2E test authoring, release validation | 1 |
| DevOps / Platform Engineer | CI/CD, infrastructure, monitoring, migrations | 0.5 (shared or contract) |

**Phase 2 team structure (Months 5–9):**

As the COO plan introduces customer support infrastructure and the CCO plan drives commercial feature complexity, the engineering team scales:

| Addition | Trigger |
|---------|---------|
| +1 Full-stack Engineer | First enterprise customer signed |
| +1 Security Engineer (contract) | SOC 2 Type I audit commenced |
| +1 Full-stack Engineer | Multi-branch feature development begins |

**Engineering squads (by Month 9):**
- **Platform squad:** Infrastructure, API, authentication, RBAC, developer tooling
- **CRM squad:** Client management, activity timeline, custom fields, search
- **Operations squad:** Jobs, scheduling, mobile operative experience
- **Commercial squad:** Quotes, billing integration, reporting, analytics

Squad model avoids hand-offs on feature delivery and creates clear ownership. Each squad owns the full stack for their domain.

### 4.2 Engineering Standards

The following standards apply to all code merged to the main branch. They are non-negotiable — not guidelines, not aspirations.

**Code review:**
- Every merge requires at least one engineer review (two for security-sensitive changes)
- The author is responsible for the review checklist: type coverage, error handling, test coverage, accessibility
- Reviewers are responsible for architectural alignment, not just line-level correctness
- No merge without CI passing (the COO plan covers CI/CD setup)

**Type safety:**
- No `any` types without an explicit justification comment
- Database queries must use generated types from the Supabase type generator, not hand-written interfaces
- All server actions must have fully typed input and output shapes
- `strict: true` in `tsconfig.json` (already set — must remain set)

**Testing requirements (aligned with COO plan):**
- Unit tests required for all business logic functions (service layer, validation, calculations)
- Integration tests required for all server actions (against a local Supabase instance)
- E2E tests required for all user-facing workflows (Playwright, covering the happy path and the two most common error paths)
- No merge that reduces overall test coverage

**Performance standards:**
- Every database query must complete in under 100ms for the P95 case at expected load
- Server action response time must be under 500ms for the P95 case
- Lighthouse performance score must not decrease on any PR (measured in CI)
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1

**Dependency hygiene:**
- All dependencies reviewed before introduction (licence compatibility, maintenance status, security history)
- Dependabot or Renovate enabled for automated dependency update PRs
- No dependency added for a use case that can be handled by a standard library or Supabase SDK
- Monthly dependency audit to identify deprecated or abandoned packages

### 4.3 Developer Experience

The developer experience is a direct input to feature delivery speed. A developer who can reliably reproduce production locally, run the full test suite in under 5 minutes, and get instant feedback on type errors ships features faster and with fewer regressions.

**Local development parity with production:**
- Supabase CLI for local Supabase instance (database, auth, storage, edge functions)
- `supabase start` brings up a complete local environment matching production schema via migration files
- Environment variables managed via `.env.local` template with all required keys documented
- `npm run dev:local` — a single command that starts everything

**Current gap:** There is no documented local development setup beyond the boilerplate Next.js README. A new engineer joining the team today would have to reverse-engineer the environment from scratch. This must be fixed in Month 1.

**Developer tooling additions:**
- Supabase type generation in CI (`supabase gen types typescript`) — ensures database types in `types/index.ts` stay in sync with the actual schema
- Pre-commit hooks (Husky): ESLint, TypeScript check, and test suite on staged files
- Commit message linting (conventional commits format) for clean changelog generation
- Database seed script for realistic test data in local environments

### 4.4 Incident Management

The COO plan covers monitoring and alerting. The CTO perspective is on the engineering discipline of incident response:

**Severity levels:**

| Level | Definition | Response Time | Examples |
|-------|-----------|--------------|---------|
| P0 | Production down, all users affected | Immediate | Database unreachable, auth service failure |
| P1 | Core feature broken for all users | < 1 hour | Quote sending fails, job creation broken |
| P2 | Feature broken for subset of users | < 4 hours | Specific export fails, search not working |
| P3 | Degraded performance or UX issue | < 24 hours | Slow load times, display bug |

**Post-incident requirements:**
Every P0 and P1 incident requires a written post-mortem within 48 hours. The post-mortem format:
1. Timeline of events (UTC timestamps)
2. Root cause analysis (five whys)
3. Impact quantification (users affected, data at risk, revenue impact)
4. Corrective actions (what changes prevent recurrence) with owners and deadlines

Post-mortems are blameless — they identify system failures, not individual failures. They are stored in `/docs/incidents/` and reviewed at the monthly engineering meeting.

---

## 5. Technical Roadmap — Phase by Phase

### Phase 1: Technical Foundation (Months 1–3)
*"Fix the floor before building the walls"*

These are not features. They are technical prerequisites. No enterprise sales motion can proceed until this phase is complete.

**Month 1 — Critical risks eliminated:**
- [ ] **TD-001 resolved:** Supabase CLI migrations bootstrapped, full migration history established, staging environment created
- [ ] **TD-003 resolved:** Service role key usage removed from application code path, public quote lookup refactored
- [ ] **TD-004 resolved:** Centralised error handling library implemented, consistent error response shapes across all server actions
- [ ] **TD-006 resolved:** Cursor-based pagination implemented on all list queries
- [ ] Local development documentation written — new engineer can be productive in under 30 minutes
- [ ] Supabase type generation automated in CI pipeline
- [ ] Pre-commit hooks installed (ESLint, TypeScript, unit tests)

**Month 2 — Architecture improvements:**
- [ ] Service layer extracted from server actions (transport/logic separation)
- [ ] Database index strategy implemented and benchmarked (TD-007)
- [ ] TD-005 resolved: PDF generation moved to async Inngest job
- [ ] Password reset flow implemented (critical UX gap, also security baseline)
- [ ] Email verification enforcement activated
- [ ] Dependabot enabled for automated dependency updates

**Month 3 — Platform foundations:**
- [ ] Custom fields JSONB schema implemented (TD-008) — enables first enterprise customer customisations
- [ ] Full-text search via Postgres tsvector (enables global search for CPO)
- [ ] Secrets management via Doppler integrated
- [ ] Encryption at application level for sensitive property fields (TD-010 partial)
- [ ] TD-009 reviewed: quote number generation benchmarked and fixed if needed
- [ ] OpenAPI specification design commenced for API v1
- [ ] GDPR pseudonymisation function implemented

**Engineering KPIs at end of Phase 1:**
- Zero known P0/P1 technical risks outstanding
- All list queries paginated
- Local dev environment documented and reproducible
- Migration history clean from this point forward
- Test coverage > 40% on service layer functions

---

### Phase 2: Platform Build (Months 4–8)
*"Build the infrastructure that scales with growth"*

**Months 4–5 — Security and access:**
- [ ] RBAC schema implemented (roles, permissions, user_roles tables + RLS rewrite)
- [ ] MFA implementation via Supabase Auth (TOTP + recovery codes)
- [ ] Session revocation capability (admin can kill sessions)
- [ ] Rate limiting expanded to cover all mutation endpoints (not just auth and PDF)
- [ ] Security audit commissioned (third-party penetration test)
- [ ] WorkOS integration scoped and begun

**Months 5–6 — API platform:**
- [ ] OpenAPI 3.1 specification for API v1 complete and reviewed
- [ ] Service layer refactor complete
- [ ] API v1 implementation: read endpoints for clients, jobs, quotes, properties
- [ ] API authentication via Bearer tokens (organisation-scoped API keys)
- [ ] API rate limiting (per-organisation, configurable by plan tier)
- [ ] API documentation site (Redoc or Scalar, generated from OpenAPI spec)
- [ ] API key management UI in organisation settings

**Months 6–7 — Async architecture:**
- [ ] Inngest installed and configured
- [ ] PDF generation migrated to async job
- [ ] Quote email delivery migrated to async job
- [ ] Outbound webhook infrastructure built (subscribe to entity events, deliver to customer endpoints)
- [ ] Webhook signature verification (HMAC-SHA256) and delivery retry logic

**Months 7–8 — Enterprise SSO and data:**
- [ ] WorkOS integration complete (SAML 2.0, Google Workspace, Microsoft Entra ID)
- [ ] JIT user provisioning from SSO
- [ ] SCIM provisioning scoped (full implementation in Phase 3)
- [ ] GDPR data export async job implemented
- [ ] Data processing addendum (DPA) template approved and linked from privacy page
- [ ] Read replica routing for analytics queries

**Engineering KPIs at end of Phase 2:**
- API v1 in closed beta with 3 enterprise customers
- MFA available to all users, mandatory for enterprise plan
- Zero server actions directly accessible to external clients
- Webhook delivery reliability > 99.5%
- P95 database query latency < 100ms on all hot paths

---

### Phase 3: Enterprise Grade (Months 9–12)
*"The platform a regulated enterprise can trust"*

**Months 9–10 — Compliance and trust:**
- [ ] SOC 2 Type I audit commenced (requires all Phase 1 and 2 controls evidenced)
- [ ] SCIM provisioning complete
- [ ] IP allowlisting at middleware level
- [ ] Application-level field encryption complete and audited
- [ ] Audit log export endpoint in API (signed, tamper-evident archive)
- [ ] Penetration test remediation complete

**Months 10–11 — Scale and resilience:**
- [ ] Multi-region deployment assessment (Supabase read replicas in additional regions)
- [ ] Load testing against enterprise-scale data volumes (50,000 clients per org)
- [ ] Database query performance certification at scale
- [ ] Chaos engineering exercises (what happens when Supabase is slow? When Resend is down? When Inngest is unreachable?)
- [ ] Runbook documentation complete for all P0 scenarios

**Months 11–12 — API and ecosystem:**
- [ ] API v1 GA (write endpoints: create/update for clients, jobs, quotes)
- [ ] Webhook events expanded to cover all entity lifecycle events
- [ ] API v2 scoping commenced (learnings from v1 enterprise feedback)
- [ ] Developer portal live (API docs, getting started guides, sandbox environment)
- [ ] SCIM directory sync production-ready

**Engineering KPIs at end of Phase 3:**
- SOC 2 Type I report issued
- API v1 GA with > 5 external integrations in production
- 99.9% uptime SLA achievable (demonstrated over 90-day period)
- All P0/P1 incidents resolved within SLA for 3 consecutive months
- Engineering team fully onboarded to squad model

---

## 6. AI and Emerging Technology Strategy

This section deliberately does not promise AI features in the near term. The engineering credibility risk of AI features that do not work reliably is greater than the marketing benefit of AI features that are present.

### 6.1 Where AI Can Add Genuine Value

There are three areas where AI can improve the Lustre product in ways that are technically reliable today:

**1. Quote generation assistance.**
Given a client, a property, and a service type, suggest line items and pricing based on the organisation's quote history. This is a retrieval-augmented generation (RAG) problem over the organisation's own data — it is bounded, measurable, and improvable. The model can be wrong and the user corrects it — no significant failure mode.

**2. Activity summarisation.**
For a client with 50+ activity log entries, generate a plain-English summary of the client relationship: "Regular client since March 2024. Had a complaint about scheduling in August 2024 (resolved). Last job was a deep clean in January 2026. Two open follow-ups." This is genuinely useful for operatives picking up an unfamiliar client.

**3. Follow-up drafting.**
When a job is completed, suggest a draft follow-up message to the client (email or note). Pre-populated with job details, personalised to the client. The user edits and sends. This reduces the cognitive load on busy operators and increases follow-up rates — directly improving the commercial outcome the product is designed to support.

### 6.2 Where AI Should Not Be Applied (Yet)

**Autonomous scheduling optimisation.** The coordination problem of scheduling multiple operatives across multiple client locations is a genuine AI use case — but it requires GPS data, operative availability data, travel time estimates, and job duration prediction. We have none of this infrastructure today. Building it without the data layer is building on sand.

**Predictive churn scoring.** Valuable, but requires 12+ months of multi-tenant usage data to train on. We do not have the data yet. Add it to the 18-month roadmap.

**AI-generated quotes without human review.** The risk profile of sending an AI-generated quote for the wrong amount to a real client is too high. Assistance is acceptable; autonomy is not.

### 6.3 Technical Architecture for AI Features

When we build AI features, the architecture is:

- **No direct LLM calls from server actions.** AI calls go through the Inngest async layer. LLM responses can take 10–30 seconds; blocking an HTTP request for that duration is unacceptable.
- **Anthropic Claude as the primary LLM.** Claude's strong instruction following and UK English fluency makes it the right model for a UK business product.
- **All prompts version-controlled.** Prompts are code. They live in `/src/lib/ai/prompts/` as TypeScript string constants with semantic versioning. Changes to prompts require pull requests and review.
- **Outputs are always suggestions, never autonomous actions.** Every AI-generated output is presented to the user for review before any state change occurs.
- **AI feature usage tracked separately in PostHog.** Adoption, correction rate (how often users change the AI suggestion), and user satisfaction score are the KPIs for any AI feature.

---

## 7. Technical Risk Register

| ID | Risk | Likelihood | Impact | Status | Mitigation |
|----|------|-----------|--------|--------|-----------|
| TR-001 | Schema change without migration causes data corruption | High | Critical | **Active** | TD-001 resolution is Month 1 priority |
| TR-002 | Service role key misuse causes cross-tenant data leak | Medium | Critical | **Active** | TD-003 resolution is Month 1 priority |
| TR-003 | Unbounded queries cause production performance collapse at enterprise scale | High | High | **Active** | TD-006 pagination is Month 1 priority |
| TR-004 | No disaster recovery plan; Supabase outage causes extended downtime | Medium | High | Planned | RDS backup policy audit + recovery runbook in Phase 2 |
| TR-005 | API design decisions lock us into poor patterns once enterprise customers integrate | High | High | Planned | Design-first API approach; OpenAPI spec before implementation |
| TR-006 | Dependency vulnerability introduced via unreviewed package | Medium | High | Planned | Dependabot in Month 2; monthly audit |
| TR-007 | Engineer with production database access leaves without credential rotation | Low | Critical | Planned | Doppler-managed secrets with instant rotation capability |
| TR-008 | Custom field JSONB grows unbounded without schema validation | Medium | Medium | Planned | Validation against `custom_field_definitions` before write |
| TR-009 | Email deliverability drops as Resend domain reputation is established | Low | High | Monitor | DKIM/DMARC/SPF verification and monitoring |
| TR-010 | SOC 2 audit reveals control gaps requiring emergency remediation | Medium | High | Planned | Pre-audit internal assessment in Month 8 |

---

## 8. Summary and Recommendations

### The Three Things That Must Happen in Month 1

If only three technical changes are made in the first month, they must be these:

**1. Establish database migration discipline (TD-001).**
Every subsequent phase of this roadmap involves schema changes. Without a migration system, every schema change is an uncontrolled risk event. This must be in place before any new features are built.

**2. Remove the service role key from the application request path (TD-003).**
The service role key bypasses all security controls. Its presence in the application layer is the single largest security risk in the current codebase. Removing it takes a day of engineering work and eliminates a critical vulnerability.

**3. Implement pagination on all list queries (TD-006).**
Without pagination, a large enterprise tenant will trigger a performance incident on their first day of heavy use. This is a correctness issue, not an optimisation issue.

### The Non-Technical Recommendation

The technical roadmap in this document is achievable. The risk is not that the engineering team cannot execute it — the risk is that commercial pressure to ship new features will crowd out the foundational work in Phase 1.

My strong recommendation is that Phase 1 technical foundations are treated as non-negotiable prerequisites for enterprise sales, not as optional engineering housekeeping. The COO, CCO, and I should align on this principle explicitly: **we will not pursue an enterprise contract until the Phase 1 technical checklist is complete.** Signing an enterprise customer before resolving these technical risks is not a shortcut — it is a commitment to fix them under contractual pressure, at 3x the cost.

The foundation we build in the next 90 days will determine the ceiling of what this platform can become.

---

## Appendix A — Technology Stack (Current and Target)

| Layer | Current | Target (Month 12) |
|-------|---------|------------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4 | Same (stable) |
| Backend | Next.js Server Actions | Server Actions + API Routes (OpenAPI v1) |
| Service layer | None (mixed in actions) | Dedicated service layer |
| Database | Supabase PostgreSQL | Same + read replica + migration-managed |
| Auth (standard) | Supabase Auth | Supabase Auth + MFA |
| Auth (enterprise) | None | WorkOS (SSO/SAML/OIDC + SCIM) |
| Async jobs | None | Inngest |
| Secrets | Vercel env vars | Doppler + Vercel |
| Error tracking | None | Sentry |
| Migrations | Manual SQL | Supabase CLI migrations |
| Testing | None | Vitest (unit) + Playwright (E2E) |
| CI/CD | None | GitHub Actions |
| Search | None | Postgres tsvector |
| Email | Resend | Resend + template versioning |
| Rate limiting | Upstash Redis (auth + PDF only) | Upstash Redis (all mutations) |
| Feature flags | None | PostHog |
| AI | None | Anthropic Claude (Phase 2+) |

---

## Appendix B — Handoff Points to Other Executive Plans

| Area | CTO Scope (This Document) | Handoff To |
|------|--------------------------|-----------|
| CI/CD pipeline | Technical standards, testing requirements | COO (OPS-ENT-001) for tooling selection and operational setup |
| Monitoring and alerting | SLA targets, incident severity definition | COO (OPS-ENT-001) for tooling and operational on-call |
| SSO | WorkOS architecture recommendation | COO (OPS-ENT-001) for enterprise IT procurement |
| Billing integration | Stripe integration is correct; async webhook architecture | COO (OPS-ENT-001) for Stripe product setup |
| CRM features | Data model extensibility (custom fields, RBAC) | CCO (CRM-ENT-001) for feature specifications |
| Analytics | Postgres data access layer for reporting | CPO (CPO-ENT-001) for PostHog and dashboard design |
| Mobile (PWA) | Service worker caching, push notification infrastructure | CPO (CPO-ENT-001) for UX and PWA strategy |
| Pricing tiers | Feature flag infrastructure for plan gating | CFO (CFO-ENT-001) for tier definitions |
| GDPR | Technical implementation (pseudonymisation, export) | COO (OPS-ENT-001) for process and policy |

---

*This document should be reviewed alongside CRM-ENT-001 (CCO), OPS-ENT-001 (COO), CFO-ENT-001 (CFO), and CPO-ENT-001 (CPO). All five proposals together constitute the complete enterprise readiness strategy.*

*Next review: April 2026*
*Owner: Chief Technology Officer*
