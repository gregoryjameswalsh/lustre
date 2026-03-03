# Lustre — Enterprise Operations Proposal
**Document Type:** Business Analyst Proposal
**Author:** Chief Operating Officer
**Date:** 2026-03-03
**Version:** 1.0
**Status:** Draft for Review

---

## Executive Summary

Lustre is a well-architected SaaS platform for cleaning businesses, built on modern, scalable foundations (Next.js, Supabase, Vercel). The current MVP demonstrates strong product-market fit with a clear multi-tenant model, role-based access control, and a solid quote-to-job workflow.

However, moving from MVP to enterprise-grade requires investment across **nine operational domains**. This document outlines the gaps, priorities, and proposed solutions for each, independent of the CRM strategy (covered separately by the CCO). The focus here is: *can the platform be trusted, operated, scaled, and supported at enterprise level?*

The answer today is "not yet" — but the technical foundations make it achievable without a re-architecture.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Infrastructure & Reliability](#2-infrastructure--reliability)
3. [Security & Compliance](#3-security--compliance)
4. [Identity, Access & Team Management](#4-identity-access--team-management)
5. [Billing & Subscription Management](#5-billing--subscription-management)
6. [Observability, Monitoring & Alerting](#6-observability-monitoring--alerting)
7. [Async Processing & Background Jobs](#7-async-processing--background-jobs)
8. [Testing, CI/CD & Release Management](#8-testing-cicd--release-management)
9. [Data Management, Portability & Compliance](#9-data-management-portability--compliance)
10. [Support Operations & SLA Management](#10-support-operations--sla-management)
11. [API Strategy & Integration Platform](#11-api-strategy--integration-platform)
12. [Priority Roadmap & Phasing](#12-priority-roadmap--phasing)
13. [Risk Register](#13-risk-register)
14. [Success Metrics](#14-success-metrics)

---

## 1. Current State Assessment

### What Exists (Strengths)

| Area | Current State | Assessment |
|------|--------------|------------|
| Multi-tenancy | Organisation-scoped RLS on all tables | Solid — minimal risk |
| Authentication | Supabase email/password, cookie sessions | Functional, needs hardening |
| Authorisation | Two roles: admin / team_member | Too coarse for enterprise |
| Rate limiting | Upstash Redis (optional, fail-open) | Fragile — needs to be mandatory |
| Audit logging | Admin-action audit table | Partial — only delete/update actions |
| Email delivery | Resend transactional API | Good for MVP scale |
| PDF generation | Serverless @react-pdf/renderer | Appropriate for current load |
| Error handling | Error boundary UI, console logging | Insufficient for production ops |
| Background jobs | None — all operations are synchronous | Major gap |
| Testing | ESLint only, no automated tests | Critical gap |
| CI/CD | Not configured | Critical gap |
| Monitoring | None | Critical gap |
| Billing/Stripe | DB column exists, no integration | Major gap |
| Data export | None | Compliance gap |
| Documentation | README is Next.js boilerplate | Major gap |

### Summary of Gaps

- **No observability** — the team is flying blind in production
- **No automated testing** — every deployment carries regression risk
- **No CI/CD** — manual deploys increase risk of broken builds reaching users
- **No background processing** — limits the product's operational capability
- **Billing is stubbed** — revenue collection is not automated
- **RBAC is too coarse** — enterprise buyers require granular permissions
- **Compliance is informal** — GDPR requirements not formally addressed
- **Support infrastructure is absent** — no ticketing, escalation, or SLA tracking

---

## 2. Infrastructure & Reliability

### 2.1 Problem Statement

The current stack (Vercel + Supabase) is managed-infrastructure, which is excellent for MVPs but introduces dependency risk and limits enterprise SLA guarantees. There is no disaster recovery plan, no defined uptime target, and no failover strategy.

### 2.2 Current Architecture

```
Users → Vercel Edge (Middleware) → Next.js Server Components → Supabase (PostgreSQL)
                                                            → Resend (Email)
                                                            → Upstash (Rate Limit)
```

### 2.3 Target Architecture (Enterprise)

```
Users → CDN/WAF (Vercel or Cloudflare) → Next.js App (multi-region)
                                       → Supabase (primary + read replicas)
                                       → Redis (mandatory rate limiting + cache)
                                       → Queue (Inngest / Trigger.dev)
                                       → Object Storage (logos, PDFs, attachments)
                                       → Resend (email, with fallback SMTP)
```

### 2.4 Proposed Changes

#### 2.4.1 Uptime SLA Definition

Define a formal uptime SLA for enterprise customers:

| Tier | Target Uptime | Maintenance Window | Credits |
|------|-------------|-------------------|---------|
| Starter | 99.5% | Unrestricted | None |
| Pro | 99.9% | Off-peak only | 10% credit per breach |
| Enterprise | 99.95% | Pre-announced | 25% credit per breach |

#### 2.4.2 Database Resilience

- **Enable Supabase read replicas** for dashboard queries to reduce write contention
- **Point-in-time recovery (PITR)** — enable in Supabase (currently available on Pro plan)
- **Automated daily backups** with 30-day retention minimum
- **Connection pooling** via Supabase's PgBouncer (already available, needs configuring explicitly)

#### 2.4.3 Rate Limiting — Make Mandatory

Current rate limiting fails open if Upstash is not configured. This is a security vulnerability at scale.

- Rate limiting must be a hard dependency — application should refuse to start without it
- Add circuit breaker: if Redis is unreachable for >30 seconds, alert and optionally engage static rate limiting at the edge (Vercel Edge middleware)
- Extend rate limiting to all API routes, not just auth and PDF endpoints

#### 2.4.4 File & Asset Storage

Logo URLs are currently stored as external strings (no validation, no lifecycle management). For enterprise:

- Implement Supabase Storage for organisation logos and any future file uploads
- Enforce file type validation (MIME type + magic bytes)
- Set maximum upload sizes per plan tier
- Apply CDN caching headers to static assets

#### 2.4.5 Multi-Region Strategy

- Vercel automatically deploys to the nearest region — no action required for standard users
- For enterprise SLA: deploy Supabase to the same region as the primary user base (currently unspecified)
- Document region selection in the enterprise onboarding playbook

---

## 3. Security & Compliance

### 3.1 Problem Statement

The MVP has solid security foundations (RLS, input validation, rate limiting, CSP headers). However, enterprise buyers — particularly those handling consumer data — will require formal compliance, stronger identity controls, and evidence of security posture.

### 3.2 Gaps Identified

| Gap | Severity | Impact |
|-----|----------|--------|
| No MFA/2FA support | High | Account takeover risk |
| No SSO/SAML/OIDC | High | Enterprise buyer blocker |
| Audit log is incomplete | High | Compliance/legal risk |
| No password reset UI | Medium | User experience / support burden |
| No session management UI | Medium | Users can't revoke active sessions |
| No data encryption field-level | Medium | Sensitive PII at rest risk |
| No security incident response plan | High | Regulatory requirement |
| Secrets rotation policy absent | Medium | Credential exposure risk |
| CSP allows `unsafe-inline` | Medium | XSS vector (development artifact) |
| No penetration test record | High | Enterprise procurement requirement |

### 3.3 Proposed Changes

#### 3.3.1 Multi-Factor Authentication (MFA)

- Implement TOTP-based MFA using Supabase's built-in MFA API
- Make MFA mandatory for `admin` role users (enforced in middleware)
- Provide recovery codes (minimum 8 single-use codes)
- Display MFA status in `/dashboard/settings` and in user profile

**UI Requirements:**
- MFA setup wizard in account settings
- Recovery code download screen (acknowledge + download gate)
- MFA prompt on each new session, with trusted-device option (30-day cookie)

#### 3.3.2 SSO / SAML / OIDC

Enterprise organisations manage identity centrally (Okta, Azure AD, Google Workspace). Lustre must support this.

- Supabase supports SSO via SAML 2.0 — enable for enterprise-tier organisations
- Each enterprise organisation configures their own IdP in a dedicated admin screen
- Implement "enforce SSO" toggle — prevents email/password login once SSO is active
- Map IdP groups to Lustre roles (admin / team_member) via SAML attribute claims

**Phasing:** SSO is an enterprise-tier unlock (Pro plan or above, or as add-on).

#### 3.3.3 Audit Log Expansion

Current audit log only captures: delete_client, delete_property, delete_job, delete_quote, update_vat_settings.

Expand to capture **all material actions**:

| Event Category | Events to Capture |
|---------------|-------------------|
| Authentication | login_success, login_failed, logout, password_changed, mfa_enabled, mfa_disabled, sso_login |
| User Management | user_invited, user_role_changed, user_removed |
| Data Events | client_created, client_updated, client_deleted, property_created/updated/deleted |
| Quote Events | quote_created, quote_sent, quote_accepted, quote_declined, quote_expired |
| Job Events | job_created, job_updated, job_status_changed, job_deleted |
| Billing Events | subscription_upgraded, subscription_cancelled, payment_failed |
| Settings | org_settings_updated, vat_settings_updated, sso_configured |
| Admin Actions | audit_log_exported, data_export_requested |

**Audit Log Requirements:**
- Immutable — no UPDATE or DELETE on audit_logs (enforce via RLS)
- Indexed on `organisation_id` + `created_at` for efficient querying
- Exportable as CSV from the admin settings screen
- Retained for minimum 12 months (rolling, with archive option)
- Viewable in-app with filtering by user, action type, and date range

#### 3.3.4 GDPR & Data Privacy

Lustre holds PII for cleaning business clients (end customers of the organisation). This triggers GDPR obligations:

- **Privacy Policy** — update to accurately describe data processing
- **Data Processing Agreement (DPA)** — template for enterprise customers (they are data controllers; Lustre is processor)
- **Right to Erasure** — implement "delete organisation data" flow that removes all org data within 30 days
- **Data Subject Access Requests (DSAR)** — admin-triggered export of all data related to a specific client record
- **Data Retention Policy** — configurable per plan; default 36 months after account cancellation
- **Cookie Consent** — audit current cookies; add consent banner if non-essential cookies are used
- **Sub-processor Disclosure** — list Supabase, Resend, Upstash, Stripe, Vercel in privacy policy

#### 3.3.5 Security Hardening

- Remove `unsafe-inline` from production CSP; use nonce-based CSP for Next.js
- Implement HTTP Strict Transport Security (HSTS) header (add to `next.config.ts`)
- Add `Expect-CT` header for certificate transparency
- Perform quarterly dependency audits (`npm audit` automated in CI)
- Establish a responsible disclosure / bug bounty programme (HackerOne or simple email policy)
- Arrange annual penetration test from accredited third party

---

## 4. Identity, Access & Team Management

### 4.1 Problem Statement

The current role model (admin / team_member) is binary and insufficient for enterprise organisations that need fine-grained control over who can see pricing, send quotes, delete records, or manage settings.

Additionally, there is no user invitation flow — new users must sign up independently and somehow be linked to the correct organisation (currently handled only via the trigger on signup, which creates a new org automatically). This means team members cannot currently join an existing organisation.

### 4.2 Critical Gap: No Invitation System

This is the **most operationally critical gap** in the product. Currently, an organisation can only have one user (the person who signed up). There is no mechanism for a second person to join the same organisation.

The `profiles.organisation_id` and `profiles.role` fields exist, and the RLS policies support multi-user organisations, but the user-facing flow and invitation mechanism are entirely absent.

### 4.3 Proposed Changes

#### 4.3.1 User Invitation Flow

- Admin generates invitation link (or emails directly) from `/dashboard/settings/team`
- Invitation stored in `invitations` table with: org_id, email, role, token (UUID), expires_at, accepted_at
- Invited user clicks link → `/invite/[token]` → creates account or signs in → linked to existing org
- Invitation link expires after 7 days (configurable)
- Admin can revoke pending invitations
- Invite-only mode: option to disable public signup for private/enterprise deployments

**New Table Required: `invitations`**
```
id, organisation_id, email, role, token, invited_by, expires_at, accepted_at, created_at
```

#### 4.3.2 Role Expansion (RBAC v2)

Replace binary roles with a structured permission model:

| Permission | Admin | Manager | Operative | Viewer |
|-----------|-------|---------|----------|--------|
| View clients | ✓ | ✓ | ✓ (own jobs only) | ✓ |
| Create/edit clients | ✓ | ✓ | ✗ | ✗ |
| Delete clients | ✓ | ✗ | ✗ | ✗ |
| View quotes | ✓ | ✓ | ✗ | ✓ |
| Create/send quotes | ✓ | ✓ | ✗ | ✗ |
| View pricing | ✓ | ✓ | ✗ | ✗ |
| Create/edit jobs | ✓ | ✓ | ✓ (own) | ✗ |
| Delete jobs | ✓ | ✗ | ✗ | ✗ |
| Manage team | ✓ | ✗ | ✗ | ✗ |
| Manage billing | ✓ | ✗ | ✗ | ✗ |
| View audit log | ✓ | ✓ | ✗ | ✗ |
| Configure settings | ✓ | ✗ | ✗ | ✗ |

**Implementation approach:**
- Extend `profiles.role` enum: `admin | manager | operative | viewer`
- Create a `permissions` helper in server actions that checks role before operations
- Update all RLS policies to reflect the new role hierarchy
- Migrate existing `team_member` → `operative` (conservative default)

#### 4.3.3 Team Management UI

New section: `/dashboard/settings/team`
- List all team members (name, email, role, last active, MFA status)
- Invite new member (email + role selector)
- Change member role (admin only)
- Remove member (admin only — soft remove, preserve audit trail)
- View pending invitations with revoke option
- Seat count display (linked to subscription plan limits)

#### 4.3.4 Seat-Based Plan Limits

| Plan | Max Team Members |
|------|-----------------|
| Free (trial) | 1 |
| Starter | 3 |
| Pro | 10 |
| Enterprise | Unlimited |

Enforce in middleware: invitation creation blocked if org is at seat limit.

---

## 5. Billing & Subscription Management

### 5.1 Problem Statement

The database schema has `stripe_customer_id`, `plan`, `subscription_status`, and `trial_ends_at` columns — but there is no Stripe integration. Revenue collection is entirely absent from the application. The middleware correctly gates access based on subscription status, but nothing sets or updates that status.

This is a **revenue-critical gap**.

### 5.2 Proposed Changes

#### 5.2.1 Stripe Integration

**Stripe Checkout Flow:**
1. User clicks "Upgrade" from billing page or upgrade prompt
2. Server action creates Stripe Checkout session via API
3. User redirected to Stripe-hosted checkout
4. On success: Stripe webhook fires `checkout.session.completed`
5. Webhook handler updates `organisations.plan`, `subscription_status`, `stripe_customer_id`
6. User redirected back to `/dashboard` with success toast

**Stripe Customer Portal:**
- "Manage Billing" button in settings → redirect to Stripe Customer Portal
- Handles: plan changes, payment method updates, invoice history, cancellation
- On cancellation: webhook fires → update `subscription_status` to `cancelled`

**Webhook Events to Handle:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Activate subscription, set plan |
| `customer.subscription.updated` | Sync plan + status changes |
| `customer.subscription.deleted` | Mark as cancelled |
| `invoice.payment_succeeded` | Log payment, extend access |
| `invoice.payment_failed` | Set status to `past_due`, trigger warning email |
| `customer.subscription.trial_will_end` | Send 3-day warning email |

**New API Route Required:** `/api/webhooks/stripe` (POST, verified via Stripe-Signature header)

#### 5.2.2 Pricing Page

- Public `/pricing` page (accessible without auth)
- Clearly display plan features and seat limits
- CTA: "Start Free Trial" (links to signup) / "Upgrade" (links to checkout)
- Annual vs monthly toggle with discount display

#### 5.2.3 In-App Billing UI

`/billing` page (currently used as a redirect for lapsed subscriptions):
- Current plan + status display
- Usage indicators (seats used / available, jobs this month, quotes sent)
- Trial countdown (days remaining)
- Upgrade / Manage / Reactivate CTAs
- Invoice history (pull from Stripe API)

#### 5.2.4 Plan Enforcement

Enforce plan limits in server actions (not just middleware):

| Feature | Free/Trial | Starter | Pro | Enterprise |
|---------|-----------|---------|-----|-----------|
| Clients | Unlimited | Unlimited | Unlimited | Unlimited |
| Jobs/month | 50 | 200 | Unlimited | Unlimited |
| Quotes/month | 10 | 50 | Unlimited | Unlimited |
| Team members | 1 | 3 | 10 | Unlimited |
| PDF downloads | 20/min | 50/min | 100/min | Custom |
| Logo upload | ✗ | ✓ | ✓ | ✓ |
| Custom email domain | ✗ | ✗ | ✓ | ✓ |
| SSO | ✗ | ✗ | ✗ | ✓ |
| API access | ✗ | ✗ | ✓ | ✓ |

---

## 6. Observability, Monitoring & Alerting

### 6.1 Problem Statement

There is currently **no production observability**. Errors are logged to the console in development and swallowed silently in production. The team has no visibility into:
- Application errors and their frequency
- Slow queries or API response times
- Failed email deliveries
- Failed payments
- User-facing errors

This means issues are only discovered when customers report them.

### 6.2 Proposed Stack

#### 6.2.1 Error Tracking — Sentry

- Integrate Sentry (`@sentry/nextjs`) for error tracking
- Capture: unhandled exceptions, server action failures, API route errors
- Configure source maps upload in CI for readable stack traces
- Set up Sentry alerts: >10 new errors in 5 minutes → Slack notification
- Identify user context (org_id, role) without PII (no email/name in Sentry)
- Separate Sentry environments: development, staging, production

**Priority Sentry Alerts:**
- PDF generation failures
- Email delivery failures
- Stripe webhook failures
- Database connection errors
- Rate limiter unavailability

#### 6.2.2 Performance Monitoring

- Vercel Analytics (built-in) — enable for Core Web Vitals and page-level performance
- Vercel Speed Insights — enable for real user monitoring (RUM)
- Supabase Dashboard — monitor slow queries (pg_stat_statements)
- Set alert threshold: any query >500ms P95 triggers investigation ticket

#### 6.2.3 Uptime Monitoring

- Deploy uptime check via **Checkly** or **Better Uptime**:
  - `GET /` — homepage (200 OK)
  - `GET /login` — auth page (200 OK)
  - `GET /q/[valid-token]` — public quote page (200 OK)
  - `POST /api/webhooks/stripe` — returns 200 for test ping
- Alert channels: Slack, PagerDuty (on-call for P0 incidents)
- Target: alert within 2 minutes of downtime

#### 6.2.4 Structured Logging

Replace ad-hoc `console.log` with a structured logger:

- Use **Pino** (lightweight, JSON output) or a Vercel-compatible logger
- Log levels: DEBUG (dev only), INFO, WARN, ERROR
- Log fields: `timestamp`, `level`, `trace_id`, `org_id`, `user_id` (hashed), `action`, `duration_ms`
- Ship logs to **Datadog**, **Axiom**, or **Vercel Log Drains**
- Never log PII (email, name, phone, address) in production logs

#### 6.2.5 Key Business Metrics Dashboard

Operational metrics for the COO (separate from product analytics):

- Daily active organisations
- Quotes created / sent / accepted (daily)
- Jobs scheduled / completed (daily)
- Email delivery rate (Resend webhook)
- PDF generation latency (P50, P95, P99)
- Stripe MRR, churn, trial conversions
- API error rate by route
- New signup → onboarding completion rate

**Tool:** Retool internal dashboard, Supabase Studio queries, or a lightweight BI tool (Metabase).

---

## 7. Async Processing & Background Jobs

### 7.1 Problem Statement

All operations in Lustre are currently synchronous. This means:
- Email sends block the HTTP request
- PDF generation ties up the serverless function slot
- There is no retry logic for failed operations
- Time-sensitive notifications (job reminders, follow-up alerts) cannot be scheduled

This limits the product's operational capability and creates reliability risk.

### 7.2 Recommended Solution: Inngest or Trigger.dev

Both Inngest and Trigger.dev integrate natively with Next.js and Vercel, providing durable job execution, retries, and scheduling without managing separate infrastructure.

**Recommended:** Inngest (simpler integration, generous free tier, good Vercel support)

### 7.3 Jobs to Implement

#### 7.3.1 Immediate Priority (MVP Async)

| Job | Trigger | Retry Policy |
|-----|---------|-------------|
| Send quote email | Quote status → "sent" | 3 attempts, 5min backoff |
| Send job confirmation email | Job status → "scheduled" | 3 attempts, 5min backoff |
| Track quote viewed event | Public page load with token | 2 attempts, immediate |
| Generate and cache PDF | Quote accessed | 1 attempt (regenerate on fail) |

#### 7.3.2 Scheduled Jobs (Cron)

| Job | Schedule | Description |
|-----|----------|-------------|
| Trial expiry warning | Daily 09:00 | Email orgs 3 days before trial ends |
| Follow-up due reminders | Daily 08:00 | Email assigned users with due follow-ups |
| Quote expiry check | Daily 06:00 | Mark quotes past `valid_until` as "expired" |
| Job reminder notifications | Daily 07:00 | Remind cleaners of tomorrow's jobs |
| Subscription status sync | Every 6 hours | Reconcile Stripe status → DB |
| Audit log archival | Weekly Sunday | Archive logs >12 months to cold storage |

#### 7.3.3 Event-Driven Jobs

| Event | Jobs Triggered |
|-------|---------------|
| Quote accepted | Create job, notify admin, send acceptance confirmation to client |
| Job completed | Request review email (optional, org-configurable) |
| Payment failed | Send dunning email sequence (day 1, day 3, day 7) |
| New user invited | Send invitation email |
| Org trial started | Send onboarding email sequence (day 0, day 3, day 7) |

---

## 8. Testing, CI/CD & Release Management

### 8.1 Problem Statement

There are no automated tests. Every code change is deployed without validation. This is acceptable for a prototype but is an existential risk for a production system holding real business data.

### 8.2 Testing Strategy

#### 8.2.1 Unit Tests — Vitest

Test pure functions in isolation:
- VAT calculation logic
- Quote number generation
- Currency formatting helpers
- Date formatting utilities
- Input sanitisation functions
- Role permission checks

**Target coverage:** 80% of `/src/lib/` utilities

#### 8.2.2 Integration Tests — Vitest + Supabase Test Client

Test server actions against a real test database:
- Create/read/update/delete for each entity (clients, jobs, quotes)
- RLS policy validation (user A cannot read user B's data)
- Invitation flow (invite → accept → role granted)
- Rate limiting behaviour (mock Redis)

**Approach:** Use Supabase's local development stack (`supabase start`) for test isolation

#### 8.2.3 End-to-End Tests — Playwright

Test critical user journeys in a real browser:
- Signup → onboarding → dashboard
- Create client → create quote → send quote → accept quote → verify job created
- Quote PDF download
- Admin deletes client → appears in audit log
- Billing upgrade flow (Stripe test mode)

**Priority journeys (must be green before release):**
1. Signup and onboarding
2. Quote creation and sending
3. Quote acceptance and job creation
4. PDF generation and download

#### 8.2.4 Security Tests

- Automated OWASP ZAP scan in CI (weekly)
- Dependency vulnerability scan (`npm audit`) on every PR
- CSP validation test (ensure no `unsafe-inline` in production build)

### 8.3 CI/CD Pipeline

**Recommended:** GitHub Actions

```
PR opened/updated
    ├── Lint (ESLint + TypeScript)
    ├── Unit + Integration tests (Vitest)
    ├── Build check (next build)
    └── Security scan (npm audit)

PR merged to main
    ├── All of the above
    ├── Deploy to staging (Vercel Preview)
    ├── E2E tests against staging (Playwright)
    └── If all green → promote to production (Vercel production deploy)
```

### 8.4 Release Management

- **Trunk-based development** — short-lived feature branches, merge to `main` frequently
- **Feature flags** (via environment variables or a service like LaunchDarkly) for in-progress features
- **Semantic versioning** — tag releases (`v1.2.3`) in GitHub
- **Changelog** — maintained in `CHANGELOG.md`, auto-generated from conventional commits
- **Release freeze** — no deployments Friday 17:00 → Monday 09:00 without P0 approval
- **Rollback plan** — Vercel instant rollback to previous deployment (document the procedure)

---

## 9. Data Management, Portability & Compliance

### 9.1 Problem Statement

Enterprise customers need confidence that their data is safe, portable, and managed according to their contractual obligations. Currently there is no data export capability, no retention policy, and no formal backup and recovery procedure.

### 9.2 Proposed Changes

#### 9.2.1 Data Export

Implement a "Export My Data" feature in organisation settings:

**Export scope:**
- Clients (CSV)
- Properties (CSV)
- Jobs (CSV)
- Quotes (CSV + line items)
- Activities (CSV)
- Invoices/payments (CSV, from Stripe)
- Audit logs (CSV)

**Export flow:**
1. Admin requests export from settings
2. Background job assembles ZIP archive
3. Signed download URL emailed to admin (valid 24 hours)
4. Export request logged in audit trail

**Format:** CSV (primary), with JSON option for technical users.

#### 9.2.2 Data Retention Policy

| Data Type | Retention Period | Action on Expiry |
|-----------|-----------------|-----------------|
| Active org data | Indefinite while subscribed | N/A |
| Cancelled org data | 90 days post-cancellation | Soft-delete, then hard-delete |
| Audit logs | 12 months rolling | Archive to cold storage |
| Deleted client records | 30 days | Permanent deletion |
| PDF cache | 7 days | Auto-expire in storage |
| Session tokens | 7 days | Supabase-managed |
| Invitation tokens | 7 days | Cron job cleanup |

#### 9.2.3 Backup & Recovery

- **Supabase PITR** — enable on Pro plan (7-day point-in-time recovery)
- **Daily logical backup** — pg_dump to encrypted S3 bucket (30-day retention)
- **Recovery Time Objective (RTO):** <4 hours for full database restore
- **Recovery Point Objective (RPO):** <1 hour data loss maximum
- **Test restores:** monthly automated restore test to verify backup integrity
- Document the full restore runbook in the internal ops wiki

#### 9.2.4 Account Deletion

- Self-serve "Delete Account" option in settings (admin only)
- Requires: email confirmation, typed org name confirmation
- Triggers: 30-day deletion schedule (reversible within 30 days)
- On deletion: all org data soft-deleted, Stripe subscription cancelled, user notified
- After 30 days: hard delete all tables, purge from Supabase Auth
- Audit event logged: `organisation_deletion_requested`, `organisation_hard_deleted`

---

## 10. Support Operations & SLA Management

### 10.1 Problem Statement

There is no support infrastructure. When customers have problems, there is no ticket, no escalation path, no tracking, and no measurable response time.

### 10.2 Proposed Changes

#### 10.2.1 In-App Support Widget

- Integrate **Intercom**, **Crisp**, or **HelpScout** for live chat + help desk
- Widget visible in dashboard (bottom-right, dismissible)
- Pre-populate context: org_id, plan, user role (do not send PII by default)
- Escalation path: widget → support queue → email → phone (enterprise only)

#### 10.2.2 Help Centre

- Self-service documentation hosted at `help.simplylustre.com` (or `/help`)
- **Priority articles for launch:**
  - Getting started / onboarding walkthrough
  - How to create and send a quote
  - How to accept/decline quotes (for the end client)
  - How to schedule a job
  - How to add a team member
  - Billing and subscription management
  - Data export and account deletion
  - Security and privacy FAQ
- Search-indexed, version-controlled

#### 10.2.3 SLA Tiers

| Tier | Response Time (P1) | Response Time (P2) | Resolution Target |
|------|-------------------|--------------------|-----------------|
| Free/Trial | 72 hours (email only) | Best effort | Best effort |
| Starter | 24 hours | 48 hours | 5 business days |
| Pro | 8 hours | 24 hours | 2 business days |
| Enterprise | 2 hours | 8 hours | 1 business day + SLA credit |

**Priority definitions:**
- **P1 (Critical):** Production down, data loss risk, security incident
- **P2 (High):** Major feature broken, blocking business operation
- **P3 (Medium):** Feature degraded, workaround exists
- **P4 (Low):** UI issue, enhancement request, question

#### 10.2.4 Incident Management

- **On-call rotation:** minimum 2 people with PagerDuty escalation
- **Incident runbook:** documented steps for top-10 probable failures
- **Status page:** public status page at `status.simplylustre.com` (Instatus or Betterstack)
- **Post-mortems:** blameless post-mortem required for any P1 incident within 5 business days
- **Communication template:** standardised customer communication for incidents

---

## 11. API Strategy & Integration Platform

### 11.1 Problem Statement

Enterprise customers often require programmatic access to integrate Lustre with their existing business systems (accounting software, scheduling tools, franchise management platforms). Currently, there is no public API.

### 11.2 Proposed Changes

#### 11.2.1 Public REST API

Expose a versioned REST API for enterprise tier:

**Endpoint structure:** `/api/v1/[resource]`

**Priority endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/clients` | List clients (paginated) |
| POST | `/api/v1/clients` | Create client |
| GET | `/api/v1/clients/:id` | Get client |
| PUT | `/api/v1/clients/:id` | Update client |
| GET | `/api/v1/jobs` | List jobs (paginated, filterable) |
| POST | `/api/v1/jobs` | Create job |
| GET | `/api/v1/jobs/:id` | Get job |
| PUT | `/api/v1/jobs/:id/status` | Update job status |
| GET | `/api/v1/quotes` | List quotes |
| POST | `/api/v1/quotes` | Create quote |
| GET | `/api/v1/quotes/:id` | Get quote |

**API Authentication:**
- API key authentication (Bearer token in header)
- Keys generated per organisation, managed in settings
- Keys have scopes: `read:clients`, `write:clients`, `read:jobs`, `write:jobs`, etc.
- Keys can be rotated and revoked
- Rate limit: 1000 req/hour per API key (enterprise: configurable)

**API Standards:**
- JSON:API or standard REST (recommend standard REST for simplicity)
- Consistent error format: `{ error: { code, message, details } }`
- Pagination via cursor (not offset)
- Versioning: URL path (`/api/v1/`) for major versions
- OpenAPI 3.0 spec published at `/api/v1/openapi.json`

#### 11.2.2 Webhooks

Allow organisations to subscribe to events via outbound webhooks:

| Event | Payload |
|-------|---------|
| `quote.sent` | Quote data + client |
| `quote.accepted` | Quote + client + new job |
| `quote.declined` | Quote + client |
| `job.created` | Job data |
| `job.status_changed` | Job + old/new status |
| `client.created` | Client data |

**Webhook delivery:**
- HTTPS POST to configured endpoint
- Signed with HMAC-SHA256 (secret per subscription)
- 3 retry attempts with exponential backoff
- Delivery log in admin settings (last 100 events, success/failure, response code)

#### 11.2.3 Native Integrations (Phase 2)

Priority integrations for enterprise:
- **Xero / QuickBooks** — sync invoices from accepted quotes
- **Google Calendar / Outlook** — sync scheduled jobs
- **Zapier / Make** — no-code automation connector
- **Slack** — job and quote notifications in team channels

---

## 12. Priority Roadmap & Phasing

### Phase 1 — Operational Foundation (Months 1–2)
*"Make it safe to run in production"*

| Priority | Item | Effort | Owner |
|----------|------|--------|-------|
| P0 | User invitation system | L | Engineering |
| P0 | Stripe billing integration | L | Engineering |
| P0 | Sentry error tracking | S | Engineering |
| P0 | CI/CD pipeline (GitHub Actions) | M | Engineering/DevOps |
| P0 | Uptime monitoring (Checkly) | S | DevOps |
| P1 | Make rate limiting mandatory | S | Engineering |
| P1 | Audit log expansion | M | Engineering |
| P1 | Structured logging (Pino) | M | Engineering |
| P1 | Unit test suite (Vitest) | M | Engineering |
| P1 | PITR + backup configuration | S | DevOps |

### Phase 2 — Security & Compliance (Months 2–3)
*"Make it trustworthy for business customers"*

| Priority | Item | Effort | Owner |
|----------|------|--------|-------|
| P0 | MFA/2FA implementation | M | Engineering |
| P0 | GDPR data export | M | Engineering |
| P0 | Data retention policy + account deletion | M | Engineering |
| P1 | RBAC expansion (4 roles) | L | Engineering |
| P1 | Password reset UI | S | Engineering |
| P1 | Privacy policy + DPA template | S | Legal/COO |
| P1 | E2E test suite (Playwright) | L | Engineering |
| P2 | Help centre (initial 8 articles) | M | Product/COO |
| P2 | CSP nonce-based hardening | M | Engineering |

### Phase 3 — Enterprise Enablement (Months 3–5)
*"Make it sellable to enterprise"*

| Priority | Item | Effort | Owner |
|----------|------|--------|-------|
| P0 | SSO/SAML integration | L | Engineering |
| P0 | Public REST API (v1) | L | Engineering |
| P0 | Async job queue (Inngest) | L | Engineering |
| P1 | Webhook system | M | Engineering |
| P1 | Scheduled jobs (reminders, expiry) | M | Engineering |
| P1 | In-app support widget | S | Product/COO |
| P1 | Status page | S | DevOps |
| P1 | Penetration test | M | Security/COO |
| P2 | API key management UI | M | Engineering |
| P2 | Supabase Storage for logos | M | Engineering |

### Phase 4 — Scale & Polish (Months 5–8)
*"Make it operate at scale"*

| Priority | Item | Effort | Owner |
|----------|------|--------|-------|
| P1 | Xero/QuickBooks integration | XL | Engineering |
| P1 | Google Calendar sync | L | Engineering |
| P1 | Zapier connector | M | Engineering |
| P1 | Business metrics dashboard (internal) | M | Engineering/COO |
| P2 | Read replicas (Supabase) | M | DevOps |
| P2 | Audit log archival | M | Engineering |
| P2 | Multi-region strategy | L | DevOps |

**Effort key:** S = 1–3 days, M = 3–10 days, L = 10–20 days, XL = 20+ days

---

## 13. Risk Register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|-----------|
| R1 | Billing never integrated → zero revenue | High | Critical | P0 priority Phase 1 |
| R2 | Multi-user orgs impossible → churn | High | Critical | P0 priority Phase 1 (invitations) |
| R3 | Production error goes undetected | High | High | Sentry + uptime monitoring Phase 1 |
| R4 | Stripe webhook failure → access not revoked | Medium | High | Webhook handler + reconciliation job |
| R5 | GDPR breach from absent deletion flow | Medium | Critical | Phase 2 — account deletion flow |
| R6 | Enterprise prospect blocked on SSO | Medium | High | Phase 3 — SSO |
| R7 | Rate limit Redis outage → brute force | Low | High | Make rate limiting mandatory Phase 1 |
| R8 | Database grows unbounded without retention | Low | Medium | Phase 2 — retention policy |
| R9 | Unpatched dependency vulnerability | Medium | High | npm audit in CI Phase 1 |
| R10 | Key staff unavailability during incident | Low | High | On-call rotation, runbooks Phase 3 |
| R11 | Email deliverability degradation | Medium | Medium | Resend monitoring, fallback SMTP |
| R12 | PDF generation at scale (memory/timeout) | Low | Medium | Async queue Phase 3 |

---

## 14. Success Metrics

### Operational Health KPIs (monthly reporting)

| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|---------------|---------------|
| Uptime (monthly) | Unknown | 99.5% | 99.9% |
| Mean Time to Detection (MTTD) | ∞ | <15 min | <5 min |
| Mean Time to Resolution (MTTR) | ∞ | <4 hours | <2 hours |
| Deployment frequency | Ad-hoc | Daily | Multiple/day |
| Change failure rate | Unknown | <10% | <5% |
| Test coverage | 0% | 40% | 80% |
| CI/CD pipeline pass rate | N/A | >90% | >95% |
| P1 support SLA compliance | N/A | 80% | 95% |
| Trial → paid conversion | Unknown | Baseline | +20% |
| MRR (Stripe) | £0 (unbilled) | Live | Growing |

### Security KPIs

| Metric | Target |
|--------|--------|
| MFA adoption (admin users) | 100% by end of Phase 2 |
| Time to patch critical CVEs | <24 hours |
| Annual pen test | Completed by end of Phase 3 |
| GDPR data requests fulfilled | 100% within 30 days |
| Audit log coverage | 100% of material actions |

---

## Appendix A — Technology Recommendations

| Need | Recommended Tool | Alternatives | Rationale |
|------|-----------------|-------------|-----------|
| Error tracking | Sentry | Rollbar, Bugsnag | Native Next.js SDK, generous free tier |
| Uptime monitoring | Checkly | Better Uptime, Pingdom | Supports API checks, Playwright E2E |
| Log management | Axiom | Datadog, Logtail | Vercel-native integration, cost-effective |
| Job queue | Inngest | Trigger.dev, Quirrel | Native Next.js, durable execution, free tier |
| E2E testing | Playwright | Cypress, Selenium | MS-supported, fast, excellent Next.js support |
| Unit testing | Vitest | Jest | Native ESM, fast, good TypeScript support |
| CI/CD | GitHub Actions | CircleCI, Buildkite | Native GitHub integration, free for public/small private |
| Status page | Betterstack | Instatus, Statuspage | Cost-effective, incident management included |
| Support | Intercom | Crisp, HelpScout | Best-in-class UX, knowledge base included |
| Feature flags | Vercel Flags | LaunchDarkly, Growthbook | Native Vercel integration, no extra infra |

---

## Appendix B — Open Questions for Stakeholders

1. **Target enterprise segment:** What size cleaning businesses are we targeting? (sole traders, 5–20 staff, franchise networks?) This drives RBAC complexity and API investment priority.

2. **Geographic compliance scope:** Is this UK-only (GDPR/UK GDPR), or are we planning EU/US expansion? (Affects data residency, compliance frameworks)

3. **SLA commitments:** Are we making any contractual SLA commitments to current customers? If yes, we need monitoring in place before those commitments.

4. **Security certifications:** Is SOC 2 Type II required for target enterprise segment? If yes, this adds 6–12 months of compliance work and should be scoped separately.

5. **White-labelling:** Is there appetite to offer white-label (custom domain, custom branding) for franchise groups? This affects the branding and email architecture significantly.

6. **On-call commitment:** Who is currently on-call for production incidents? Is there budget for a dedicated DevOps/SRE resource, or will this be developer on-call?

7. **Billing model decision:** Confirm seat-based vs usage-based vs flat-rate pricing — this affects the plan enforcement implementation significantly.

---

*Document prepared by the Office of the COO. For questions or amendments, raise a GitHub Discussion or contact the COO directly. This document should be reviewed quarterly and updated as the product evolves.*
