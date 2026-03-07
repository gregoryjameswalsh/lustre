# CRM Phase 1 — Implementation Plan
**Ref:** CRM-ENT-001 / Phase 1
**Author:** Solutions Architect
**Date:** March 2026
**Branch:** `claude/plan-crm-phase-1-NLlhK`

---

## Overview

This document is the engineering implementation plan for the **12 Must Have features** defined in Section 5.1 of the CRM Enterprise Readiness Proposal. It translates each business requirement into concrete database migrations, server-side changes, and UI work, sequenced to minimise risk and unblock enterprise deals as quickly as possible.

**Tech stack in scope:**
- Next.js 16 App Router, React 19, TypeScript
- Supabase (PostgreSQL + RLS + Auth)
- Existing patterns: server actions in `src/lib/actions/`, query helpers in `src/lib/queries/`, pages under `src/app/dashboard/`

**Delivery horizon:** 4 months (Phase 1a: M01–M06 in months 1–2; Phase 1b: M07–M12 in months 3–4)

---

## Sequencing Rationale

The 12 Must Haves have interdependencies. The order below accounts for them:

```
M06 (RBAC)  ──► affects everything else — do first
M02 (Custom Fields) ──► needed by M03, M04
M03 (Tags)  ──► needed by M04
M04 (Advanced Filters / Saved Views)
M01 (Sales Pipeline) ──► can run in parallel with M02–M04
M05 (CSV Import) ──► depends on M02 (maps custom fields)
M11 (Enhanced Audit Log) ──► extends existing audit_logs table
M07 (SSO) ──► auth-layer, standalone after M06
M08 (MFA Enforcement) ──► auth-layer, follows M07
M09 (GDPR Tooling) ──► needs M06 (admin-only access)
M10 (Analytics Dashboard) ──► reads existing tables; can be done any time
M12 (Automation Rules Engine) ──► most complex; last in Phase 1
```

---

## M06 — Role-Based Access Control (RBAC)

**Priority: Do first.** Every subsequent feature needs permission guards.

### Database

**Migration:** `20260310000000_rbac.sql`

```sql
-- Custom roles table
CREATE TABLE roles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  is_system       boolean NOT NULL DEFAULT false,  -- system roles cannot be deleted
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

-- Permission definitions (application-enforced enum stored as text)
-- Categories: clients, jobs, quotes, pipeline, reports, settings, team, billing
CREATE TABLE role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission  text NOT NULL,  -- e.g. 'clients:read', 'clients:write', 'clients:delete'
  UNIQUE (role_id, permission)
);

-- Link profiles to custom roles (replaces the binary admin/team_member)
-- Keep the legacy `role` column on profiles for backwards compat during migration
ALTER TABLE profiles ADD COLUMN custom_role_id uuid REFERENCES roles(id) ON DELETE SET NULL;

-- Seed default roles for existing orgs (migration script)
-- 'Admin' maps to all permissions; 'Team Member' maps to read + write on clients/jobs/quotes
```

**Seeding:** On org creation, auto-create two system roles: `Admin` and `Team Member`, mirroring the current binary model. Existing `admin` profiles get the `Admin` role; `team_member` profiles get `Team Member`.

**RLS:** Keep existing RLS (org-scoped). RBAC is enforced at the application layer (server actions + API routes), not at the RLS level. This is consistent with the current architecture.

### Application Layer

- **`src/lib/permissions.ts`** — Define the full permissions enum and a `hasPermission(profile, permission)` helper. Load the user's role + permissions once per request and attach to a server-side context object.
- **`src/lib/actions/_auth.ts`** — Add `requirePermission(permission)` guard used at the top of every server action. Replace the current `admin`-only guards.
- **`src/lib/queries/rbac.ts`** — `getRoles()`, `getRole(id)`, `createRole()`, `updateRole()`, `deleteRole()`, `assignRole()`.
- **`src/lib/actions/rbac.ts`** — Server actions wrapping the queries with permission checks.

### UI

- **`src/app/dashboard/settings/roles/`** — Role builder page: list roles, create/edit role with a permission matrix (grouped by resource). Restricted to `settings:manage_roles` permission.
- **`src/app/dashboard/settings/team/`** — Extend existing team page to show the assigned role per member and allow role assignment.

### Migration Safety

- The existing `role` column (`admin | team_member`) is preserved and remains the source of truth for `get_user_org_id()` and existing RLS policies until all code is migrated.
- New code reads from `custom_role_id`; legacy code reads from `role`. Both are kept in sync during the transition window.

---

## M01 — Sales Pipeline (Kanban + List)

### Database

**Migration:** `20260310000001_pipeline.sql`

```sql
CREATE TABLE pipeline_stages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  position        int  NOT NULL,  -- display order
  colour          text,           -- hex colour for the kanban column
  is_won          boolean NOT NULL DEFAULT false,
  is_lost         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE deals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage_id        uuid NOT NULL REFERENCES pipeline_stages(id),
  title           text NOT NULL,
  value           numeric(12,2),
  currency        text NOT NULL DEFAULT 'GBP',
  expected_close  date,
  assigned_to     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  notes           text,
  won_at          timestamptz,
  lost_at         timestamptz,
  lost_reason     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- Default stages seeded per org on creation
-- e.g. Lead → Qualified → Proposal Sent → Negotiation → Won / Lost

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_own_org" ON pipeline_stages FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

CREATE POLICY "deals_own_org" ON deals FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
```

### Application Layer

- **`src/lib/queries/pipeline.ts`** — `getStages()`, `getDeals(filters)`, `getDealsByStage()`, `getDeal(id)`.
- **`src/lib/actions/pipeline.ts`** — `createDeal`, `updateDeal`, `moveDeal` (stage change + audit), `deleteDeal`, `createStage`, `reorderStages`.
- Audit log entries for all deal mutations.

### UI

- **`src/app/dashboard/pipeline/`** — New top-level section.
  - `page.tsx` — Kanban board: columns per stage, deal cards with client name / value / assignee / expected close. Drag-and-drop via `@dnd-kit/core` (already likely in the stack given the existing UI).
  - `list/page.tsx` — List view with sortable columns, same filter/search bar.
  - `[dealId]/page.tsx` — Deal detail: stage selector, linked client, value, notes, activity timeline.
- Add "Pipeline" to the dashboard sidebar nav.
- Add "Create Deal" CTA on client detail page.

### Plan Gating

Pipeline visible to `professional`, `business`, `enterprise` plans. Show upgrade prompt on `free` and `starter`.

---

## M02 — Custom Fields

### Database

**Migration:** `20260310000002_custom_fields.sql`

```sql
CREATE TABLE custom_fields (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,  -- 'client' | 'deal' | 'job' | 'property'
  name            text NOT NULL,
  field_key       text NOT NULL,  -- slugified, used in queries
  field_type      text NOT NULL,  -- 'text' | 'number' | 'date' | 'dropdown' | 'boolean'
  options         jsonb,          -- for dropdown: array of {label, value}
  is_required     boolean NOT NULL DEFAULT false,
  position        int  NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, entity_type, field_key)
);

CREATE TABLE custom_field_values (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  custom_field_id  uuid NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
  entity_id        uuid NOT NULL,   -- FK to the relevant entity row
  value_text       text,
  value_number     numeric,
  value_date       date,
  value_boolean    boolean,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (custom_field_id, entity_id)
);

-- Indexes for filtering
CREATE INDEX custom_field_values_field_entity ON custom_field_values (custom_field_id, entity_id);
CREATE INDEX custom_field_values_org ON custom_field_values (organisation_id);

ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_fields_own_org" ON custom_fields FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

CREATE POLICY "custom_field_values_own_org" ON custom_field_values FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
```

**Architecture note:** Using EAV (as recommended in the proposal) rather than JSONB. This enables RLS-safe field-level filtering and indexing at scale.

### Application Layer

- **`src/lib/queries/customFields.ts`** — `getCustomFields(entityType)`, `getCustomFieldValues(entityId)`, `upsertCustomFieldValue()`.
- **`src/lib/actions/customFields.ts`** — `createCustomField`, `updateCustomField`, `deleteCustomField`, `saveCustomFieldValues`.

### UI

- **`src/app/dashboard/settings/custom-fields/`** — Field definition manager: list by entity type, drag to reorder, inline type picker, dropdown option editor.
- Inject a `<CustomFieldsSection>` component into: client detail page, deal detail page, job detail page. This component fetches definitions + values for the entity and renders appropriate inputs.

---

## M03 — Tags & Segmentation

### Database

**Migration:** `20260310000003_tags.sql`

```sql
CREATE TABLE tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  colour          text,  -- hex
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

-- Polymorphic junction — entity_type disambiguates the entity_id FK
CREATE TABLE entity_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_id   uuid NOT NULL,
  entity_type text NOT NULL,  -- 'client' | 'deal' | 'job'
  UNIQUE (tag_id, entity_id, entity_type)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_own_org" ON tags FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- entity_tags joins via tag to get org context
CREATE POLICY "entity_tags_own_org" ON entity_tags FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tags WHERE tags.id = entity_tags.tag_id
      AND tags.organisation_id = get_user_org_id()
  ));
```

### Application Layer

- **`src/lib/queries/tags.ts`** — `getTags()`, `getEntityTags(entityId, entityType)`.
- **`src/lib/actions/tags.ts`** — `createTag`, `updateTag`, `deleteTag`, `addTagToEntity`, `removeTagFromEntity`.

### UI

- **Tag manager** in settings — colour-coded tag list, create/edit/delete.
- **Tag picker component** (`<TagPicker>`) — combobox for adding/removing tags; embedded in client detail, deal detail, job detail pages.
- **Tag filter chips** on client list, pipeline list (feeds into M04).

---

## M04 — Advanced Filtering & Saved Views

### Database

**Migration:** `20260310000004_saved_views.sql`

```sql
CREATE TABLE saved_views (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  created_by      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type     text NOT NULL,   -- 'client' | 'deal' | 'job'
  name            text NOT NULL,
  filters         jsonb NOT NULL,  -- serialised filter state
  is_shared       boolean NOT NULL DEFAULT false,  -- visible to all org members
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "saved_views_own_org" ON saved_views FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
```

### Filter Engine

- **`src/lib/filters.ts`** — A typed `FilterConfig` schema (field, operator, value) that serialises to JSON (stored in `saved_views.filters`) and deserialises into Supabase query builder calls.
- Supported operators: `equals`, `not_equals`, `contains`, `starts_with`, `is_empty`, `is_not_empty`, `gt`, `lt`, `gte`, `lte`, `in`, `not_in`, `before`, `after`.
- Custom field values are joined via `custom_field_values` when filtered.

### UI

- **`<FilterBar>`** — Composable filter row component. Each filter is: field picker → operator picker → value input. Add/remove filters. "Save View" button.
- **`<SavedViewSidebar>`** — Collapsible sidebar panel listing saved views per entity. Click to apply. Shared views shown with an icon.
- Integrate into: `/dashboard/clients`, `/dashboard/pipeline`, `/dashboard/jobs`.

---

## M05 — CSV Bulk Import

### Application Layer

- **`src/app/api/import/route.ts`** — POST endpoint accepting multipart CSV upload. Streams the file, parses with `papaparse`, validates rows, and upserts via Supabase. Returns a summary: rows processed, rows imported, rows skipped (with reasons).
- **`src/lib/import/`** — Importer modules per entity:
  - `clients.ts` — Field mapping: `first_name`, `last_name`, `email`, `phone`, `status`, `source`, custom fields.
  - `deals.ts` — Field mapping: `title`, `value`, `stage`, `client_email` (auto-resolves to `client_id`).
- Deduplication check: if `email` already exists for `organisation_id`, skip or update (user choice in the UI).
- Import is run in chunks of 100 rows to avoid Supabase timeout limits.

### UI

- **`src/app/dashboard/import/`** — Multi-step wizard:
  1. **Upload** — Drag-and-drop CSV or click to browse.
  2. **Map Fields** — Table: detected CSV headers on the left, dropdown of target fields on the right. Auto-map when header names match. Show custom fields as options.
  3. **Preview** — First 5 rows rendered as a table with mapped values highlighted. Show validation errors inline.
  4. **Import** — Progress bar. Summary card on completion with download of error rows as CSV.
- Link from `/dashboard/clients` header ("Import").

---

## M11 — Enhanced Audit Log

This is low-risk and builds on the existing `audit_logs` table and `src/lib/audit.ts` helper.

### Database

**Migration:** `20260310000005_audit_log_enhancements.sql`

```sql
-- Add login_event type and sensitive_read type to the action vocabulary
-- (no schema change required — action is a free text field)
-- Add user_agent and ip_address for login events
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS ip_address  text,
  ADD COLUMN IF NOT EXISTS user_agent  text,
  ADD COLUMN IF NOT EXISTS session_id  text;
```

### Application Layer

- **Login events:** Hook into `signIn` server action (`src/lib/actions/auth.ts`) — after successful auth, write an audit row with `action: 'auth.login'`, `ip_address`, `user_agent`.
- **Logout events:** Hook into `signOut` — write `action: 'auth.logout'`.
- **Sensitive reads:** Add audit writes to `getClient(id)`, `getDeal(id)` and GDPR-related queries using the existing `createAuditLog()` helper. Use a lightweight approach — log on individual record fetch, not list queries.
- **Failed login attempts:** Write `action: 'auth.login_failed'` on failed `signInWithPassword`.

### UI

- **`src/app/dashboard/settings/audit-log/`** — Paginated, filterable audit log viewer (already partially exists; extend with new event types and the new columns). Filter by: actor, action type, resource type, date range. Export to CSV.

---

## M07 — SSO (SAML 2.0 / OIDC via WorkOS)

**Decision required first:** CTO to confirm WorkOS vs. Auth0. This plan assumes WorkOS as it integrates cleanly with Supabase via custom auth adapters.

### Integration Approach

WorkOS sits in front of Supabase Auth. The flow:

```
User → WorkOS (SSO) → WorkOS issues JWT → Next.js middleware validates JWT
→ Exchange for Supabase session via custom token endpoint
→ Supabase session continues as normal
```

### Implementation

- **`src/lib/workos.ts`** — WorkOS SDK client initialisation (`@workos-inc/node`).
- **`src/app/auth/sso/`** — SSO-specific auth routes:
  - `initiate/route.ts` — Redirects to WorkOS auth URL for the org's SSO connection.
  - `callback/route.ts` — Handles WorkOS callback, validates state, exchanges code for profile, creates/updates Supabase user, issues session.
- **`src/app/login/page.tsx`** — Add "Sign in with SSO" button. On click, prompt for email domain, resolve to WorkOS connection, redirect.
- **`src/app/dashboard/settings/security/sso/`** — SSO connection manager: input IdP metadata URL (SAML) or OIDC discovery URL, test connection, enable/disable.
- **Organisation-level flag:** `organisations.sso_enabled: boolean`, `organisations.workos_org_id: text`. Add in migration.

### Plan Gating

SSO restricted to `enterprise` plan only.

---

## M08 — MFA Enforcement at Org Level

Supabase Auth supports TOTP MFA natively. This feature adds org-level policy enforcement.

### Database

**Migration:** `20260310000006_mfa_policy.sql`

```sql
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;
```

### Application Layer

- **`src/lib/supabase/middleware.ts`** — Extend the existing middleware. After session validation, if `org.mfa_required = true` and `session.amr` does not include `totp`, redirect to `/auth/mfa-setup` or `/auth/mfa-challenge`.
- **`src/app/auth/mfa-setup/`** — TOTP enrolment page: show QR code from Supabase `mfa.enroll()`, verify with 6-digit code.
- **`src/app/auth/mfa-challenge/`** — Challenge page for users who have TOTP enrolled but haven't completed it for this session.
- **`src/app/dashboard/settings/security/`** — Toggle: "Require MFA for all members". When enabled, any member without TOTP enrolled is redirected to setup on next login.

---

## M09 — GDPR Tooling

### Database

**Migration:** `20260310000007_gdpr.sql`

```sql
CREATE TABLE consent_records (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  consent_type    text NOT NULL,  -- 'marketing_email' | 'sms' | 'data_processing'
  granted         boolean NOT NULL,
  granted_at      timestamptz,
  withdrawn_at    timestamptz,
  source          text,           -- 'manual' | 'import' | 'form'
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE gdpr_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients(id) ON DELETE SET NULL,
  request_type    text NOT NULL,  -- 'dsar' | 'erasure' | 'rectification'
  status          text NOT NULL DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'completed'
  requested_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  notes           text,
  export_url      text   -- signed URL for the DSAR export file
);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE gdpr_requests   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_records_own_org" ON consent_records FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
CREATE POLICY "gdpr_requests_own_org" ON gdpr_requests FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
```

### Application Layer

- **`src/lib/actions/gdpr.ts`**:
  - `exportClientData(clientId)` — Gathers all rows linked to a client across all tables (client, properties, jobs, quotes, activities, follow-ups, custom field values, audit log entries) and generates a JSON export. Uploads to Supabase Storage as a signed URL (7-day expiry). Creates a `gdpr_requests` row of type `dsar`.
  - `eraseClientData(clientId)` — Soft-delete: anonymises PII fields (`first_name → 'Redacted'`, email, phone to null), deletes properties, hard-deletes activities and follow-ups. Writes a `gdpr_requests` row of type `erasure` and an audit log entry. Does **not** delete financial records (jobs, quotes) — replaces with anonymised client reference per ICO guidance.
  - `setConsent(clientId, consentType, granted)` — Upserts a `consent_records` row.

### UI

- **Client detail page** — Add a "Data & Privacy" tab:
  - Consent toggles (marketing email, SMS) with last-updated timestamp.
  - "Export Data (DSAR)" button — triggers export, shows download link when ready.
  - "Request Erasure" button — shows confirmation modal with consequences listed, then triggers erasure.
- **`src/app/dashboard/settings/gdpr/`** — Admin view of all GDPR requests with status, completion date, and links to exports.

---

## M10 — Revenue & Sales Analytics Dashboard

### Data Sources

All data is read from existing tables. No new schema required for Phase 1.

| Metric | Source |
|--------|--------|
| Pipeline value by stage | `deals` grouped by `stage_id` |
| Deal win rate | `deals` where `won_at IS NOT NULL` / total closed |
| Quote win rate | `quotes` where `status = 'accepted'` / total sent |
| Job revenue by period | `jobs` grouped by `scheduled_date` month, sum of `price` |
| Average job value | `jobs` where `status = 'completed'` |
| Lead conversion rate | Clients where `status` changed from `lead` to `active` |
| Open follow-ups by assignee | `follow_ups` where `status = 'open'` grouped by `assigned_to` |

### Application Layer

- **`src/lib/queries/analytics.ts`** — Dedicated analytics query module. Each function returns aggregated data using Supabase's `.rpc()` for complex aggregations (to push computation to Postgres). Define Postgres functions in a migration for the more complex queries.
- **`src/app/api/analytics/route.ts`** — Internal API route used by client components to fetch chart data with caching headers.

### UI

- **`src/app/dashboard/`** — Extend the existing dashboard page (currently three count cards + lists):
  - Add a date range picker (last 30 days / 90 days / 12 months / custom).
  - **Revenue section:** bar chart of job revenue by month, total revenue card, average job value card.
  - **Pipeline section:** funnel chart by stage value, win rate card, average deal size card.
  - **Activity section:** follow-ups by assignee, quote win rate.
- Use `recharts` for charts (commonly used with Next.js/shadcn stacks).
- Restrict the Revenue and Pipeline sections to `professional` plan and above.

---

## M12 — Basic Workflow Automation Rules Engine

This is the most complex Phase 1 item. Keep scope tight.

### Supported Triggers (5)

| ID | Trigger | Description |
|----|---------|-------------|
| T01 | `quote.sent` | A quote's status changes to `sent` |
| T02 | `quote.accepted` | A quote's status changes to `accepted` |
| T03 | `job.completed` | A job's status changes to `completed` |
| T04 | `follow_up.overdue` | A follow-up's `due_date` has passed and status is `open` (checked on cron) |
| T05 | `deal.stage_changed` | A deal moves to a specified stage |

### Supported Actions (5)

| ID | Action | Description |
|----|--------|-------------|
| A01 | `create_follow_up` | Creates a follow-up assigned to a specified team member |
| A02 | `send_email` | Sends an email via Resend to the client or a team member |
| A03 | `add_tag` | Adds a tag to the client linked to the triggering entity |
| A04 | `update_deal_stage` | Moves a deal to a specified stage |
| A05 | `create_activity` | Logs an activity entry on the client timeline |

### Database

**Migration:** `20260310000008_automation.sql`

```sql
CREATE TABLE automation_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  trigger_type    text NOT NULL,   -- T01–T05 keys
  trigger_config  jsonb,           -- e.g. { "stage_id": "uuid" } for T05
  conditions      jsonb,           -- optional filter conditions (same schema as saved_views)
  actions         jsonb NOT NULL,  -- array of { action_type, config }
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE automation_executions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id     uuid NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  trigger_at  timestamptz NOT NULL DEFAULT now(),
  entity_id   uuid,       -- the entity that triggered it
  entity_type text,
  status      text NOT NULL DEFAULT 'pending',  -- 'pending' | 'success' | 'failed'
  error       text,
  completed_at timestamptz
);

ALTER TABLE automation_rules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "automation_rules_own_org" ON automation_rules FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
CREATE POLICY "automation_executions_own_org" ON automation_executions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM automation_rules r
    WHERE r.id = automation_executions.rule_id
      AND r.organisation_id = get_user_org_id()
  ));
```

### Execution Architecture

- **Event-driven triggers (T01–T03, T05):** When a server action mutates a triggering entity (e.g., `updateQuoteStatus` sets status to `sent`), it calls `triggerAutomation('quote.sent', quoteId)` after the mutation. This function:
  1. Loads active rules for the org matching the trigger type.
  2. Evaluates optional conditions against the entity.
  3. Enqueues execution by inserting into `automation_executions` with `status: 'pending'`.
  4. Fires a Supabase Edge Function (`process-automation`) asynchronously to execute the actions. The Edge Function performs the actions (create follow-up, send email, etc.) and updates the execution record.
- **Cron trigger (T04):** Supabase cron (`pg_cron`) runs daily and inserts pending execution rows for overdue follow-ups, which the Edge Function processes.

This async pattern keeps server action latency low and makes failures retryable.

### UI

- **`src/app/dashboard/settings/automation/`** — Rule builder:
  - List of active rules with on/off toggle and last-run status.
  - Create/edit rule: step 1 (pick trigger) → step 2 (add conditions, optional) → step 3 (add actions, at least one) → step 4 (name + save).
  - Simple form inputs — no visual flow builder in Phase 1.
  - Execution history tab: log of runs per rule with success/failure status.

### Plan Gating

Limit to 3 active rules on `professional`, unlimited on `business` and `enterprise`.

---

## Cross-Cutting Concerns

### New Supabase Migrations — Ordered List

| File | Content |
|------|---------|
| `20260310000000_rbac.sql` | Roles, role_permissions, custom_role_id on profiles |
| `20260310000001_pipeline.sql` | pipeline_stages, deals + RLS |
| `20260310000002_custom_fields.sql` | custom_fields, custom_field_values + RLS + indexes |
| `20260310000003_tags.sql` | tags, entity_tags + RLS |
| `20260310000004_saved_views.sql` | saved_views + RLS |
| `20260310000005_audit_log_enhancements.sql` | ip_address, user_agent, session_id on audit_logs |
| `20260310000006_mfa_policy.sql` | mfa_required on organisations |
| `20260310000007_gdpr.sql` | consent_records, gdpr_requests + RLS |
| `20260310000008_automation.sql` | automation_rules, automation_executions + RLS |
| `20260310000009_sso.sql` | sso_enabled, workos_org_id on organisations |
| `20260310000010_analytics_functions.sql` | Postgres aggregate functions for dashboard queries |

### New TypeScript Types

Extend `src/lib/types/index.ts` with:
- `Role`, `RolePermission`, `Permission` (enum)
- `PipelineStage`, `Deal`
- `CustomField`, `CustomFieldValue`
- `Tag`, `EntityTag`
- `SavedView`, `FilterConfig`
- `ConsentRecord`, `GdprRequest`
- `AutomationRule`, `AutomationExecution`

### New Sidebar Nav Items

```
Dashboard
Pipeline          ← new
Clients
Jobs
Quotes
─────────
Reports           ← new (M10)
Automation        ← new (M12, links to settings section)
─────────
Settings
  ├── General
  ├── Team
  ├── Roles        ← new (M06)
  ├── Custom Fields ← new (M02)
  ├── Saved Views  ← new (M04)
  ├── Automation   ← new (M12)
  ├── Security
  │   ├── SSO      ← new (M07)
  │   └── MFA      ← new (M08)
  ├── GDPR         ← new (M09)
  └── Audit Log    ← enhanced (M11)
```

### Plan Gating Summary

| Feature | Free | Starter | Professional | Business | Enterprise |
|---------|------|---------|-------------|----------|-----------|
| Pipeline | ✗ | ✗ | ✓ | ✓ | ✓ |
| Custom Fields | ✗ | ✗ | ✓ | ✓ | ✓ |
| Tags | ✗ | ✓ | ✓ | ✓ | ✓ |
| Advanced Filters | ✗ | ✗ | ✓ | ✓ | ✓ |
| Saved Views | ✗ | ✗ | ✓ | ✓ | ✓ |
| CSV Import | ✗ | ✓ | ✓ | ✓ | ✓ |
| RBAC | ✗ | ✗ | Limited | ✓ | ✓ |
| SSO | ✗ | ✗ | ✗ | ✗ | ✓ |
| MFA Enforcement | ✗ | ✗ | ✗ | ✓ | ✓ |
| GDPR Tooling | ✗ | ✓ | ✓ | ✓ | ✓ |
| Analytics Dashboard | Basic | Basic | ✓ | ✓ | ✓ |
| Audit Log | ✗ | ✗ | ✗ | ✓ | ✓ |
| Automation (3 rules) | ✗ | ✗ | ✓ | ✗ | ✗ |
| Automation (unlimited) | ✗ | ✗ | ✗ | ✓ | ✓ |

---

## Delivery Phases

### Phase 1a — Months 1–2 (Core CRM Features)
- M06 RBAC
- M01 Pipeline
- M02 Custom Fields
- M03 Tags
- M04 Filters & Saved Views
- M05 CSV Import

### Phase 1b — Months 3–4 (Enterprise Compliance & Intelligence)
- M11 Enhanced Audit Log (quick win — start here)
- M07 SSO / WorkOS
- M08 MFA Enforcement
- M09 GDPR Tooling
- M10 Analytics Dashboard
- M12 Automation Rules Engine

---

## Open Decisions Required Before Development Starts

| Decision | Owner | Deadline | Options |
|----------|-------|----------|---------|
| SSO provider | CTO | Week 2 | WorkOS (recommended) vs. Auth0 |
| Custom fields data model | Lead Architect | Week 2 | EAV (recommended, in this plan) vs. JSONB |
| Automation execution layer | Lead Architect | Week 3 | Supabase Edge Functions vs. external queue (e.g. Inngest) |
| Chart library | Lead Frontend | Week 2 | Recharts vs. Tremor vs. Chart.js |
| Drag-and-drop library for Kanban | Lead Frontend | Week 2 | @dnd-kit (recommended) vs. react-beautiful-dnd |
| WorkOS plan/pricing sign-off | CEO | Week 3 | — |

---

*Plan prepared by: Solutions Architect*
*For engineering review — not for external distribution*
*Version 1.0 — March 2026*
