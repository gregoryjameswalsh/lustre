# BA Report: Billing & Revenue Infrastructure
## Lustre — CRM & Operations Platform for Cleaning & Property Maintenance Services

**Document Type:** Business Analyst Requirements Report
**Prepared by:** Solutions Architect (with CFO & COO input)
**Reference:** CFO-ENT-001 §5 — Billing & Revenue Infrastructure
**Version:** 1.0
**Date:** 10 March 2026
**Status:** Draft for Stakeholder Review

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Scope of This Report](#3-scope-of-this-report)
4. [Epics & User Stories](#4-epics--user-stories)
   - 4.1 [Epic 1 — Stripe Subscription Activation & Plan Enforcement](#41-epic-1--stripe-subscription-activation--plan-enforcement)
   - 4.2 [Epic 2 — Trial Conversion Flow](#42-epic-2--trial-conversion-flow)
   - 4.3 [Epic 3 — Invoice Management System](#43-epic-3--invoice-management-system)
   - 4.4 [Epic 4 — Invoice Payments via Stripe](#44-epic-4--invoice-payments-via-stripe)
   - 4.5 [Epic 5 — Dunning & Collections Management](#45-epic-5--dunning--collections-management)
   - 4.6 [Epic 6 — Basic Revenue Dashboard (MRR/ARR)](#46-epic-6--basic-revenue-dashboard-mrrarr)
5. [Data Model](#5-data-model)
6. [Integration Requirements](#6-integration-requirements)
7. [UI/UX Page Inventory](#7-uiux-page-inventory)
8. [Non-Functional Requirements](#8-non-functional-requirements)
9. [Acceptance Criteria](#9-acceptance-criteria)
10. [Implementation Plan & Effort Estimates](#10-implementation-plan--effort-estimates)
11. [Out of Scope (Phase 2+)](#11-out-of-scope-phase-2)
12. [Dependencies & Risks](#12-dependencies--risks)

---

## 1. Executive Summary

### 1.1 Business Context

Lustre is a field service CRM serving cleaning and property maintenance businesses. The platform has delivered a solid operational core: client management, job scheduling, quote lifecycle, and team management are all functional. A partial Stripe billing integration was delivered in Week 1 (3 March 2026), establishing the checkout flow and webhook handler.

However, Lustre currently collects **£0 in platform subscription revenue**, generates **no invoices** for its customers' clients, and provides **no financial reporting** to either Lustre's internal team or to the cleaning businesses using the platform. This is not a minor gap — it is an existential blocker for:

- **Enterprise sales:** Buyers require invoicing, audit trails, and financial transparency.
- **Investor credibility:** SaaS health metrics (MRR, ARR, churn, NRR) are required for any fundraising conversation.
- **Business scalability:** Without automated billing, revenue collection depends entirely on manual processes that do not scale.

### 1.2 Problem Statement

The current billing and revenue state has five critical gaps:

1. **Stripe billing infrastructure is code-complete but not activated** — environment variables are not set, no Stripe Products or Prices have been created, and no organisation has been billed.
2. **Plan limits are not enforced** — any user on any plan can access all features and create unlimited records, making the tier architecture commercially meaningless.
3. **Trial conversion is entirely manual** — there is no automated nudge, upgrade prompt, or conversion flow when a trial approaches expiry.
4. **No invoice system exists** — the quote-to-cash pipeline terminates at quote acceptance. There is no invoice table, no invoice generation, no PDF output, and no payment collection for the cleaning businesses' own client billing.
5. **No financial reporting exists** — neither Lustre's internal team nor any customer organisation can see revenue, outstanding balances, MRR, or any financial metric.

### 1.3 Proposed Solution

This report defines the Phase 1 implementation scope to resolve all five critical gaps:

- **Activate and harden** the existing Stripe subscription billing infrastructure with plan enforcement and trial conversion automation.
- **Build an invoice management system** that covers the full quote-to-cash pipeline: invoice generation from accepted quotes, UK-compliant PDF output, Stripe Payment Link delivery, and webhook-driven payment reconciliation.
- **Implement dunning management** for both Lustre subscription billing and customer invoice collections.
- **Deliver a basic internal revenue dashboard** showing MRR, ARR, and subscription status.

### 1.4 Expected Business Value

| Outcome | Measurable Impact |
|---------|-----------------|
| Subscription revenue collected | Every pound of Starter/Professional/Business subscription revenue is automated |
| Invoice system live | Cleaning businesses can bill their clients inside Lustre — a competitive parity requirement |
| Plan enforcement active | Tier differentiation is commercially meaningful; upsell pressure is created naturally |
| Trial conversion flow | Target ≥25% trial-to-paid conversion (industry benchmark: 15–20%) |
| Dunning management | Reduces involuntary churn by 20–40% (industry average for SaaS without dunning) |
| Revenue dashboard | CFO and founding team can track MRR, ARR, and subscription health in real time |

---

## 2. Current State Assessment

### 2.1 What Is Already Built

The Week 1 Stripe delivery (3 March 2026) established the following, all of which are code-complete and present in the repository:

| Component | File/Location | Status |
|-----------|--------------|--------|
| Stripe SDK singleton | `src/lib/stripe/index.ts` | ✅ Complete |
| Plan configuration (Starter/Pro/Business) | `src/lib/stripe/plans.ts` | ✅ Complete |
| Checkout session API route | `src/app/api/billing/checkout/route.ts` | ✅ Complete |
| Customer Portal session API route | `src/app/api/billing/portal/route.ts` | ✅ Complete |
| Stripe webhook handler (6 event types) | `src/app/api/webhooks/stripe/route.ts` | ✅ Complete |
| Plan picker page (`/billing`) | `src/app/billing/page.tsx` | ✅ Complete |
| Billing settings page (`/dashboard/settings/billing`) | `src/app/dashboard/settings/billing/page.tsx` | ✅ Complete |
| DB migration: `stripe_subscription_id`, `stripe_price_id` | `20260303000002_billing_schema.sql` | ✅ Complete |
| DB migration: subscription period end fields | `20260304000001_subscription_period_end.sql` | ✅ Complete |
| SECURITY DEFINER RPC functions for webhook writes | `20260304000000_billing_webhook_functions.sql` | ✅ Complete |

**Webhook events already handled:**
- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_succeeded`
- `invoice.payment_failed`

### 2.2 What Is Not Yet Built

| Gap | Impact | Priority |
|-----|--------|----------|
| Stripe env vars not set — no active subscriptions | Zero revenue collected | 🔴 Critical (pre-requisite) |
| Plan enforcement not implemented | Tier model is not commercially enforced | 🔴 Critical |
| No trial conversion automation | Manual process; conversion likely near 0% | 🔴 Critical |
| No invoice table or invoice generation | Quote-to-cash pipeline is broken | 🔴 Critical |
| No UK-compliant invoice PDF | HMRC non-compliance at scale | 🔴 Critical |
| No Stripe Payment Link on invoices | No payment collection for customers' clients | 🔴 Critical |
| No dunning email sequences | 20–40% involuntary churn risk | 🟠 High |
| No revenue dashboard | No MRR/ARR visibility | 🟠 High |
| Invoice webhook reconciliation not implemented | Payments not auto-reflected in invoice status | 🔴 Critical |

### 2.3 Existing Database Schema (Relevant Fields)

**`organisations` table — billing fields already in schema:**
```
plan                              TEXT     -- 'free' | 'starter' | 'professional' | 'business' | 'enterprise'
subscription_status               TEXT     -- 'active' | 'trialing' | 'past_due' | 'cancelled'
stripe_customer_id                TEXT
stripe_subscription_id            TEXT
stripe_price_id                   TEXT
trial_ends_at                     TIMESTAMPTZ
subscription_current_period_end   TIMESTAMPTZ
subscription_cancel_at_period_end BOOLEAN
vat_registered                    BOOLEAN
vat_rate                          NUMERIC
vat_number                        TEXT
```

**`quotes` table — financial fields already in schema:**
```
pricing_type     TEXT     -- 'fixed' | 'itemised'
fixed_price      NUMERIC
subtotal         NUMERIC
tax_rate         NUMERIC
tax_amount       NUMERIC
total            NUMERIC
valid_until      DATE
status           TEXT     -- 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
responded_at     TIMESTAMPTZ
```

**`jobs` table:**
```
price            NUMERIC
duration_hours   NUMERIC
```

**What is missing from the schema:**
- `invoices` table (does not exist)
- `invoice_line_items` table (does not exist)
- `mrr_snapshots` table (does not exist)
- `plan_limits` configuration (implicit in code, not enforced)

---

## 3. Scope of This Report

This report covers **Phase 1 — Financial Foundation** as defined in CFO-ENT-001 §9.1. The scope is deliberately limited to what is necessary to:

1. Begin collecting subscription revenue (activating what is already built).
2. Close the quote-to-cash gap (invoice system + payment collection).
3. Create minimum viable financial visibility (MRR/ARR dashboard).
4. Protect against involuntary churn (dunning).

**In scope for this report (Phase 1):**

| Epic | Description | Est. Dev Days |
|------|-------------|--------------|
| Epic 1 | Stripe subscription activation + plan enforcement | 8 days |
| Epic 2 | Trial conversion flow | 2 days |
| Epic 3 | Invoice management system (data model + UI + PDF) | 11 days |
| Epic 4 | Invoice payments via Stripe Payment Links | 5 days |
| Epic 5 | Dunning & collections management | 3 days |
| Epic 6 | Basic revenue dashboard (MRR/ARR) | 6 days |
| **Total** | | **~35 days** |

**Out of scope for this report (Phase 2+):**
- Customer-facing revenue analytics (`/dashboard/analytics`)
- Xero/QuickBooks accounting integration
- Stripe Connect for customer payment processing
- Cohort analysis and unit economics dashboards
- Multi-year contract management
- Custom report builder

---

## 4. Epics & User Stories

### 4.1 Epic 1 — Stripe Subscription Activation & Plan Enforcement

**Epic Goal:** The Stripe billing infrastructure that was built in Week 1 must be activated and plan limits must be enforced. Until this is done, Lustre collects no subscription revenue.

#### 4.1.1 Activation Checklist (Pre-Development)

These are one-time configuration steps, not development tasks, but they must be completed before any billing testing is possible:

- [ ] Create Products and Prices in Stripe Dashboard (test mode, then live)
- [ ] Set environment variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- [ ] Set price ID environment variables for all 6 prices (3 plans × monthly/annual)
- [ ] Register webhook endpoint in Stripe Dashboard: `https://app.lustre.app/api/webhooks/stripe`
- [ ] Enable Stripe Tax (UK VAT 20%) in Stripe Dashboard → Tax settings
- [ ] Run `npm run db:push` to ensure migrations `20260303000002` and `20260304000001` are applied

#### 4.1.2 User Stories — Plan Enforcement

**US-BE-101:** As an organisation on the Starter plan, I should be limited to 3 user seats so that I cannot add a 4th user without upgrading.

**US-BE-102:** As an organisation on the Professional plan, I should be limited to 15 user seats so that I must upgrade to Business to add a 16th user.

**US-BE-103:** As an organisation on the Free/Trial plan, I should see clear messaging that certain features are plan-restricted, with a CTA to upgrade.

**US-BE-104:** As a Lustre admin (internal), I need plan limits to be enforced server-side, not just in the UI, so that API calls cannot bypass seat limits.

**US-BE-105:** As any user approaching their plan limit, I should see an in-app notification (banner or modal) prompting me to upgrade before I hit the limit.

#### 4.1.3 Plan Limits Definition

| Limit | Free/Trial | Starter | Professional | Business | Enterprise |
|-------|-----------|---------|--------------|----------|------------|
| Seats | 3 | 3 | 15 | 50 | Unlimited |
| Clients | 10 | Unlimited | Unlimited | Unlimited | Unlimited |
| Active jobs | 20 | Unlimited | Unlimited | Unlimited | Unlimited |
| Quotes/month | 5 | Unlimited | Unlimited | Unlimited | Unlimited |
| Custom fields | ❌ | ❌ | ✅ | ✅ | ✅ |
| Report builder | ❌ | ❌ | ❌ | ✅ | ✅ |
| API access | ❌ | ❌ | ❌ | ✅ | ✅ |

> **Implementation note:** Plan limits should be defined in a central configuration (e.g. `src/lib/plan-limits.ts`) and enforced via server-side checks in the relevant API routes and Supabase RLS functions. Do not rely solely on UI gating.

---

### 4.2 Epic 2 — Trial Conversion Flow

**Epic Goal:** Automate the conversion journey from trial to paid subscription. Currently there is no automated communication or in-app nudge when a trial is approaching expiry.

#### 4.2.1 User Stories

**US-BE-201:** As a trial user with 7 days remaining, I should receive an email reminding me that my trial ends in 7 days, including a direct link to the upgrade page.

**US-BE-202:** As a trial user with 3 days remaining, I should receive a second email with social proof (e.g. customer quote or feature highlight) and the upgrade CTA.

**US-BE-203:** As a trial user with 1 day remaining, I should receive a final warning email with a clear urgency message and upgrade CTA.

**US-BE-204:** As a trial user within 3 days of expiry, I should see a persistent in-app banner on every page showing my remaining trial time and an upgrade CTA.

**US-BE-205:** As a trial user whose trial has expired, I should be redirected to an upgrade paywall rather than being able to use the product — with a clear message explaining that the trial has ended.

**US-BE-206:** As a trial user who upgrades during the trial period, I should have my trial cancelled and my paid subscription activated immediately, with no double-charging.

#### 4.2.2 Trial Expiry Logic

```
Trial active (subscription_status = 'trialing', trial_ends_at > now()):
  → Day 0 of trial: Welcome email (already exists or needs creating)
  → trial_ends_at - 7 days: Email 1 — "7 days left"
  → trial_ends_at - 3 days: Email 2 — "3 days left" + feature highlight
  → trial_ends_at - 1 day:  Email 3 — "Last chance" urgency email
  → trial_ends_at passed:   Stripe automatically transitions to cancelled
                             → Supabase: subscription_status = 'cancelled'
                             → App: redirect to /billing paywall
```

> **Note:** Trial email sequences should be implemented as scheduled jobs using the existing `pg_cron` / Supabase Edge Function infrastructure (see migration `20260306000002_trial_emails.sql` for the existing trial email scaffold). The in-app banner and paywall redirect are Next.js middleware / layout-level checks against `subscription_status` and `trial_ends_at`.

---

### 4.3 Epic 3 — Invoice Management System

**Epic Goal:** Build a formal invoice system that closes the quote-to-cash gap. When a quote is accepted, an invoice should be automatically generated. The invoice must meet UK HMRC compliance requirements and be deliverable to the client as a PDF.

#### 4.3.1 User Stories — Invoice Generation

**US-BE-301:** As an organisation admin, when a quote is accepted (status changes to `accepted`), an invoice should be automatically created in `draft` status, pre-populated from the quote's line items, totals, and client details.

**US-BE-302:** As an organisation admin, I should be able to review and edit a draft invoice before sending it, including adjusting line items, due date, and adding notes.

**US-BE-303:** As an organisation admin, I should be able to manually create an invoice from scratch (not from a quote), for ad-hoc billing.

**US-BE-304:** As an organisation admin, I should be able to create an invoice directly from a completed job, pulling through the job's price and service details.

**US-BE-305:** As an organisation admin, I should be able to send an invoice to a client via email, which delivers a link to a hosted invoice page and attaches the PDF.

**US-BE-306:** As an organisation admin, I should be able to see a list of all invoices with filtering by status (`draft`, `sent`, `paid`, `overdue`, `void`), client, and date range.

**US-BE-307:** As an organisation admin, I should be able to void an invoice with a mandatory reason field, for audit purposes.

**US-BE-308:** As an organisation admin, I should be able to issue a credit note against a paid invoice, recording the refund amount and reason.

#### 4.3.2 User Stories — UK-Compliant Invoice PDF

**US-BE-309:** As an organisation admin, when I generate or send an invoice, the system should produce a PDF that complies with UK HMRC invoicing requirements, including:
  - Unique, sequential invoice number (format: `INV-YYYY-NNNN`)
  - Seller's name, address, and contact details (from organisation profile)
  - Buyer's name and address (from client record)
  - Invoice date and supply date
  - Description of each service/item
  - Subtotal excluding VAT
  - VAT rate and VAT amount (if organisation is VAT-registered)
  - Total amount including VAT
  - VAT registration number (if VAT-registered)
  - Payment terms and due date

**US-BE-310:** As a client receiving an invoice email, I should be able to click a link and view the invoice on a public-facing hosted page (similar to the existing public quote page pattern), without needing to log in.

#### 4.3.3 User Stories — Invoice Numbering

**US-BE-311:** Invoice numbers must be sequential per organisation, in the format `INV-YYYY-NNNN` (e.g. `INV-2026-0001`). The sequence must reset at the start of each calendar year. Numbers must never be reused, even for voided invoices.

#### 4.3.4 Invoice Status Workflow

```
Draft ──► Sent ──► Viewed ──► Paid
              │              ▲
              │   Overdue ───┘ (auto, when due_date passes and status ≠ paid)
              │
              └──► Void (manual, admin only, with reason required)
                    └──► Credit Note (issued against a paid invoice, admin only)
```

- `draft` → `sent`: triggered by admin clicking "Send"
- `sent` → `viewed`: triggered by client opening the hosted invoice link
- Any unpaid invoice past `due_date` → automatically flagged `overdue` via a scheduled function
- `void` requires admin role + mandatory reason string (audit log entry created)

---

### 4.4 Epic 4 — Invoice Payments via Stripe

**Epic Goal:** Enable cleaning businesses to collect payment from their clients through Stripe Payment Links attached to invoices. Payment confirmation should automatically reconcile the invoice status.

> **Scope clarification:** This epic uses Stripe's standard Payment Links API (not Stripe Connect). Stripe Connect (where Lustre takes a platform fee on payments) is deferred to Phase 2 as it requires a significantly more complex onboarding flow.

#### 4.4.1 User Stories

**US-BE-401:** As an organisation admin, when I send an invoice, a Stripe Payment Link should be generated and embedded in the invoice email and the hosted invoice page, allowing the client to pay by card.

**US-BE-402:** As an organisation admin, after a client pays via the Stripe Payment Link, the invoice status should automatically update to `paid` and `paid_at` should be set — without any manual action required.

**US-BE-403:** As an organisation admin, I should be able to manually record a payment against an invoice (for cash, bank transfer, or cheque payments), with a payment method field and optional reference.

**US-BE-404:** As an organisation admin, I should be able to see the `stripe_payment_intent_id` linked to a paid invoice for cross-referencing with Stripe Dashboard.

**US-BE-405:** As an organisation admin, I should be able to send a payment reminder for an outstanding invoice with one click, which re-sends the invoice email with the existing Payment Link.

#### 4.4.2 Webhook Integration for Payment Reconciliation

The existing Stripe webhook handler (`/api/webhooks/stripe`) handles platform subscription events. Invoice payment reconciliation requires **additional webhook event handling**:

| Stripe Event | Action Required |
|-------------|----------------|
| `payment_intent.succeeded` | Find invoice by `stripe_payment_intent_id`, mark as `paid`, set `paid_at` |
| `payment_intent.payment_failed` | Log failure; trigger dunning sequence if invoice is overdue |

> **Note:** The Stripe Payment Link creates a Payment Intent. The webhook must correlate the Payment Intent ID stored on the invoice to identify which invoice was paid.

---

### 4.5 Epic 5 — Dunning & Collections Management

**Epic Goal:** Implement automated follow-up sequences for both (a) failed Lustre subscription payments and (b) overdue customer invoices, to reduce involuntary churn and improve cash collection.

#### 4.5.1 User Stories — Platform Subscription Dunning

**US-BE-501:** As a Lustre subscriber whose payment has failed, I should receive an automated email on Day 1 after failure, notifying me and asking me to update my payment method.

**US-BE-502:** As a Lustre subscriber still failing after Day 7, my account should be degraded to read-only mode — I can view data but not create new records.

**US-BE-503:** As a Lustre subscriber still failing after Day 14, I should receive a final warning that my account will be suspended in 7 days.

**US-BE-504:** As a Lustre subscriber still failing after Day 21, my account should be suspended. Data is retained for 30 days before the deletion warning is triggered.

**US-BE-505:** As a Lustre subscriber who resolves their failed payment at any point in the dunning sequence, my account should immediately return to full active status.

#### 4.5.2 Subscription Dunning Schedule

| Day | Trigger | Action |
|-----|---------|--------|
| Day 0 | `invoice.payment_failed` webhook | Stripe Smart Retry begins automatically |
| Day 1 | Cron job | Email: "Payment failed — please update your card" |
| Day 4 | Stripe retry | Email reminder if still failing |
| Day 7 | Cron job | Account degraded to read-only; email: "Account restricted" |
| Day 14 | Cron job | Email: "Account suspension in 7 days" |
| Day 21 | Cron job | Account suspended; email: "Account suspended — data retained 30 days" |
| Day 51 | Cron job | Email: "Data deletion in 30 days — resolve to retain" |

#### 4.5.3 User Stories — Customer Invoice Collections Dunning

**US-BE-506:** As an organisation admin, when an invoice is 3 days from its due date and unpaid, the client should automatically receive a gentle reminder email.

**US-BE-507:** As an organisation admin, when an invoice becomes overdue (past due date, unpaid), the invoice status should automatically change to `overdue`.

**US-BE-508:** As an organisation admin, when an invoice is 7 days overdue, the client should receive an escalation email with a late payment notice and the Payment Link.

**US-BE-509:** As an organisation admin, when an invoice is 14 days overdue, it should be flagged in the invoice list with a "Requires follow-up" indicator, prompting manual action.

#### 4.5.4 Invoice Collections Schedule

| Trigger | Action |
|---------|--------|
| `due_date - 3 days` | Automated reminder email to client |
| `due_date` | Second reminder email to client |
| `due_date + 1 day` | Invoice status → `overdue` |
| `due_date + 7 days` | Escalation email: late payment notice |
| `due_date + 14 days` | Flag in admin UI: "Requires manual follow-up" |

---

### 4.6 Epic 6 — Basic Revenue Dashboard (MRR/ARR)

**Epic Goal:** Provide Lustre's internal team (admin users) with a real-time view of subscription revenue health. This is a Lustre-internal dashboard, not visible to customer organisations.

#### 4.6.1 User Stories

**US-BE-601:** As a Lustre admin (super-admin role), I should be able to view a Revenue Overview dashboard showing current MRR, ARR, and subscriber counts.

**US-BE-602:** As a Lustre admin, I should be able to see MRR broken down by plan (Starter, Professional, Business) so I can understand revenue mix.

**US-BE-603:** As a Lustre admin, I should be able to see a trailing 12-month MRR trend chart so I can understand growth trajectory.

**US-BE-604:** As a Lustre admin, I should be able to see active subscriber count, trial count, and churned subscriber count for the current month.

**US-BE-605:** As a Lustre admin, I should be able to see a list of recently churned organisations (last 30 days) so the team can consider win-back outreach.

**US-BE-606:** As a Lustre admin, the MRR/ARR data should be sourced from a `mrr_snapshots` table populated by Stripe webhook events, not from live Stripe API calls, to ensure performance and historical accuracy.

#### 4.6.2 Metrics Definitions

| Metric | Definition | Source |
|--------|-----------|--------|
| MRR | Sum of monthly-normalised subscription values for active organisations | `mrr_snapshots` table, latest snapshot |
| ARR | MRR × 12 | Calculated |
| New MRR | MRR added from organisations that started a subscription this calendar month | `mrr_snapshots` delta |
| Churned MRR | MRR lost from cancellations this calendar month | `mrr_snapshots` delta |
| Active Subscribers | Count of organisations with `subscription_status = 'active'` | `organisations` table |
| Trialling | Count of organisations with `subscription_status = 'trialing'` | `organisations` table |
| Past Due | Count of organisations with `subscription_status = 'past_due'` | `organisations` table |

> **Access control:** The revenue dashboard should be restricted to a `super_admin` role not visible to customer organisations. This is a Lustre platform-internal tool.

---

## 5. Data Model

### 5.1 New Table: `invoices`

```sql
CREATE TABLE invoices (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id           UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id                 UUID        NOT NULL REFERENCES clients(id),
  job_id                    UUID        REFERENCES jobs(id),           -- nullable
  quote_id                  UUID        REFERENCES quotes(id),          -- nullable, set when created from quote
  invoice_number            TEXT        NOT NULL,                       -- INV-YYYY-NNNN, unique per org
  status                    TEXT        NOT NULL DEFAULT 'draft',       -- draft|sent|viewed|paid|overdue|void|credit_note
  issue_date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date                  DATE        NOT NULL,
  subtotal                  NUMERIC     NOT NULL DEFAULT 0,
  tax_rate                  NUMERIC     NOT NULL DEFAULT 0,
  tax_amount                NUMERIC     NOT NULL DEFAULT 0,
  total                     NUMERIC     NOT NULL DEFAULT 0,
  amount_paid               NUMERIC     NOT NULL DEFAULT 0,
  amount_outstanding        NUMERIC     GENERATED ALWAYS AS (total - amount_paid) STORED,
  currency                  TEXT        NOT NULL DEFAULT 'GBP',
  stripe_payment_intent_id  TEXT,
  stripe_payment_link_url   TEXT,
  stripe_payment_link_id    TEXT,
  paid_at                   TIMESTAMPTZ,
  sent_at                   TIMESTAMPTZ,
  viewed_at                 TIMESTAMPTZ,
  voided_at                 TIMESTAMPTZ,
  void_reason               TEXT,
  notes                     TEXT,                                       -- visible to client on invoice
  internal_notes            TEXT,                                       -- internal only
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoices_status_check CHECK (
    status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'void', 'credit_note')
  ),
  CONSTRAINT invoices_number_org_unique UNIQUE (organisation_id, invoice_number)
);

CREATE INDEX invoices_org_status_idx     ON invoices (organisation_id, status);
CREATE INDEX invoices_org_client_idx     ON invoices (organisation_id, client_id);
CREATE INDEX invoices_stripe_pi_idx      ON invoices (stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX invoices_due_date_idx       ON invoices (due_date) WHERE status NOT IN ('paid', 'void');
```

### 5.2 New Table: `invoice_line_items`

```sql
CREATE TABLE invoice_line_items (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID        NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  description     TEXT        NOT NULL,
  quantity        NUMERIC     NOT NULL DEFAULT 1,
  unit_price      NUMERIC     NOT NULL,
  amount          NUMERIC     GENERATED ALWAYS AS (quantity * unit_price) STORED,
  tax_rate        NUMERIC     NOT NULL DEFAULT 0,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX invoice_line_items_invoice_idx ON invoice_line_items (invoice_id);
```

### 5.3 New Table: `mrr_snapshots`

```sql
CREATE TABLE mrr_snapshots (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date   DATE        NOT NULL,
  organisation_id UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  plan            TEXT        NOT NULL,
  mrr_pence       INTEGER     NOT NULL,   -- MRR in pence for this org on this date
  status          TEXT        NOT NULL,   -- active | trialing | past_due | cancelled
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT mrr_snapshots_org_date_unique UNIQUE (organisation_id, snapshot_date)
);

CREATE INDEX mrr_snapshots_date_idx ON mrr_snapshots (snapshot_date DESC);
```

> **Population:** `mrr_snapshots` is written by the Stripe webhook handler whenever a subscription event changes an organisation's plan or status. A daily cron job should also snapshot all active organisations to fill any gaps (e.g. if a webhook was missed).

### 5.4 New Function: Invoice Number Generator

```sql
-- Returns the next invoice number for an organisation in the format INV-YYYY-NNNN
-- Called at invoice creation time; increments per-org, per-year counter atomically.
CREATE OR REPLACE FUNCTION generate_invoice_number(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_year    TEXT := to_char(CURRENT_DATE, 'YYYY');
  v_count   INTEGER;
  v_number  TEXT;
BEGIN
  SELECT COUNT(*) + 1
  INTO   v_count
  FROM   invoices
  WHERE  organisation_id = p_org_id
  AND    to_char(issue_date, 'YYYY') = v_year;

  v_number := 'INV-' || v_year || '-' || lpad(v_count::TEXT, 4, '0');
  RETURN v_number;
END;
$$;
```

### 5.5 RLS Policies

New tables must have Row Level Security enabled, following the existing pattern:

```sql
ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_snapshots      ENABLE ROW LEVEL SECURITY;

-- invoices: org members can read/write their own
CREATE POLICY "invoices_all_own_org"
  ON invoices FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- invoice_line_items: same pattern
CREATE POLICY "line_items_all_own_org"
  ON invoice_line_items FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- mrr_snapshots: Lustre super-admin only (to be defined with RBAC)
-- Interim: deny all direct access; read via SECURITY DEFINER functions only
CREATE POLICY "mrr_snapshots_deny_direct"
  ON mrr_snapshots FOR ALL TO authenticated
  USING (false);
```

---

## 6. Integration Requirements

### 6.1 Stripe Payment Links API

For invoice payment collection, the integration uses Stripe's **Payment Links API** (not Stripe Connect):

| Step | Action |
|------|--------|
| Invoice `sent` | Call `stripe.paymentLinks.create()` with amount, currency, and metadata (`invoice_id`, `organisation_id`) |
| Store on invoice | Save `stripe_payment_link_id` and `stripe_payment_link_url` on the invoice record |
| Include in email | Embed the payment link URL in the invoice email and hosted invoice page |
| Client pays | Stripe creates a `PaymentIntent` and fires `payment_intent.succeeded` |
| Webhook received | Look up invoice by `stripe_payment_intent_id`, update status to `paid` |

**Stripe Payment Link creation parameters:**
```typescript
stripe.paymentLinks.create({
  line_items: [{
    price_data: {
      currency: 'gbp',
      product_data: { name: `Invoice ${invoice.invoice_number}` },
      unit_amount: invoice.total_pence,
    },
    quantity: 1,
  }],
  metadata: {
    invoice_id: invoice.id,
    organisation_id: invoice.organisation_id,
  },
  after_completion: {
    type: 'redirect',
    redirect: { url: `${APP_URL}/invoices/${invoice.id}/paid` },
  },
})
```

### 6.2 Stripe Webhook Handler Extension

The existing webhook handler at `src/app/api/webhooks/stripe/route.ts` must be extended with:

```typescript
case 'payment_intent.succeeded': {
  // Reconcile invoice payment
  // Find invoice by stripe_payment_intent_id, mark as paid
}

case 'payment_intent.payment_failed': {
  // Log failure; trigger invoice dunning if applicable
}
```

### 6.3 Email Provider (Resend)

Invoice emails and dunning sequences use Resend (existing provider). New email templates required:

| Template | Trigger | Recipient |
|----------|---------|-----------|
| `invoice-sent` | Admin sends invoice | Client (external) |
| `invoice-paid-confirmation` | Invoice marked paid | Admin + Client |
| `invoice-reminder` | Due date - 3 days | Client (external) |
| `invoice-overdue` | Due date + 7 days | Client (external) |
| `trial-ending-7-days` | 7 days before trial_ends_at | Org admin |
| `trial-ending-3-days` | 3 days before trial_ends_at | Org admin |
| `trial-ending-1-day` | 1 day before trial_ends_at | Org admin |
| `subscription-payment-failed-d1` | Day 1 after payment failure | Org admin |
| `subscription-payment-failed-d7` | Day 7 — account restricted | Org admin |
| `subscription-payment-failed-d14` | Day 14 — suspension warning | Org admin |
| `subscription-suspended-d21` | Day 21 — account suspended | Org admin |

### 6.4 PDF Generation

UK-compliant invoice PDFs must be generated server-side. Recommended approach: use a React-to-PDF library (e.g. `@react-pdf/renderer`) or a headless HTML-to-PDF solution. The PDF generation should run as a Next.js API route (`/api/invoices/[id]/pdf`) and return the binary PDF stream.

The PDF template must render all HMRC-required fields (see US-BE-309).

---

## 7. UI/UX Page Inventory

### 7.1 New Pages Required

| Route | Description | Access |
|-------|-------------|--------|
| `/dashboard/invoices` | Invoice list with filters (status, client, date range) | Org member |
| `/dashboard/invoices/new` | Create invoice from scratch | Admin |
| `/dashboard/invoices/[id]` | Invoice detail view (timeline, line items, payment status) | Org member |
| `/dashboard/invoices/[id]/edit` | Edit draft invoice | Admin |
| `/api/invoices/[id]/pdf` | Stream PDF download | Org member (authenticated) |
| `/i/[token]` | Public hosted invoice page (client-facing, unauthenticated) | Public (token-gated) |
| `/i/[token]/paid` | Payment confirmation page (post-Stripe redirect) | Public |
| `/admin/revenue` | Internal MRR/ARR dashboard | Super-admin only |

### 7.2 Modified Pages

| Route | Change Required |
|-------|----------------|
| `/dashboard/quotes/[id]` | Add "Create Invoice" CTA when quote status is `accepted` |
| `/dashboard/jobs/[id]` | Add "Create Invoice" CTA when job status is `completed` |
| `/dashboard/clients/[id]` | Add "Invoices" tab showing client's invoice history |
| `/dashboard/settings/billing` | Add trial expiry countdown and upgrade CTA |
| `/billing` | Ensure plan picker correctly reflects active subscription (no checkout if already subscribed) |

### 7.3 Navigation

- Add "Invoices" to the primary dashboard navigation (sidebar), grouped with or near "Quotes".
- Add an "Invoices" count/badge to the client detail view header.

---

## 8. Non-Functional Requirements

### 8.1 UK HMRC Invoicing Compliance

All invoices generated by Lustre must comply with HMRC requirements for VAT invoices (where applicable) and standard sales invoices:

| Requirement | Implementation |
|-------------|---------------|
| Unique sequential invoice number | `generate_invoice_number()` DB function — atomic, per-org, per-year |
| Seller name and address | Pulled from `organisations` record at invoice creation time (not at PDF render — snapshot at creation) |
| Buyer name and address | Pulled from `clients` record at invoice creation time |
| Date of supply | `issue_date` on invoice |
| Description of goods/services | `invoice_line_items.description` |
| Amount excluding VAT | `invoice.subtotal` |
| VAT rate and amount | `invoice.tax_rate`, `invoice.tax_amount` (only if org is `vat_registered = true`) |
| Total including VAT | `invoice.total` |
| VAT registration number | `organisations.vat_number` (only shown if `vat_registered = true`) |

> **GDPR / HMRC Conflict:** Financial records (invoices, payments) must be retained for 6 years under HMRC rules even if a client requests erasure under GDPR. The implementation must anonymise personal data fields (client name, address) on such requests while retaining the financial record intact. This requires a `gdpr_anonymised_at` flag on the invoices table and a process to replace client name/address with `[Anonymised]` rather than deleting the record.

### 8.2 Audit Trail

All financial events must be written to the existing `audit_logs` table:

| Event | Logged Fields |
|-------|-------------|
| Invoice created | actor_id, invoice_id, amount, client_id |
| Invoice sent | actor_id, invoice_id, sent_at |
| Invoice voided | actor_id, invoice_id, void_reason |
| Payment recorded (manual) | actor_id, invoice_id, amount, payment_method |
| Payment received (Stripe) | stripe_payment_intent_id, invoice_id, amount |
| Plan changed | actor_id, old_plan, new_plan, price_impact |
| Subscription cancelled | actor_id, reason (if captured) |
| Discount applied | actor_id, discount_amount, reason |

### 8.3 Security

- Invoice PDF routes (`/api/invoices/[id]/pdf`) must verify the requester is authenticated and belongs to the invoice's organisation.
- Public invoice pages (`/i/[token]`) must use a unique, non-guessable token (UUID or CUID) — **not** the invoice's primary key UUID.
- Payment Link URLs must be stored and served from the database — not reconstructed from known patterns.
- The `mrr_snapshots` table must not be directly readable by customer organisations.

### 8.4 Data Integrity

- Invoice numbers must be unique per organisation per year — enforced by DB unique constraint.
- Invoice `total` must equal `subtotal + tax_amount` — enforced by application-layer validation before insert.
- `amount_outstanding` is a generated column — it cannot be manually set.
- Invoices in `paid` or `void` status must not be editable (enforced server-side).

---

## 9. Acceptance Criteria

### Epic 1 — Stripe Subscription Activation & Plan Enforcement

- [ ] A new organisation can sign up, select a plan, complete Stripe Checkout, and have their `plan` and `subscription_status` updated correctly via webhook within 30 seconds.
- [ ] An organisation on the Starter plan cannot add a 4th user — the API returns a 403 and the UI shows an upgrade prompt.
- [ ] An organisation on the Free plan cannot create more than 5 quotes in a calendar month — the API blocks the request and displays a plan limit message.
- [ ] Plan limit checks are enforced server-side; bypassing the UI via direct API call still returns the same 403 response.
- [ ] Stripe Tax (UK VAT 20%) is correctly applied and visible on Stripe-generated invoices for UK organisations.

### Epic 2 — Trial Conversion Flow

- [ ] Trial user receives all three countdown emails (7-day, 3-day, 1-day) at the correct intervals.
- [ ] A persistent in-app banner appears for all trial users within 3 days of expiry on every page.
- [ ] A user whose trial has expired is redirected to `/billing` with a clear "Your trial has ended" message; they cannot access any product pages.
- [ ] A user who upgrades during trial is immediately moved to `active` status; Stripe does not double-charge them.

### Epic 3 — Invoice Management System

- [ ] Accepting a quote automatically creates a draft invoice pre-populated with the quote's line items, totals, and client details.
- [ ] Invoice numbers are sequential per organisation per year, never reused, in the format `INV-YYYY-NNNN`.
- [ ] A generated invoice PDF contains all HMRC-required fields for both VAT-registered and non-VAT-registered organisations.
- [ ] An invoice can be voided only by an admin, and only with a reason provided; the void event is recorded in `audit_logs`.
- [ ] A public invoice link (`/i/[token]`) is accessible without authentication and displays the invoice correctly.
- [ ] An invoice in `paid` or `void` status cannot be edited (the edit UI and API both reject the request).

### Epic 4 — Invoice Payments via Stripe

- [ ] A Stripe Payment Link is created and stored on the invoice when the invoice is sent.
- [ ] After a client pays via the Payment Link, the invoice status updates to `paid` and `paid_at` is set automatically via webhook — within 60 seconds of payment.
- [ ] A manually recorded payment (for cash/BACS/cheque) correctly updates `amount_paid` and status.
- [ ] If a Stripe payment fails, the failure is logged and the invoice dunning sequence is triggered.

### Epic 5 — Dunning & Collections Management

- [ ] An organisation with a failed subscription payment receives an email on Day 1.
- [ ] After Day 7 of failed payment, the account is set to read-only (cannot create new records; existing data is viewable).
- [ ] An overdue invoice (past `due_date`, unpaid) automatically transitions to `overdue` status via scheduled function.
- [ ] A client with an invoice 3 days from due date receives an automated reminder email.
- [ ] An admin resolving a failed subscription payment results in immediate full account restoration.

### Epic 6 — Revenue Dashboard

- [ ] The `/admin/revenue` page is accessible only to super-admin users; all other users see a 403.
- [ ] The dashboard displays current MRR, ARR, active subscriber count, trialling count, and past-due count.
- [ ] The trailing 12-month MRR chart renders with accurate data sourced from `mrr_snapshots`.
- [ ] MRR is correctly broken down by plan tier (Starter, Professional, Business).
- [ ] Data on the dashboard reflects the `mrr_snapshots` table, not live Stripe API calls.

---

## 10. Implementation Plan & Effort Estimates

The following is the recommended sequenced backlog. Dependencies are noted; do not begin a later epic before its dependency is resolved.

### Sprint 1 (Days 1–8): Activation + Plan Enforcement

| Task | Effort | Dependency |
|------|--------|-----------|
| Complete Stripe env var setup + create Products/Prices (ops task) | 0.5 day | None |
| Implement `plan-limits.ts` central config | 0.5 day | None |
| Add server-side seat limit check to user invite API route | 1 day | `plan-limits.ts` |
| Add server-side record limit checks (clients, quotes, jobs) | 2 days | `plan-limits.ts` |
| Add in-app plan limit warning banners and upgrade CTAs | 1 day | Plan limit config |
| Add trial expiry banner (within 3 days) to dashboard layout | 1 day | None |
| Add paywall redirect for expired trials in middleware | 1 day | None |
| **Subtotal** | **7 days** | |

### Sprint 2 (Days 9–10): Trial Conversion Emails

| Task | Effort | Dependency |
|------|--------|-----------|
| Create Resend email templates: trial-ending (3 variants) | 0.5 day | None |
| Register cron job functions for 7/3/1-day trial emails | 1 day | Email templates |
| Test end-to-end trial expiry flow in staging | 0.5 day | Cron jobs |
| **Subtotal** | **2 days** | |

### Sprint 3 (Days 11–21): Invoice System Core

| Task | Effort | Dependency |
|------|--------|-----------|
| Write DB migration: `invoices` + `invoice_line_items` tables | 1 day | None |
| Write DB migration: RLS policies for new tables | 0.5 day | Tables created |
| Write `generate_invoice_number()` DB function | 0.5 day | `invoices` table |
| Implement invoice creation API route (from quote, from job, from scratch) | 2 days | DB schema |
| Implement invoice CRUD API routes (list, get, update, send, void) | 2 days | DB schema |
| Implement auto-invoice creation on quote acceptance (trigger or app logic) | 1 day | Invoice API |
| Build `/dashboard/invoices` list page with filters | 1.5 days | Invoice API |
| Build `/dashboard/invoices/[id]` detail page | 1.5 days | Invoice API |
| Build `/dashboard/invoices/new` and edit pages | 1 day | Invoice API |
| **Subtotal** | **11 days** | |

### Sprint 4 (Days 22–26): Invoice PDF + Public Page

| Task | Effort | Dependency |
|------|--------|-----------|
| Implement invoice PDF generation API route (`/api/invoices/[id]/pdf`) | 2 days | Invoice schema |
| Build public invoice page (`/i/[token]`) | 1 day | Invoice schema |
| Build payment confirmation page (`/i/[token]/paid`) | 0.5 day | Public page |
| Add "Create Invoice" CTA to quote and job detail pages | 0.5 day | Invoice routes |
| **Subtotal** | **4 days** | |

### Sprint 5 (Days 27–31): Stripe Payment Integration

| Task | Effort | Dependency |
|------|--------|-----------|
| Implement Stripe Payment Link creation on invoice send | 1.5 days | Invoice send API, Stripe keys |
| Extend Stripe webhook handler with `payment_intent.succeeded` | 1 day | Payment Links |
| Extend Stripe webhook handler with `payment_intent.payment_failed` | 0.5 day | Payment Links |
| Implement manual payment recording UI + API | 1 day | Invoice API |
| Create Resend email templates: invoice-sent, invoice-paid-confirmation | 1 day | None |
| **Subtotal** | **5 days** | |

### Sprint 6 (Days 32–34): Dunning

| Task | Effort | Dependency |
|------|--------|-----------|
| Create Resend email templates: invoice reminder (3-day), overdue escalation | 0.5 day | None |
| Register invoice dunning cron functions | 1 day | Email templates |
| Create subscription dunning email templates (4 variants) | 0.5 day | None |
| Register subscription dunning cron functions + account restriction logic | 1 day | Email templates |
| **Subtotal** | **3 days** | |

### Sprint 7 (Days 35–40): Revenue Dashboard

| Task | Effort | Dependency |
|------|--------|-----------|
| Write DB migration: `mrr_snapshots` table | 0.5 day | None |
| Write SECURITY DEFINER function for MRR snapshot writes | 0.5 day | Table created |
| Extend Stripe webhook handler to write `mrr_snapshots` on subscription events | 1 day | Table + function |
| Build `/admin/revenue` dashboard page (MRR, ARR, subscriber counts) | 2 days | Snapshots |
| Implement trailing 12-month MRR trend chart | 1.5 days | Snapshots |
| Add super-admin route protection | 0.5 day | RBAC (existing) |
| **Subtotal** | **6 days** | |

**Total Phase 1 estimate: ~38 days**

---

## 11. Out of Scope (Phase 2+)

The following items are explicitly out of scope for this BA report and Phase 1 implementation. They are documented here to avoid scope creep and to record the rationale for deferral.

| Feature | Rationale for Deferral |
|---------|----------------------|
| Customer-facing revenue analytics (`/dashboard/analytics`) | Valuable but not blocking; requires invoice data to be live first (Phase 1 dependency) |
| Xero / QuickBooks integration | Requires accounting partner onboarding; deferred to Phase 2 |
| Stripe Connect (platform payment processing fee) | Significant additional complexity; Stripe Connect onboarding UX is a project in itself |
| Cohort analysis (trial-to-paid, retention by cohort) | Requires 3+ months of live subscription data before meaningful |
| Multi-year enterprise contract management | Enterprise tier not yet being actively sold |
| Custom report builder | Phase 3 — Business/Enterprise differentiator |
| Deposit requests on quotes | Minor enhancement; not blocking for Phase 1 |
| Multi-currency support | Not required for UK market focus |
| Revenue forecasting | Requires 12+ months of historical data |
| Client financial reporting (LTV, AOV per client) | Phase 2 customer-facing analytics |

---

## 12. Dependencies & Risks

### 12.1 Pre-Development Dependencies

| Dependency | Owner | Blocking |
|------------|-------|---------|
| Stripe Products and Prices created in Stripe Dashboard (test mode) | CFO / CTO | Epic 1, Epic 4 |
| Stripe environment variables set in Vercel | DevOps / CTO | Epic 1, Epic 4 |
| Stripe webhook endpoint registered in Stripe Dashboard | DevOps / CTO | Epic 1, Epic 4 |
| Stripe Tax (UK VAT) enabled in Stripe Dashboard | CFO / CTO | Epic 1 |
| Resend transactional email domain verified | DevOps | Epic 2, Epic 5 |
| RBAC migration `20260310000000_rbac.sql` applied | DBA | Epic 6 (super-admin access) |

### 12.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Stripe environment variables not set before development testing begins | Medium | High — blocks all testing | Agree activation date with CTO before Sprint 1 begins |
| Invoice PDF library choice causes rendering inconsistencies across environments | Medium | Medium | Proof-of-concept PDF generation before committing to a library |
| HMRC VAT compliance edge cases (reverse charge, deposit handling) | Low | High — compliance risk | Review edge cases with CFO before building invoice creation logic |
| `generate_invoice_number()` has a race condition under concurrent invoice creation | Low | Medium — duplicate numbers | Use `SERIALIZABLE` transaction isolation or a dedicated sequence table |
| Stripe webhook delivery failures causing missed payment reconciliation | Low | High — invoices not marked paid | Implement a periodic reconciliation job that checks Stripe for payment status of open Payment Links |
| Trial email cron jobs conflict with existing `pg_cron` entries | Low | Medium | Review existing `20260306000002_trial_emails.sql` and `20260306000003_cron_functions.sql` before adding new jobs |
| GDPR erasure request against a client with outstanding invoices | Low | Medium — legal exposure | Define and document HMRC vs. GDPR conflict resolution before building invoice data model |

---

*This document should be reviewed by the CFO, CTO, and lead developer before any implementation begins. Once approved, it constitutes the authoritative requirements specification for the Phase 1 Billing & Revenue implementation.*
