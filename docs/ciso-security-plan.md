# Lustre — Chief Information Security Officer: Enterprise Security Plan

**Reference:** CISO-ENT-001
**Author:** Chief Information Security Officer
**Date:** March 2026
**Status:** Active — Week 1 implementation in progress (updated 3 March 2026)
**Companion Documents:** CTO-ENT-001, OPS-ENT-001, CFO-ENT-001, CRM-ENT-001, CPO-ENT-001

---

## Executive Summary

Lustre enters its enterprise growth phase with a security posture that is, by MVP standards, genuinely impressive. The founding engineering team made several correct security-first decisions that most early-stage SaaS products do not make: Row-Level Security enforced at the database layer, an immutable audit log with RLS-backed write protections, security headers configured at the edge, and a rate-limiting architecture in place from day one. These decisions matter. They are the kind of foundations that are difficult and expensive to retrofit, and the fact that they exist means we are not starting from zero.

But the gap between "secure enough for early adopters" and "secure enough for enterprise procurement" is wide, specific, and non-negotiable. Enterprise customers — particularly those in regulated industries such as facilities management, housing associations, and property services — will subject Lustre to security questionnaires, procurement due diligence, and increasingly to formal vendor risk assessments. Without the capabilities described in this document, we will fail those assessments. It is not a question of if, but of which deal and when.

My assessment is that Lustre faces four categories of security work:

**Category 1 — Critical vulnerabilities to close immediately.** These are issues that represent genuine, present risk: rate limiting that fails open, a `SUPABASE_SERVICE_ROLE_KEY` usage pattern that could be dangerously copied, no Multi-Factor Authentication, stack traces potentially exposed to clients, and no incident response capability. These must be resolved before any enterprise sales motion begins.

> **Week 1 Update (3 March 2026):** `SUPABASE_SERVICE_ROLE_KEY` has been fully removed from the application. `service.ts` deleted. Three SECURITY DEFINER RPC functions created for the public quote path. Sentry error monitoring deployed — stack trace exposure via client-visible errors is now tracked. CI/CD pipeline live. See CTO-ENT-001 for details.

**Category 2 — Compliance obligations to meet.** GDPR is not optional — it is law. Lustre processes personal data of UK and EU data subjects and currently has no data subject rights workflow, no consent management, no data retention enforcement, and no documented legal basis for processing. This is not a future problem; it is a present legal exposure.

**Category 3 — Enterprise trust signals to build.** Enterprise procurement requires evidence, not assertions. Formal penetration testing, SOC 2 Type II or Cyber Essentials Plus certification, a responsible disclosure programme, vendor security assessments, and a documented security policy framework are the artefacts that turn "we take security seriously" into a statement a procurement team can act on.

**Category 4 — Security architecture to evolve.** As the platform grows — public API, webhooks, SSO, multi-region, integrations — each new surface requires deliberate security design. This category is about building a security architecture practice, not just fixing current gaps.

This document is deliberately distinct from the CTO and COO plans. It does not repeat the COO's operational infrastructure gaps or the CTO's technical debt register. It addresses the specific security, privacy, and compliance capabilities that determine whether enterprise customers can trust us with their data, their staff records, and their business operations.

The investment required is not trivial. But the cost of not making it — a data breach, a failed enterprise deal, a regulatory fine under GDPR — dwarfs it.

---

## Table of Contents

1. [Current Security Posture Assessment](#1-current-security-posture-assessment)
2. [Threat Model & Attack Surface](#2-threat-model--attack-surface)
3. [Risk Register](#3-risk-register)
4. [Identity & Access Management](#4-identity--access-management)
5. [Data Protection & Privacy](#5-data-protection--privacy)
6. [Application Security](#6-application-security)
7. [Infrastructure & Secrets Management](#7-infrastructure--secrets-management)
8. [Security Monitoring & Incident Response](#8-security-monitoring--incident-response)
9. [Compliance Strategy](#9-compliance-strategy)
10. [Vendor & Third-Party Security](#10-vendor--third-party-security)
11. [Security Governance & Policy Framework](#11-security-governance--policy-framework)
12. [Phased Security Roadmap](#12-phased-security-roadmap)
13. [Security Success Metrics](#13-security-success-metrics)

---

## 1. Current Security Posture Assessment

### 1.1 What the Engineering Team Got Right

The following represent genuine security assets — decisions made correctly at the start that will save months of remediation work.

**Row-Level Security at the database layer.**
Every table in the Lustre schema has RLS enabled and enforced by the PostgreSQL engine itself, not by application code. The `get_user_org_id()` SECURITY DEFINER helper prevents recursive RLS evaluation and ensures that even if an application-layer bug is introduced, tenant data isolation holds at the database. This is the most important security property in the system. It was made correctly.

**Immutable audit log with RLS enforcement.**
The `audit_logs` table has no UPDATE or DELETE RLS policies. Records can be inserted but never modified or removed, even by authenticated application code. This is enforced at the database layer, not just by convention. For enterprise customers who need audit trail integrity for compliance or legal hold purposes, this is a genuine differentiator.

**Security headers configured at the edge.**
`next.config.ts` includes `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` disabling camera, microphone, and geolocation, and a Content Security Policy with `frame-ancestors 'none'`. These headers are applied globally, not on individual routes.

**Rate limiting architecture in place.**
Login (5 attempts per IP per 15 minutes), signup (3 per IP per hour), PDF generation (20 per user per minute), and quote responses (5 per token per hour) are all rate-limited via Upstash Redis. The architecture is correct; the implementation has a critical flaw discussed below.

**Safe redirect URL validation.**
The authentication middleware validates redirect URLs before following them, preventing open redirect attacks — a common vulnerability in SSO flows that is frequently missed.

**TypeScript end-to-end.**
Full type coverage from the database query layer through to UI components eliminates an entire class of injection-adjacent bugs that arise from type confusion. This is a meaningful security property, not just a developer experience benefit.

### 1.2 Security Gaps — Severity Assessment

The following gaps are assessed against enterprise procurement expectations and regulatory obligations.

| ID | Gap | Severity | Category |
|----|-----|----------|----------|
| SEC-001 | Rate limiting fails open if Redis is unavailable | Critical | Application Security |
| SEC-002 | No Multi-Factor Authentication (MFA) | Critical | Identity & Access |
| SEC-003 | Service role key usage pattern may be copied | Critical | Secrets Management |
| SEC-004 | No incident response plan or on-call capability | Critical | Operations |
| SEC-005 | GDPR: No data subject rights workflow | Critical | Compliance |
| SEC-006 | GDPR: No data retention enforcement | Critical | Compliance |
| SEC-007 | No SSO / SAML 2.0 / OIDC | High | Identity & Access |
| SEC-008 | Audit log covers deletes/settings only — not all material actions | High | Audit & Compliance |
| SEC-009 | No session management — users cannot revoke sessions | High | Identity & Access |
| SEC-010 | No password reset UI (self-service) | High | Identity & Access |
| SEC-011 | CSP uses `unsafe-inline` — should be nonce-based | High | Application Security |
| SEC-012 | No penetration test on record | High | Compliance |
| SEC-013 | No GDPR consent capture for marketing communications | High | Compliance |
| SEC-014 | No vulnerability disclosure / bug bounty programme | High | Governance |
| SEC-015 | Server action errors may expose stack traces to clients | Medium | Application Security |
| SEC-016 | No secrets rotation policy or schedule | Medium | Secrets Management |
| SEC-017 | No encryption at rest for sensitive PII fields | Medium | Data Protection |
| SEC-018 | No formal security policy documentation | Medium | Governance |
| SEC-019 | No third-party vendor security assessments | Medium | Vendor Security |
| SEC-020 | No employee security awareness training programme | Medium | Governance |
| SEC-021 | No DPA (Data Processing Agreement) templates | Medium | Compliance |
| SEC-022 | No sub-processor disclosure list | Medium | Compliance |
| SEC-023 | Data residency not configurable | Low | Compliance |
| SEC-024 | No formal RBAC model beyond admin/team_member | Low | Identity & Access |

---

## 2. Threat Model & Attack Surface

### 2.1 Who Would Attack Lustre

Understanding the realistic threat landscape for a B2B SaaS CRM in the UK property and cleaning sector is essential for prioritising security investment correctly. We are not a bank. We are also not irrelevant.

**Threat Actor 1: Opportunistic automated attackers.**
The most common and most likely threat. Credential stuffing attacks using leaked email/password combinations against the login endpoint, automated scanning for common vulnerabilities (exposed admin paths, default credentials, misconfigured S3 buckets), and automated bot traffic probing for rate limit bypasses. These actors are not targeting Lustre specifically — they are targeting all SaaS applications at scale.

**Threat Actor 2: Disgruntled former employees / insider threats.**
For a CRM holding client lists, contact details, and pricing information, a departing sales or operations employee with access represents a meaningful risk. The current absence of session revocation (SEC-009) means a terminated employee's session remains valid until it expires naturally. In a cleaning business, client lists are competitively sensitive.

**Threat Actor 3: Competitors or clients' competitors.**
Property management and facilities management are competitive sectors. The data Lustre holds — client contacts, pricing, job schedules — has genuine commercial value to a competitor. This elevates the risk profile beyond typical B2C applications.

**Threat Actor 4: Targeted attackers against Lustre's enterprise customers.**
When Lustre signs enterprise contracts with housing associations, facilities management companies, or property groups, those organisations become targets in their own right for reasons unrelated to Lustre. An attacker targeting one of Lustre's enterprise customers may use Lustre as an entry vector. This is the supply chain risk that enterprise procurement teams assess.

**Out of scope (for now):** Nation-state actors, advanced persistent threats. These are not a realistic near-term concern for Lustre's current scale and sector.

### 2.2 Attack Surface Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SURFACE                         │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Auth Endpoints │  Public Routes    │  API / Webhooks (future)  │
│  /auth/login    │  /q/[token]       │  /api/v1/* (planned)      │
│  /auth/signup   │  (quote sharing)  │  Stripe webhook           │
│  /auth/reset    │                   │  Email webhooks            │
├─────────────────┴───────────────────┴───────────────────────────┤
│                     AUTHENTICATED SURFACE                       │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Server Actions │  File Uploads     │  PDF Generation           │
│  (all mutations)│  (avatar, future) │  /api/quotes/[id]/pdf     │
├─────────────────┴───────────────────┴───────────────────────────┤
│                     ADMINISTRATIVE SURFACE                      │
├─────────────────┬───────────────────┬───────────────────────────┤
│  Supabase Studio│  Vercel Dashboard │  Upstash Console          │
│  (DB access)    │  (env vars, logs) │  (Redis, rate limits)     │
└─────────────────┴───────────────────┴───────────────────────────┘
```

### 2.3 Data Sensitivity Classification

| Data Category | Examples | Sensitivity | Current Protection |
|---------------|----------|-------------|-------------------|
| PII — Contact data | Client names, emails, phone numbers | High | RLS scoped to org |
| PII — Location data | Property addresses, postcodes | High | RLS scoped to org |
| PII — Access information | Key codes, alarm codes, access instructions | Very High | RLS scoped to org, plaintext |
| Commercial data | Pricing, quotes, invoice history | High | RLS scoped to org |
| Operational data | Job schedules, staff assignments | Medium | RLS scoped to org |
| Authentication data | Password hashes, session tokens | Critical | Managed by Supabase Auth |
| Billing data | Stripe customer IDs, subscription status | High | Partial — Stripe handles card data |

**Critical finding:** Property access instructions (`properties.access_instructions`) may contain door codes, alarm codes, key safe combinations, and gate codes. This is sensitive physical security information stored in plaintext in the database. A breach of this field represents not just a data protection failure but a direct physical security risk to Lustre's clients' properties.

---

## 3. Risk Register

| ID | Risk | Likelihood | Impact | Rating | Owner | Mitigation |
|----|------|-----------|--------|--------|-------|------------|
| R-001 | Credential stuffing attack succeeds due to no MFA | High | High | Critical | CISO | Implement MFA (Phase 1) |
| R-002 | Rate limiting Redis outage disables all rate limits | Medium | High | High | CTO | Make rate limiting fail-closed (Phase 1) |
| R-003 | Service role key used incorrectly, bypassing RLS | Medium | Critical | Critical | CTO | Restrict service role usage (Phase 1) |
| R-004 | GDPR enforcement action due to no DSAR workflow | Medium | High | High | CISO | Implement DSAR tooling (Phase 1) |
| R-005 | Data breach with no incident response capability | Low | Critical | High | CISO | Build IR plan and capability (Phase 1) |
| R-006 | Access instructions (key codes) leaked via breach | Low | Critical | High | CISO | Encrypt sensitive fields (Phase 2) |
| R-007 | Former employee retains active session post-termination | High | High | High | CISO/COO | Session revocation (Phase 1) |
| R-008 | Enterprise deal lost due to failed security questionnaire | High | High | High | CISO | Cyber Essentials Plus, pen test (Phase 2) |
| R-009 | Supply chain attack via third-party npm dependency | Medium | High | High | CTO | Dependency scanning in CI/CD (Phase 1) |
| R-010 | Server action exposes stack trace with sensitive data | Medium | Medium | Medium | CTO | Structured error handling (Phase 1) |
| R-011 | Phishing attack against Lustre staff gains dashboard access | Medium | High | High | CISO | MFA + security awareness training (Phase 1) |
| R-012 | GDPR fine for unlawful retention of deleted client data | Medium | High | High | CISO | Data retention policy + enforcement (Phase 2) |
| R-013 | Public quote token brute-forced to access quote data | Low | Medium | Medium | CTO | Ensure token entropy is sufficient (Phase 1) |
| R-014 | Supabase service incident exposes customer data | Low | Critical | High | CISO | Vendor assessment, DPA with Supabase (Phase 1) |
| R-015 | No secrets rotation means long-lived key compromise undetected | Medium | High | High | CTO | Secrets rotation policy (Phase 2) |

---

## 4. Identity & Access Management

### 4.1 Current State

Lustre's current IAM is functional for an MVP but inadequate for enterprise:

- **Authentication:** Email/password via Supabase Auth with session cookies. No MFA.
- **Authorisation:** Two roles — `admin` and `team_member` — enforced via RLS and checked in server actions.
- **Session management:** Sessions exist but cannot be viewed or revoked by users or administrators.
- **Password reset:** No self-service password reset UI exists — a fundamental usability and security gap.
- **Invitation flow:** Not yet implemented. Users cannot invite colleagues to their organisation.
- **SSO:** Not implemented. Enterprise deal-blocker.

### 4.2 Multi-Factor Authentication

MFA is not optional for enterprise. It is a baseline requirement that will appear on every security questionnaire Lustre receives. Supabase Auth supports TOTP-based MFA natively. The implementation path is well-defined.

**Requirements:**
- TOTP authenticator app support (Google Authenticator, Authy, 1Password)
- Mandatory MFA enforcement per-organisation (configurable by admin)
- Recovery codes issued at MFA setup with clear UX guidance
- MFA bypass for SSO-authenticated users (SSO provider handles MFA)

**Phase 1 — Optional MFA for all users.**
Users can enrol a TOTP device. Admins are shown a prompt to enrol. Sessions require TOTP confirmation after password authentication.

**Phase 2 — Mandatory MFA enforcement.**
Organisation admins can enforce MFA for all members. New members who have not enrolled MFA are blocked from accessing the dashboard and redirected to enrolment.

**Phase 3 — Adaptive MFA.**
MFA required when: new device detected, unusual geography, or admin-level actions (inviting users, deleting clients, accessing billing settings).

### 4.3 Single Sign-On (SSO)

SSO via SAML 2.0 and OIDC is a hard requirement for enterprise contracts. Facilities management companies, housing associations, and property groups run Azure AD, Okta, or Google Workspace. They will not create and manage separate Lustre credentials. Their IT security policy will prohibit it.

**Implementation approach:**
Supabase Auth supports SSO via SAML 2.0. This is a viable path for initial SSO support without building a custom implementation. For more control and better branding, a dedicated identity provider layer (Auth0 or WorkOS) should be evaluated in Phase 3.

**Requirements:**
- SAML 2.0 SP-initiated and IdP-initiated flows
- OIDC support (for Google Workspace and modern IdPs)
- Per-organisation SSO configuration (stored securely, not in env vars)
- Domain-based SSO enforcement (users from @enterprise.com are always routed to SSO)
- Just-in-time (JIT) provisioning — new SSO users automatically get a Lustre account
- SCIM provisioning for automated user lifecycle management (Phase 4)

### 4.4 Role-Based Access Control (RBAC) Expansion

The current two-role model (`admin` / `team_member`) is insufficient for enterprise customers who need granular permission control. A cleaning company with 50 staff will have schedulers who should not see pricing, managers who should not see billing, and a finance team who should only see invoices.

**Proposed RBAC model:**

| Role | Clients | Properties | Jobs | Quotes | Billing | Team | Settings |
|------|---------|-----------|------|--------|---------|------|----------|
| Owner | Full | Full | Full | Full | Full | Full | Full |
| Admin | Full | Full | Full | Full | View | Full | Full |
| Manager | Full | Full | Full | Full | None | View | None |
| Scheduler | View | View | Full | None | None | None | None |
| Team Member | View | View | Own jobs | None | None | None | None |
| Finance | View | None | None | Full | Full | None | None |
| Read Only | View | View | View | View | None | None | None |

This model must be enforced at the RLS layer, not only in the application layer. RLS policies will need to evaluate the user's role, not just their `organisation_id`.

### 4.5 Session Management

Enterprise customers will require the ability to:

- View all active sessions for their account (device, location, last active)
- Revoke individual sessions (e.g., after device loss)
- Force all sessions to expire for a user (immediate effect on termination)
- Organisation admins to force logout of any team member

**Implementation:** Supabase Auth exposes session management APIs. A "Security" page in user settings should surface active sessions and allow revocation.

---

## 5. Data Protection & Privacy

### 5.1 GDPR Compliance — Current Status: Non-Compliant

Lustre processes personal data of data subjects in the UK and EU. The UK GDPR (retained post-Brexit) and EU GDPR apply. Current compliance status is materially deficient.

**Legal basis for processing:** No documented legal basis per data category. Required under Article 6 GDPR before processing begins.

**Data subject rights — current implementation:**

| Right | Status | Gap |
|-------|--------|-----|
| Right of access (DSAR) | ❌ None | No workflow to export all personal data for a data subject |
| Right to erasure | ❌ None | No right-to-erasure workflow; data persists indefinitely |
| Right to rectification | ⚠️ Partial | Users can edit data manually, but no formal process |
| Right to portability | ❌ None | No data export in machine-readable format |
| Right to object | ❌ None | No mechanism to object to processing |
| Right to restrict processing | ❌ None | No processing restriction flag |

**Data retention:** No retention policy exists. Personal data is stored indefinitely. Under GDPR Article 5(1)(e), personal data must not be kept longer than necessary for its purpose. "Indefinitely" is not a lawful retention period.

**Privacy by design:** The principle is not yet applied to feature development. No privacy impact assessment (DPIA) process exists.

### 5.2 GDPR Remediation Plan

**Immediate actions (Phase 1):**

1. **Document legal basis for each processing activity.** Legitimate interest or contractual necessity for CRM data; consent for marketing communications. Publish a Records of Processing Activities (ROPA) register.

2. **Appoint a Data Protection contact.** At current scale, a CISO-level responsibility is appropriate. A formal DPO (Data Protection Officer) appointment is required if processing becomes large-scale or systematic. Document the decision.

3. **Data Processing Agreement with Supabase.** Supabase is a data processor. A signed DPA must be in place before any enterprise contract. Supabase offers a standard DPA — execute it.

4. **Data Processing Agreement with Resend, Upstash, Vercel.** All sub-processors processing personal data require a DPA. Compile a sub-processor list and execute DPAs.

5. **Privacy policy update.** Current privacy policy is generic. It must accurately describe: what data is collected, legal basis, retention periods, third-party processors, and how to exercise rights.

**Phase 2 — DSAR and erasure tooling:**

A Data Subject Access Request (DSAR) workflow must allow:
- An authenticated user to request export of all personal data held about them
- An organisation admin to export personal data held about a named data subject (their clients)
- The export to be generated in a machine-readable format (JSON or CSV)
- Erasure requests to anonymise PII fields while preserving aggregated reporting data

**The erasure challenge:** Lustre's immutable audit log and append-only activity timeline create a tension with the right to erasure. The recommended approach is **pseudonymisation** rather than deletion: replace PII fields (name, email, phone) with a placeholder (e.g., `[DELETED-{hash}]`) while preserving the structural record. This satisfies GDPR erasure while maintaining audit integrity.

### 5.3 Data Minimisation

Lustre currently collects data that may not be strictly necessary:

- `properties.access_instructions` — potentially contains physical security information (alarm codes, key codes). **Risk:** This data, if breached, creates physical security risk. Consider whether the application needs to store this in free-text form or whether structured fields with explicit sensitivity flags would be safer.
- `profiles.avatar_url` — User avatar images are stored externally (Supabase storage). Ensure storage bucket permissions are correctly scoped to the owning organisation.

### 5.4 Encryption at Rest for Sensitive Fields

Supabase (PostgreSQL) encrypts data at rest at the storage level. This protects against disk-level compromise but does not protect against a compromised database connection or a compromised Supabase account.

**Recommended approach:** Implement application-level encryption for the highest-sensitivity fields:
- `properties.access_instructions` (alarm codes, key codes)
- `clients.notes` (may contain sensitive background information)
- Future: financial data, contract terms

The recommended library is `@noble/ciphers` (well-audited, zero-dependency) using AES-256-GCM. The encryption key should be stored in a secrets manager (not in environment variables — see Section 7).

**Note:** Encrypted fields cannot be searched or sorted at the database layer. The application must decrypt before display. This is an acceptable tradeoff for access instruction data which is only displayed in context, never searched.

---

## 6. Application Security

### 6.1 OWASP Top 10 Assessment

| OWASP Risk | Status | Notes |
|-----------|--------|-------|
| A01 — Broken Access Control | ⚠️ Partial | RLS is strong; service role key usage (TD-003) is a gap |
| A02 — Cryptographic Failures | ⚠️ Partial | TLS in transit; no field-level encryption for sensitive data |
| A03 — Injection | ✅ Good | Supabase client uses parameterised queries; no raw SQL concatenation observed |
| A04 — Insecure Design | ⚠️ Partial | No threat modelling in development process |
| A05 — Security Misconfiguration | ⚠️ Partial | CSP uses `unsafe-inline`; rate limiting fails open |
| A06 — Vulnerable Components | ⚠️ Unknown | No dependency scanning in CI/CD |
| A07 — Auth Failures | ❌ Gap | No MFA; no session revocation; rate limiting fragile |
| A08 — Software Integrity Failures | ⚠️ Unknown | No SBOM; no supply chain controls |
| A09 — Logging Failures | ❌ Gap | Audit log is partial; no security event logging |
| A10 — SSRF | ✅ Low Risk | Limited external URL fetching in current codebase |

### 6.2 Content Security Policy Hardening

The current CSP configuration includes `unsafe-inline` for scripts. While this is appropriate during development (Next.js HMR requires it), production deployments should use nonce-based CSP to eliminate this risk.

**Current (permissive):**
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Target (nonce-based):**
```
script-src 'self' 'nonce-{random-per-request}'
```

Next.js 13+ supports nonce-based CSP via middleware. This eliminates the XSS risk from inline scripts without breaking application functionality.

### 6.3 Quote Share Token Security

The public quote sharing endpoint (`/q/[token]`) uses a token-based URL for unauthenticated access. This is appropriate design. However, the token implementation requires review:

- **Token entropy:** Must be cryptographically random with sufficient entropy (minimum 128 bits) to prevent brute-forcing. The current implementation should be audited to confirm this.
- **Token expiry:** Tokens appear to have no expiry beyond the quote's `valid_until` date. Expired quotes should have their tokens invalidated.
- **Token scope:** Tokens should only permit viewing and responding to the specific quote. The service role client used for token lookup (in `/src/lib/supabase/service.ts`) must be confirmed to not expose data beyond the specific quote record.

### 6.4 Server Action Security

All mutations in Lustre are implemented as Next.js server actions. These are effectively HTTP endpoints and must be treated as such:

**Current gaps:**
- No standardised error response shape — some actions throw, some return typed errors (SEC-015)
- No input sanitisation layer beyond TypeScript type checking
- No action-level audit logging for all mutations (only deletes and settings changes are audited)

**Required changes:**
1. All server actions must catch exceptions and return a standardised `{ success: false, error: string }` shape. Internal error details must not be returned to the client.
2. All server actions must validate input at the boundary (length, format, allowed values) regardless of TypeScript types.
3. Extend audit logging to cover all material mutations: client creation, property creation, quote creation, job creation, user invitation, role changes.

### 6.5 Dependency Security

Lustre has no dependency scanning in its development or deployment pipeline. The npm ecosystem is a well-documented supply chain attack vector.

**Required controls:**
- **`npm audit`** run as a blocking step in CI/CD — builds fail on high/critical vulnerabilities
- **Dependabot or Renovate** — automated dependency update PRs
- **Lockfile integrity** — `package-lock.json` committed and validated in CI
- **SBOM generation** — Software Bill of Materials generated on each release

### 6.6 Penetration Testing

Lustre has no penetration test on record. Enterprise procurement — particularly public sector and housing — will require a penetration test report dated within the last 12 months.

**Recommended approach:**
- **Phase 2:** Engage a CREST-accredited penetration testing firm for a web application penetration test (OWASP methodology)
- **Scope:** Authentication flows, authorised access controls, the public quote endpoint, server actions, API (when implemented)
- **Deliverable:** Executive summary report suitable for sharing with enterprise procurement teams
- **Frequency:** Annual penetration test + re-test after major architectural changes
- **Budget estimate:** £5,000–£12,000 for initial engagement; £3,000–£6,000 for annual re-test

---

## 7. Infrastructure & Secrets Management

### 7.1 Secrets Inventory

The following secrets are currently managed as environment variables in Vercel:

| Secret | Scope | Sensitivity | Risk if Compromised |
|--------|-------|-------------|-------------------|
| ~~`SUPABASE_SERVICE_ROLE_KEY`~~ | ~~Server-only~~ | ~~Critical~~ | **REMOVED (3 March 2026)** — No longer used. Delete from Vercel env vars and `.env.local`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Low | Limited to RLS-scoped queries — this is by design |
| `UPSTASH_REDIS_REST_TOKEN` | Server-only | High | Rate limit bypass, potential data exposure |
| `RESEND_API_KEY` | Server-only | High | Send email from Lustre domain, phishing vector |
| `STRIPE_SECRET_KEY` | Server-only | Critical | Financial transactions |
| `STRIPE_WEBHOOK_SECRET` | Server-only | High | Webhook forgery |

### 7.2 ~~The Service Role Key Problem~~ ✅ RESOLVED (3 March 2026)

The `SUPABASE_SERVICE_ROLE_KEY` has been **fully removed** from the application codebase. `src/lib/supabase/service.ts` has been deleted. The public quote operations previously served via this key now use SECURITY DEFINER PostgreSQL functions callable with the anon key:

- `public_get_quote_by_token(token)` — returns all quote data for the `/q/[token]` page
- `public_mark_quote_viewed(token)` — transitions quote status `sent → viewed`
- `public_respond_to_quote(token, response)` — handles accept/decline + job creation atomically

These functions are granted `EXECUTE` to the `anon` role. They execute as the function owner (postgres), are tightly scoped to the minimum required operations, and do not establish the "bypass RLS" pattern. **`SUPABASE_SERVICE_ROLE_KEY` should be removed from Vercel environment variables and `.env.local` immediately.**

### 7.3 Secrets Rotation Policy

No secrets rotation schedule currently exists. Long-lived credentials are a fundamental security risk: a compromised credential that is never rotated gives an attacker indefinite access.

**Proposed rotation schedule:**

| Secret | Rotation Frequency | Trigger Conditions |
|--------|-------------------|-------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | 90 days | + Any suspected compromise; + Any departing team member with access |
| `RESEND_API_KEY` | 180 days | + Suspected compromise |
| `UPSTASH_REDIS_REST_TOKEN` | 90 days | + Suspected compromise |
| `STRIPE_SECRET_KEY` | Per Stripe policy | + Suspected compromise |
| SSO client secrets (future) | 365 days | + Per IdP recommendation |

**Rotation procedure:** All secret rotations must be tested in a staging environment before production. Rotation must be performed during low-traffic windows with rollback capability.

### 7.4 Secrets Manager Migration

For enterprise readiness, secrets must be managed in a dedicated secrets manager rather than environment variables:

**Recommended tool:** Doppler (simple integration with Vercel and Supabase, good DX) or AWS Secrets Manager (more enterprise-standard, higher complexity).

**Benefits:**
- Centralised secrets inventory
- Rotation workflows with automated deployment triggers
- Access audit logs — who accessed which secret, when
- Team-level access scoping (not all developers need the Stripe key)
- Integration with CI/CD for test environment secrets

---

## 8. Security Monitoring & Incident Response

### 8.1 Current Monitoring: None

Lustre has no security monitoring capability. There is no alerting on:
- Failed login attempts / brute force patterns
- Unusual data access patterns (large exports, bulk deletes)
- Rate limit threshold breaches
- Authentication anomalies (new geography, new device)
- Application errors (which may indicate exploitation attempts)

The COO plan covers operational monitoring (Sentry, uptime). Security monitoring is a distinct requirement that must be implemented in parallel.

### 8.2 Security Event Logging

The following events must be logged in a structured, queryable format with sufficient context for incident investigation:

**Authentication events:**
- Successful and failed login attempts (with IP, user agent, timestamp)
- MFA enrolment and authentication events
- Password reset requests and completions
- Session creation and revocation
- SSO authentication events

**Authorisation events:**
- Access denied events (RLS rejections are not currently surfaced)
- Admin-level actions (user invitation, role changes, billing access)
- Service role key usage

**Data events:**
- Bulk data operations (exports, mass deletes)
- Access to high-sensitivity records (access instructions)
- DSAR and erasure requests

**Implementation:** Extend the existing `audit_logs` table to capture security-relevant events, and supplement with a Supabase Postgres log forwarding integration to a log management platform (e.g., Axiom, Datadog, or Logtail).

### 8.3 Incident Response Plan

Lustre has no documented incident response plan. An enterprise customer who suffers a data breach where Lustre is implicated will ask: what is your incident response procedure? Who do we call? What is your notification SLA?

Under UK GDPR, a personal data breach that poses risk to individuals must be reported to the ICO within 72 hours of discovery. "We don't have a plan" is not an answer to a regulator.

**Minimum viable incident response plan (Phase 1):**

**Severity definitions:**
- **P1 (Critical):** Confirmed data breach; service down for all customers; RCE suspected
- **P2 (High):** Suspected data breach; significant service degradation; active exploitation suspected
- **P3 (Medium):** Security anomaly requiring investigation; single-customer impact
- **P4 (Low):** Security advisory; potential future risk; no current exploitation

**Response procedure (P1/P2):**

1. **Detect** — Alert fires via monitoring or customer report
2. **Contain** — Assess scope; disable affected credentials; block suspicious IPs; potentially take affected service offline
3. **Communicate internally** — CISO, CEO, CTO notified within 1 hour
4. **Assess** — Determine data categories affected; number of data subjects; root cause
5. **Notify regulators** — ICO notification within 72 hours if personal data involved and risk to individuals is likely
6. **Notify affected customers** — Within 24 hours of confirming breach scope where required
7. **Remediate** — Fix root cause; re-deploy; rotate affected credentials
8. **Post-incident review** — Root cause analysis document within 5 business days

**Contacts register:** A documented list of emergency contacts — CISO, CTO, CEO, legal counsel, cyber insurance broker, CREST incident response retainer — must be maintained and tested quarterly.

### 8.4 Bug Bounty / Responsible Disclosure

Lustre needs a published responsible disclosure policy before enterprise sales begin. Security researchers and customers need to know where to report vulnerabilities. Without this, vulnerabilities may be:
- Disclosed publicly without warning (damaging)
- Not reported at all (dangerous)
- Used maliciously (catastrophic)

**Phase 1 — Responsible disclosure policy:**
Publish a `security.txt` file at `/.well-known/security.txt` and a human-readable policy at `/security`. Specify: how to report, what information to include, response SLA (acknowledge within 48 hours, triage within 5 business days), and what is in scope.

**Phase 3 — Managed bug bounty programme:**
When engineering capacity and budget allow, consider a managed programme via HackerOne or Bugcrowd. This signals security maturity to enterprise buyers and creates a structured channel for ongoing vulnerability discovery.

---

## 9. Compliance Strategy

### 9.1 Compliance Roadmap Overview

| Framework | Timeline | Rationale |
|-----------|----------|-----------|
| UK GDPR | Phase 1 (immediate) | Legal obligation — non-compliance is a present risk |
| Cyber Essentials Plus | Phase 2 (months 3–5) | Required by many UK public sector and housing contracts |
| SOC 2 Type I | Phase 3 (months 6–9) | Required by enterprise buyers in financial services and property groups |
| SOC 2 Type II | Phase 4 (months 10–18) | Full enterprise certification — 6+ month observation period |
| ISO 27001 | Phase 4+ (optional) | Consider if selling to large enterprise / public sector organisations |

### 9.2 Cyber Essentials Plus

Cyber Essentials is the UK Government-backed certification for baseline cyber security. Cyber Essentials Plus includes independent technical verification. Many UK public sector bodies and housing associations require it from all software vendors in their supply chain.

**Five control categories:**
1. **Firewalls** — Vercel and Supabase provide boundary controls. Document the network architecture.
2. **Secure configuration** — Default credentials removed, unnecessary services disabled. Vercel and Supabase defaults are generally good; must be verified.
3. **User access control** — MFA, principle of least privilege, access review. This requires Phase 1 IAM work to be completed first.
4. **Malware protection** — Development environment controls, dependency scanning.
5. **Patch management** — Dependency updates, infrastructure patching (managed by Supabase/Vercel for infrastructure layer).

**Estimated cost:** £1,500–£3,000 for Cyber Essentials Plus assessment via an accredited certification body.

**Timeline:** Achievable in Phase 2 (months 3–5) once IAM and GDPR controls are in place.

### 9.3 SOC 2 Type II

SOC 2 is the US-origin audit standard that enterprise buyers — particularly in financial services, insurance, and large property groups — will require. It covers five Trust Service Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy.

For Lustre, initial scope should be **Security and Availability** only.

**Pre-requisites for SOC 2:**
- Documented security policies (Section 11)
- Access controls including MFA and RBAC
- Audit logging for all material events
- Incident response plan and tested procedure
- Vulnerability management (dependency scanning, pen test)
- Vendor management process
- Change management controls (CI/CD, code review, deployment approvals)

**Observation period:** SOC 2 Type II requires a minimum 6-month observation period where controls must be demonstrably in place and operating. This means controls must be implemented and running from Phase 2/3 to have a Type II report available at the end of the 12-month roadmap.

**Estimated cost:** £15,000–£40,000 depending on auditor and scope. Consider using a compliance automation platform (Vanta, Drata, or Secureframe) to reduce manual evidence collection effort and cost. These platforms integrate directly with GitHub, Vercel, AWS, and Supabase to auto-collect evidence.

**Recommendation:** Engage Vanta in Phase 2. This provides a continuous compliance dashboard, automates evidence collection for SOC 2 and Cyber Essentials, and gives the sales team a trust page to share with prospects.

---

## 10. Vendor & Third-Party Security

### 10.1 Current Vendor Landscape

| Vendor | Role | Data Access | DPA Status | Risk |
|--------|------|------------|-----------|------|
| Supabase | Database, Auth | Full — all personal data | ❌ Required | Critical |
| Vercel | Hosting, CDN, env vars | Code, env vars, request logs | ❌ Required | High |
| Resend | Transactional email | Email content + recipient PII | ❌ Required | High |
| Upstash | Rate limiting (Redis) | IP addresses | ❌ Required | Medium |
| Stripe | Payments | Billing data (not card data) | ⚠️ Standard DPA available | Medium |
| @react-pdf/renderer | PDF generation | Quote data in memory | ✅ Open source (no DPA) | Low |

### 10.2 Vendor Assessment Requirements

Before enterprise contracts can be signed, Lustre must:

1. **Execute DPAs with all sub-processors** handling personal data — Supabase, Vercel, Resend, Upstash (Phase 1)
2. **Publish a sub-processor list** on the Lustre website (required by GDPR for processors) — updated when sub-processors change
3. **Assess the security posture of critical vendors** — Supabase and Vercel's security pages, SOC 2 reports (both have these), and compliance documentation should be reviewed and documented
4. **Establish a vendor review process** — any new vendor with access to personal data must be reviewed before adoption

### 10.3 Supabase-Specific Considerations

Supabase is the most critical vendor in the stack — it holds all personal data, enforces all access controls, and manages authentication. Several Supabase-specific security points require attention:

- **Supabase Studio access** should be restricted to specific IP addresses or require MFA
- **Row-Level Security** is correctly in place; it must be reviewed on every schema migration
- **Supabase service role key** must never be embedded in client-side code (currently it is not — this must be validated on every PR)
- **Supabase project pausing** — free-tier projects can be paused by Supabase after inactivity. Confirm the production project is on a paid tier with no auto-pause risk
- **Database backups** — Supabase provides daily backups on paid tiers; Point-in-Time Recovery (PITR) requires the Pro plan. This is a shared concern with the COO plan.

---

## 11. Security Governance & Policy Framework

### 11.1 Policy Documents Required

An enterprise security policy framework is not optional for SOC 2 or enterprise procurement. The following policy documents must be created, approved, and maintained:

| Policy | Priority | Owner | Review Frequency |
|--------|----------|-------|-----------------|
| Information Security Policy (master) | P1 | CISO | Annual |
| Acceptable Use Policy | P1 | CISO | Annual |
| Access Control Policy | P1 | CISO | Annual |
| Data Classification Policy | P1 | CISO | Annual |
| Incident Response Policy | P1 | CISO | Annual |
| Data Retention & Disposal Policy | P1 | CISO + Legal | Annual |
| Password & Authentication Policy | P1 | CISO | Annual |
| Vendor Management Policy | P2 | CISO | Annual |
| Change Management Policy | P2 | CTO | Annual |
| Business Continuity Policy | P2 | COO + CISO | Annual |
| Vulnerability Management Policy | P2 | CTO + CISO | Annual |
| Employee Security Training Policy | P2 | CISO | Annual |

### 11.2 Security Awareness Training

The weakest link in any security programme is the human one. Phishing attacks, social engineering, and accidental data exposure are more likely vectors for Lustre than sophisticated technical exploitation at current scale.

**Minimum programme:**
- Onboarding security training for all new staff (mandatory, before system access granted)
- Annual security awareness refresher for all staff
- Phishing simulation exercises (quarterly)
- Secure development training for engineering team (OWASP Top 10 awareness)
- Escalation procedure: what to do if you suspect a security incident or receive a suspicious email

**Tooling:** KnowBe4 or Proofpoint Security Awareness Training are purpose-built platforms for this. At small team scale, a structured self-paced course and documented completion records are sufficient for SOC 2 evidence.

### 11.3 Security in the Development Process

Security must be integrated into the development lifecycle, not bolted on at the end.

**Required process controls:**

1. **Security review on PRs touching sensitive code paths.** PRs that modify: authentication, authorisation, RLS policies, the service role client, server actions for sensitive data, or environment variable handling require a security-aware reviewer.

2. **Threat modelling for new features.** Before significant new features (SSO, public API, webhooks, client portal) are scoped, a brief threat modelling exercise should identify security requirements. The STRIDE framework is appropriate for Lustre's scale.

3. **Secure coding guidelines.** A brief (one page) secure coding guidelines document specific to Lustre's stack (Next.js server actions, Supabase RLS, TypeScript) should be maintained for onboarding developers.

4. **Dependency review.** New dependencies added to `package.json` should be reviewed for known vulnerabilities (`npm audit`) and for supply chain risk (maintainer reputation, download count, recent activity).

---

## 12. Phased Security Roadmap

### Phase 1 — Security Baseline (Months 1–2)

*Objective: Close critical vulnerabilities, meet minimum legal obligations, establish incident response capability.*

| Priority | Item | Owner | Effort |
|----------|------|-------|--------|
| P0 | Make rate limiting fail-closed (Redis outage = deny, not allow) | CTO | 1 day |
| P0 | Restrict service role key to approved usage; add lint rule | CTO | 2 days |
| P0 | Implement password reset UI | CTO | 2 days |
| P0 | Extend audit log to cover all material mutations | CTO | 3 days |
| P1 | Implement MFA (TOTP via Supabase Auth) — optional enrolment | CTO | 3 days |
| P1 | Implement session management UI (view + revoke active sessions) | CTO | 2 days |
| P1 | Standardise server action error handling — no stack traces to client | CTO | 3 days |
| P1 | Review and confirm quote token entropy | CTO | 1 day |
| P1 | Execute DPAs with Supabase, Vercel, Resend, Upstash | CISO | 3 days |
| P1 | Document ROPA (Records of Processing Activities) | CISO | 2 days |
| P1 | Update privacy policy with accurate sub-processor list | CISO + Legal | 2 days |
| P1 | Publish responsible disclosure policy + `security.txt` | CISO | 1 day |
| P1 | Write minimum viable incident response plan | CISO | 3 days |
| P1 | Set up npm audit in CI/CD (with COO CI/CD work) | CTO | 1 day |

**Phase 1 gate:** Before progressing, all P0 items must be complete and all P1 items must be in progress.

### Phase 2 — Compliance Foundation (Months 3–5)

*Objective: Achieve GDPR compliance, Cyber Essentials Plus certification, and enterprise procurement readiness.*

| Priority | Item | Owner | Effort |
|----------|------|-------|--------|
| P1 | Implement DSAR (data export) workflow | CTO | 5 days |
| P1 | Implement right-to-erasure (pseudonymisation) workflow | CTO | 5 days |
| P1 | Enforce MFA for admin-role users | CTO | 2 days |
| P1 | Implement RBAC expansion (5-role model) | CTO | 8 days |
| P1 | Nonce-based CSP implementation | CTO | 2 days |
| P1 | Application-level encryption for `access_instructions` field | CTO | 3 days |
| P1 | Migrate secrets to Doppler or AWS Secrets Manager | CTO | 3 days |
| P1 | Security event logging (auth events, bulk operations) | CTO | 4 days |
| P1 | Penetration test engagement (book and scope) | CISO | — |
| P1 | Cyber Essentials Plus assessment | CISO | 3 weeks |
| P1 | Create core security policy documents (6 P1 policies) | CISO | 2 weeks |
| P1 | Security awareness training for all staff | CISO | 1 week |
| P2 | Engage Vanta / Drata for SOC 2 readiness | CISO | 2 days setup |
| P2 | Data retention policy + automated enforcement | CTO + CISO | 5 days |
| P2 | Penetration test execution and remediation | CTO + CISO | 4 weeks |

### Phase 3 — Enterprise IAM & API Security (Months 6–9)

*Objective: SSO capability, API security, SOC 2 Type I.*

| Priority | Item | Owner | Effort |
|----------|------|-------|--------|
| P1 | SAML 2.0 / OIDC SSO implementation | CTO | 10 days |
| P1 | Domain-based SSO enforcement | CTO | 3 days |
| P1 | JIT user provisioning for SSO | CTO | 3 days |
| P1 | API authentication (API keys or OAuth 2.0) | CTO | 5 days |
| P1 | API rate limiting and quota management | CTO | 3 days |
| P1 | Webhook security (signed payloads) | CTO | 2 days |
| P1 | SOC 2 Type I audit engagement | CISO | — |
| P2 | Adaptive MFA (new device / geography detection) | CTO | 5 days |
| P2 | Security information in customer-facing trust centre | CISO | 1 week |
| P2 | Bug bounty programme launch (HackerOne/Bugcrowd) | CISO | 2 weeks |

### Phase 4 — SOC 2 Type II & Advanced Controls (Months 10–18)

*Objective: SOC 2 Type II report, enterprise-grade security posture.*

| Item | Owner |
|------|-------|
| SOC 2 Type II audit (6-month observation period) | CISO |
| SCIM provisioning for automated user lifecycle management | CTO |
| Data residency options (UK/EU region selection) | CTO + CIO |
| Advanced security event correlation (SIEM) | CISO |
| Annual penetration test (repeat) | CISO |
| Customer-facing security questionnaire library | CISO |
| ISO 27001 feasibility assessment | CISO |

---

## 13. Security Success Metrics

Security investment without measurement is invisible. The following metrics demonstrate security programme effectiveness to the board, enterprise customers, and auditors.

### 13.1 Security Posture Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| MFA adoption rate (admin users) | 100% by end Phase 1 | Supabase Auth reports |
| MFA adoption rate (all users) | >80% by end Phase 2 | Supabase Auth reports |
| Critical/high vulnerabilities open >30 days | 0 | npm audit + pen test findings |
| Secrets rotated on schedule | 100% | Doppler rotation log |
| Security policy documents up to date | 100% | Annual review log |
| Staff security training completion | 100% within 30 days of joining | Training platform report |
| Penetration test findings remediated | 100% critical, >90% high | Pen test remediation tracker |

### 13.2 Compliance Metrics

| Metric | Target |
|--------|--------|
| DPAs executed with all sub-processors | 100% by end Phase 1 |
| DSAR response time | <30 days (legal obligation) |
| Erasure request completion time | <30 days (legal obligation) |
| ICO breach notification SLA (72 hours) | 100% compliance |
| Cyber Essentials Plus certification | Achieved by end Phase 2 |
| SOC 2 Type I report available | By end Phase 3 |
| SOC 2 Type II report available | By end Phase 4 |

### 13.3 Operational Security Metrics

| Metric | Target |
|--------|--------|
| Mean time to detect (MTTD) security incidents | <4 hours for P1/P2 |
| Mean time to respond (MTTR) | <2 hours for P1, <8 hours for P2 |
| Incident response plan tested | Quarterly tabletop exercise |
| Security review coverage on sensitive PRs | 100% |
| Audit log completeness (all material mutations logged) | 100% |

---

## Closing Assessment

Lustre's security foundations are genuinely strong for an MVP. The Row-Level Security architecture, the immutable audit log, the rate limiting infrastructure, and the TypeScript discipline are assets that many mature SaaS products do not have. The team made the right calls early.

The work ahead is substantial but tractable. It is not a re-architecture — it is a maturation. The critical vulnerabilities (rate limiting fail-open, service role key risk, absence of MFA) can be closed in weeks, not months. The compliance obligations (GDPR, DPAs) can be largely met through documentation and process before significant engineering work is needed. The enterprise trust signals (Cyber Essentials Plus, penetration test, SOC 2) are achievable within 12 months if the programme starts now.

The most important message to the executive team is this: **security is not a feature to be scheduled. It is a precondition for enterprise trust.** An enterprise customer who discovers that Lustre holds their clients' physical security access codes in plaintext, has no incident response plan, and has never been penetration tested will not sign. And they will not come back.

The cost of building this programme is real but bounded. The cost of not building it — a single breach, a GDPR enforcement action, a failed enterprise deal — is unbounded. The investment case is clear.

---

*CISO-ENT-001 — Lustre Security Plan — March 2026 — Draft for Executive Review*
*Companion documents: CTO-ENT-001 | OPS-ENT-001 | CFO-ENT-001 | CRM-ENT-001 | CPO-ENT-001*
