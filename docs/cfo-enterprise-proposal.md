# Lustre — CFO Enterprise Readiness Proposal
**Document Type:** Financial Strategy & Business Analysis Proposal
**Author:** Chief Financial Officer
**Date:** 2026-03-03
**Version:** 1.0
**Status:** Draft for Review
**Ref:** CFO-ENT-001

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Financial Architecture Assessment](#2-current-financial-architecture-assessment)
3. [Revenue Operations Gap Analysis](#3-revenue-operations-gap-analysis)
4. [Financial Reporting & Analytics Framework](#4-financial-reporting--analytics-framework)
5. [Billing & Revenue Infrastructure](#5-billing--revenue-infrastructure)
6. [Pricing Strategy & Tier Architecture](#6-pricing-strategy--tier-architecture)
7. [Unit Economics & SaaS Health Metrics](#7-unit-economics--saas-health-metrics)
8. [Financial Controls & Compliance](#8-financial-controls--compliance)
9. [Investment Plan & Budget Allocation](#9-investment-plan--budget-allocation)
10. [ROI Framework & Business Case](#10-roi-framework--business-case)
11. [Board & Investor Reporting](#11-board--investor-reporting)
12. [CFO Phased Roadmap](#12-cfo-phased-roadmap)
13. [Financial Risk Register](#13-financial-risk-register)
14. [Success Metrics & CFO KPIs](#14-success-metrics--cfo-kpis)

---

## 1. Executive Summary

Lustre is a well-built field service CRM with a modern technical foundation and a clear product vision, supported by ambitious transformation plans from both the CCO (CRM enterprise roadmap, ref: CRM-ENT-001) and the COO (operational infrastructure, ref: OPS-ENT-001). Both documents present credible, phased paths to enterprise readiness.

This CFO proposal addresses the dimension that neither plan fully covers: **the financial engine that turns enterprise capability into sustainable, measurable revenue**.

Today, Lustre has no functioning billing integration, no financial reporting, no revenue operations framework, and no unit economics visibility. These are not cosmetic gaps — they are existential blockers for enterprise sales, investor credibility, and business scalability. Enterprise buyers require financial transparency (invoicing, audit trails, contract management). Investors require SaaS health metrics. The business itself requires a functioning revenue engine before it can scale.

### Summary of CFO Priorities

| Priority | Domain | Current State | Enterprise Requirement |
|----------|--------|--------------|----------------------|
| 🔴 Critical | Billing Integration | Stubbed (£0 collected) | Automated Stripe billing, invoicing, dunning |
| 🔴 Critical | Revenue Reporting | None | MRR, ARR, churn, LTV dashboards |
| 🔴 Critical | Financial Analytics | None | Real-time P&L, cost attribution, margin analysis |
| 🟠 High | Pricing Architecture | Single vague tier | Differentiated, defensible tier structure |
| 🟠 High | Unit Economics Tracking | Unknown | CAC, LTV, Payback Period, NRR tracked |
| 🟠 High | Quote-to-Cash Pipeline | Quote only, no invoicing | Full quote → invoice → payment → reconciliation |
| 🟡 Medium | Contract & Revenue Recognition | None | Multi-year contracts, deferred revenue handling |
| 🟡 Medium | Financial Controls | Minimal | Audit trails, approval workflows, SOC 2 alignment |
| 🟡 Medium | Board Reporting | None | Monthly board pack, investor metrics |
| 🟢 Strategic | Cost Optimisation | Unknown infrastructure spend | Unit cost per tenant, margin by plan |

### CFO's Core Thesis

> Enterprise readiness is not just a product question — it is a revenue architecture question. We must build the financial infrastructure in lockstep with the product and operational roadmaps. Without it, we can win enterprise deals but cannot collect, retain, or report on the revenue from them.

---

## 2. Current Financial Architecture Assessment

### 2.1 What Exists in the Codebase Today

A review of the current codebase reveals the following financially relevant infrastructure:

#### Database Schema (Financial Fields)

The `organisations` table contains the following financial columns:

```sql
plan                  TEXT     -- 'free' | 'starter' | 'pro'
subscription_status   TEXT     -- 'active' | 'trialing' | 'past_due' | 'cancelled'
stripe_customer_id    TEXT     -- populated at signup (stubbed)
trial_ends_at         TIMESTAMPTZ
```

The `quotes` table supports:

```sql
pricing_type          TEXT     -- 'fixed' | 'itemised'
fixed_price           NUMERIC
subtotal              NUMERIC
tax_rate              NUMERIC
tax_amount            NUMERIC
total                 NUMERIC
valid_until           DATE
status                TEXT     -- 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
responded_at          TIMESTAMPTZ
```

The `jobs` table has:

```sql
price                 NUMERIC
duration_hours        NUMERIC
```

#### What This Tells Us

- **VAT is modelled** at organisation level (vat_registered, vat_rate, vat_number) — a positive sign for UK compliance
- **Quote financials are tracked** but isolated — no connection to invoicing, payment collection, or revenue recognition
- **Job pricing exists** but is not aggregated anywhere — revenue by client/period/service type is currently unqueryable in the UI
- **Stripe fields exist** but the integration was never built — the platform cannot collect a single pound of subscription revenue automatically
- **No invoice table** — there is no financial document that follows quote acceptance
- **No payment table** — no record of money received
- **No revenue recognition logic** — no concept of earned vs. deferred revenue

### 2.2 Revenue Exposure Assessment

| Risk | Impact | Likelihood | Notes |
|------|--------|-----------|-------|
| Billing not automated | Cannot scale revenue beyond manual collection | Certain | Stripe stubbed, no webhooks |
| No dunning management | Revenue leakage from failed payments | High | No retry logic implemented |
| No invoice generation | Non-compliant with UK invoicing requirements at scale | High | Quotes ≠ invoices |
| Quote value not reported | Business cannot see pipeline value | Certain | No reporting layer exists |
| Job revenue not aggregated | Cannot calculate revenue per client or period | Certain | Raw DB data only |
| No churn detection | At-risk accounts are invisible | Certain | No usage or engagement data |

---

## 3. Revenue Operations Gap Analysis

Revenue Operations (RevOps) is the unified discipline bridging sales, finance, and customer success to maximise revenue performance. It is table stakes for enterprise SaaS. Lustre currently has none of it.

### 3.1 Quote-to-Cash Pipeline

The current workflow terminates at quote acceptance. There is no financial continuation:

```
Current:  Client → Quote Sent → Quote Accepted → [DEAD END]

Required: Client → Quote Sent → Quote Accepted → Invoice Generated
                                                → Payment Collected
                                                → Revenue Recognised
                                                → Renewal Triggered (if contract)
                                                → Reconciled with Accounting System
```

#### Gaps in Quote-to-Cash

| Stage | Current State | Required Capability |
|-------|--------------|-------------------|
| Quote | ✅ Full lifecycle with PDF, email, accept/decline | Retained — add deposit request option |
| Invoice | ❌ Not implemented | Auto-generate UK-compliant invoice on acceptance |
| Payment Request | ❌ Not implemented | Stripe payment link on invoice, card-on-file |
| Payment Confirmation | ❌ Not implemented | Webhook-driven, auto-mark invoice paid |
| Dunning | ❌ Not implemented | Automated retry sequence for failed payments |
| Reconciliation | ❌ Not implemented | Xero/QuickBooks sync for bookkeeping |
| Revenue Recognition | ❌ Not implemented | Earned vs. deferred for multi-session jobs |

### 3.2 Subscription Revenue Operations

For Lustre's own SaaS subscriptions (the platform plans, not the client invoices):

| Gap | Detail |
|-----|--------|
| No automated billing | Stripe is stubbed — no subscriptions are being billed |
| No plan enforcement | Plan limits (seats, clients, jobs) are not enforced by code |
| No trial conversion flow | Trial users get no automated nudge to convert |
| No upgrade/downgrade flow | No self-serve plan changes in-app |
| No cancellation flow | No cancellation survey, no save offers, no offboarding |
| No MRR tracking | Cannot see Monthly Recurring Revenue at any level |
| No churn visibility | Cannot identify at-risk or churned accounts |
| No expansion revenue tracking | No upsell/cross-sell triggers |

### 3.3 Financial Reporting Gaps

| Report | Current | Enterprise Requirement |
|--------|---------|----------------------|
| MRR / ARR | ❌ | Real-time, by plan, by cohort |
| Revenue by client | ❌ | Lifetime value per client, trailing 12M |
| Revenue by service type | ❌ | Which services drive the most revenue |
| Quote pipeline value | ❌ | Total open quote value, weighted by likelihood |
| Invoice aging | ❌ | Outstanding, overdue, by client |
| Churn rate | ❌ | Monthly/quarterly, by plan |
| Net Revenue Retention | ❌ | Expansion minus contraction minus churn |
| Gross margin | ❌ | Infrastructure cost vs. subscription revenue |
| CAC by channel | ❌ | Cost to acquire a customer by source |
| LTV:CAC ratio | ❌ | Core unit economics health metric |
| Payback period | ❌ | Months to recover CAC |
| Trial conversion rate | ❌ | Free-to-paid conversion by cohort |

---

## 4. Financial Reporting & Analytics Framework

This section defines the complete financial reporting layer Lustre needs to be enterprise-credible — both for its own internal management and as reporting tools for its customers (who are also running businesses).

### 4.1 Two Reporting Contexts

It is critical to separate two distinct reporting needs:

**Context A — Lustre Internal (Platform Metrics)**
Reports that the Lustre business uses to manage its own SaaS company: MRR, churn, CAC, LTV, gross margin.

**Context B — Customer-Facing (Business Analytics for Cleaning Companies)**
Reports that Lustre's customers use inside the product to manage their cleaning/FM business: job revenue, client value, team utilisation, quote conversion.

Both are required. This document covers both.

---

### 4.2 Context A: Lustre Platform Financial Reporting

#### 4.2.1 Revenue Dashboard (Internal)

A real-time financial dashboard visible to Lustre admins/finance:

| Metric | Definition | Calculation |
|--------|-----------|-------------|
| MRR | Monthly Recurring Revenue | Sum of active subscription values at month end |
| ARR | Annual Recurring Revenue | MRR × 12 |
| New MRR | Revenue from new customers this month | Sum of subscriptions started in period |
| Expansion MRR | Revenue from upgrades this month | Incremental MRR from plan upgrades |
| Contraction MRR | Revenue lost from downgrades | MRR reduction from plan downgrades |
| Churned MRR | Revenue from cancelled subscriptions | MRR lost from cancellations |
| Net New MRR | Net change in MRR | New + Expansion − Contraction − Churned |
| NRR | Net Revenue Retention | (Starting MRR + Expansion − Contraction − Churn) / Starting MRR |

**Implementation approach:**
- Stripe webhook events populate a `mrr_snapshots` table (daily)
- Dashboard queries this table rather than Stripe API directly
- Allows historical trend views and plan-level breakdown

#### 4.2.2 Cohort Analysis

Track revenue cohorts by sign-up month to understand:
- Trial-to-paid conversion rate (target: >25%)
- 3-month, 6-month, 12-month retention by cohort
- Which cohorts generate the highest LTV
- Revenue recovery after churn events

#### 4.2.3 Unit Economics Tracking

| Metric | Formula | Target (Enterprise SaaS Benchmark) |
|--------|---------|-----------------------------------|
| CAC | Total Sales & Marketing Spend / New Customers Acquired | Track and minimise |
| LTV | ARPU / Monthly Churn Rate | LTV:CAC > 3:1 |
| Payback Period | CAC / (ARPU × Gross Margin %) | < 12 months |
| ARPU | MRR / Active Accounts | Track by plan tier |
| Gross Margin | (Revenue − COGS) / Revenue | Target >70% for SaaS |
| NRR | See above | Target >110% for growth SaaS |

**COGS definition for Lustre:**
- Supabase hosting costs (per-tenant storage, bandwidth, compute)
- Vercel edge function costs (per-request)
- Resend email costs (per email sent)
- Upstash Redis costs
- Customer support cost per account (once support is operational)

---

### 4.3 Context B: Customer-Facing Business Analytics

These are the analytics tools Lustre provides to its customers within the product. This is a major differentiator for enterprise buyers and a key revenue retention driver.

#### 4.3.1 Revenue & Financial Dashboard (for Cleaning Businesses)

Accessible at `/dashboard/analytics` or `/dashboard/reports`:

**Overview Cards (Top Level):**

| Metric | Description |
|--------|-------------|
| Total Revenue (MTD) | Sum of completed job prices + accepted quote values |
| Revenue vs. Last Month | % change with directional indicator |
| Outstanding Invoices | Count and total value of unpaid invoices |
| Overdue Invoices | Count and total value of invoices past due date |
| Average Job Value | Mean revenue per completed job |
| Quote Conversion Rate | Accepted quotes / total sent quotes |

**Revenue Trend Chart:**
- Bar or line chart of monthly revenue over trailing 12 months
- Filterable by service type, property type, assignee
- Export to CSV/Excel

**Job Revenue Breakdown:**
- Revenue by service type (regular, deep clean, move-in/out, post-event)
- Revenue by team member (assignee)
- Revenue by property type
- Revenue by client (top 10 clients by revenue)

#### 4.3.2 Client Financial Reporting

Within each client record and as a standalone report:

| Report | Content |
|--------|---------|
| Client Lifetime Value | Total revenue from this client since creation |
| Average Order Value | Mean job value for this client |
| Job Frequency | Average gap between jobs (identifies at-risk clients) |
| Quote History | All quotes, their values, statuses, and response rates |
| Outstanding Balance | Unpaid invoices for this client |
| Revenue Trend | Client revenue by quarter, trailing 2 years |

#### 4.3.3 Quote Pipeline Analytics

A dedicated pipeline view showing the financial health of outstanding quotes:

| Metric | Description |
|--------|-------------|
| Pipeline Value | Total value of all open/sent quotes |
| Weighted Pipeline | Pipeline value × historical conversion rate |
| Conversion Rate by Period | Accepted / sent, trailing 3M, 6M, 12M |
| Average Time to Response | Days from sent to accepted/declined |
| Quote Expiry Risk | Quotes approaching valid_until with no response |
| Win/Loss Analysis | Declined quote reasons (requires reason capture) |

#### 4.3.4 Operational Financial Metrics

| Metric | Description |
|--------|-------------|
| Revenue per Operative | Total job value assigned to each team member |
| Utilisation Rate | Hours worked / available hours (requires shift management) |
| Job Cancellation Cost | Revenue lost from cancelled jobs |
| Average Invoice Payment Time | Days from invoice sent to payment received |
| Service Mix Profitability | Revenue by service type (once cost inputs exist) |

#### 4.3.5 Report Builder (Enterprise Tier)

For enterprise plan customers, a self-serve report builder:

- Select dimensions: client, property, job type, assignee, date range, status
- Select metrics: count, sum of revenue, average value, conversion rate
- Save report as named template
- Schedule report delivery via email (daily/weekly/monthly)
- Export formats: CSV, Excel, PDF

**This is a key enterprise differentiator** — no competitor in the UK cleaning CRM space offers enterprise-grade custom reporting.

---

## 5. Billing & Revenue Infrastructure

This section complements the COO's billing section (ref: OPS-ENT-001, §5) by providing the financial design and requirements for the billing system, not just the technical implementation.

### 5.1 Stripe Integration Architecture

The COO has identified Stripe integration as a Phase 1 operational priority. From a CFO perspective, the requirements are:

#### 5.1.1 Subscription Billing (Platform Revenue)

| Requirement | Detail |
|-------------|--------|
| Plan creation | Create Stripe Products and Prices for each tier |
| Checkout flow | Stripe Checkout or embedded Elements for plan purchase |
| Trial handling | Convert trial to paid automatically at trial_ends_at |
| Plan changes | Prorate upgrades immediately; schedule downgrades to period end |
| Cancellations | Honour to end of billing period; capture cancellation reason |
| Dunning | Smart Retry (Stripe's built-in) + custom email sequence via Resend |
| Tax collection | Stripe Tax for UK VAT (20%) on SaaS subscriptions |
| Invoices | Stripe-generated invoices for every charge (PDF, auto-sent) |
| Receipts | Auto-sent by Stripe; also accessible in customer portal |
| Billing portal | Stripe Customer Portal for self-serve plan management |

#### 5.1.2 Client Invoice Payments (Customer Revenue)

Lustre's customers need to collect payment from their own clients. This is a second Stripe use case:

| Requirement | Detail |
|-------------|--------|
| Connected Accounts | Stripe Connect (Standard or Express) for each Lustre customer |
| Payment collection | Stripe Payment Links on invoices sent to cleaning clients |
| Card on file | Store card for recurring clients with consent |
| Payout management | Lustre customers receive payouts to their bank account |
| Platform fee | Lustre earns a % fee on payments processed (optional revenue stream) |
| Reconciliation | Payment events auto-update invoice status in Lustre |

> **CFO Note on Stripe Connect:** This is a significant revenue opportunity. If Lustre processes payments on behalf of customers, a 0.5–1% platform fee on processed volume creates a third revenue stream alongside subscriptions and potentially professional services. At scale, payment volume revenue can exceed subscription revenue for vertical SaaS companies.

#### 5.1.3 UK Tax Compliance

| Requirement | Detail |
|-------------|--------|
| VAT on SaaS subscriptions | 20% VAT applied to all UK B2B subscriptions via Stripe Tax |
| VAT on client invoices | Customer-set VAT rate applied to cleaning invoices |
| VAT-registered buyers | Reverse charge handling for VAT-registered business clients |
| IR35 considerations | If operatives are contractors, flag for tax treatment |
| Making Tax Digital | Future: consider MTD-compatible export format (for QuickBooks/Xero) |

### 5.2 Invoice Management System

A formal invoice system must be built as a distinct entity from quotes:

#### Invoice Data Model

```
invoices
  id                UUID
  organisation_id   UUID (FK organisations)
  client_id         UUID (FK clients)
  job_id            UUID (FK jobs, nullable)
  quote_id          UUID (FK quotes, nullable)
  invoice_number    TEXT (sequential, e.g. INV-2026-0001)
  status            TEXT (draft | sent | viewed | paid | overdue | void | credit_note)
  issue_date        DATE
  due_date          DATE
  subtotal          NUMERIC
  tax_rate          NUMERIC
  tax_amount        NUMERIC
  total             NUMERIC
  amount_paid       NUMERIC
  amount_outstanding NUMERIC
  currency          TEXT (default 'GBP')
  stripe_payment_intent_id TEXT
  stripe_payment_link_url  TEXT
  paid_at           TIMESTAMPTZ
  sent_at           TIMESTAMPTZ
  notes             TEXT
  internal_notes    TEXT

invoice_line_items
  id                UUID
  invoice_id        UUID (FK invoices)
  description       TEXT
  quantity          NUMERIC
  unit_price        NUMERIC
  amount            NUMERIC
  tax_rate          NUMERIC
  sort_order        INTEGER
```

#### Invoice Workflow

```
Draft → Sent → [Viewed] → Paid
                        → Overdue (auto, based on due_date)
                        → Void (manual, with reason)
                        → Credit Note (for refunds)
```

#### UK Invoice Compliance Requirements

UK law (HMRC) requires invoices to contain:
- Unique invoice number
- Seller's name and address
- Buyer's name and address
- Date of supply and invoice date
- Description of goods/services
- Amount excluding VAT
- VAT rate and amount (if VAT registered)
- Total amount including VAT
- VAT registration number (if VAT registered)

Lustre's invoice generator must produce UK-compliant PDFs automatically.

### 5.3 Dunning & Collections Management

Failed payments are a significant source of involuntary churn (industry average: 20–40% of churn is involuntary). A dunning strategy is required:

**For Lustre Subscription Billing:**

| Day | Action |
|-----|--------|
| Day 0 | Payment fails — Stripe Smart Retry begins |
| Day 1 | Email: "Payment failed — please update card" |
| Day 4 | Stripe retries — email reminder if still failing |
| Day 7 | Stripe retries — account degraded to read-only |
| Day 14 | Final warning — account suspension in 7 days |
| Day 21 | Account suspended — data retained 30 days |
| Day 51 | Data deletion warning |

**For Customer Invoice Collections (Cleaning Business Client):**

| Trigger | Action |
|---------|--------|
| Due date - 3 days | Automated reminder email |
| Due date | Final reminder |
| Due date + 1 day | Status changes to Overdue |
| Due date + 7 days | Escalation email with late payment notice |
| Due date + 14 days | Flag for manual follow-up in Lustre CRM |

---

## 6. Pricing Strategy & Tier Architecture

The CCO's proposal (ref: CRM-ENT-001, §8) outlines a pricing framework. This section provides the financial justification and refinements from a CFO perspective.

### 6.1 Proposed Tier Structure

| Tier | Price | Target | Seats | Key Financial Features |
|------|-------|--------|-------|----------------------|
| **Starter** | £49/mo (billed monthly) / £39/mo (annual) | Solo operators, 1–3 staff | 3 seats | Basic invoicing, quote management, simple revenue reports |
| **Professional** | £149/mo / £119/mo (annual) | Small teams, 4–15 staff | 10 seats | Full invoicing, invoice payments, advanced analytics, Xero/QB sync |
| **Business** | £399/mo / £319/mo (annual) | Multi-team operators, 16–50 staff | 30 seats | Custom reports, report builder, multi-property, dedicated support |
| **Enterprise** | Custom / £1,500+/mo | Franchise networks, FM companies | Unlimited | White-label portal, SSO, custom contracts, SLA, dedicated CSM |

### 6.2 Annual vs. Monthly Billing Strategy

**CFO Recommendation: Incentivise Annual Billing Strongly**

Annual billing has major financial benefits:
- Reduces churn (customers who pay annually churn at 50–70% lower rate)
- Improves cash flow (12 months revenue upfront)
- Reduces dunning exposure
- Simplifies forecasting

**Discount structure:**
- Annual billing = 20% discount (effectively 2 months free)
- 3-year enterprise agreements = 25% discount + price lock

**Communicate as value, not discount:**
- "Save £120/year" not "20% off"
- Show annual plan first (not monthly)

### 6.3 Usage-Based Pricing Elements

Beyond the base seat fee, consider usage-based pricing for:

| Feature | Model | Rationale |
|---------|-------|-----------|
| SMS notifications | £0.05/SMS above 100/month | Direct cost pass-through |
| Payment processing | 0.5% platform fee (if using Stripe Connect) | Revenue on GMV |
| Storage (invoices, PDFs, documents) | Included up to 5GB; £5/10GB after | Infrastructure cost alignment |
| API calls | Included up to 10k/month; £10/50k after | Enterprise API usage |
| Additional seats | £15/seat/month (Pro), £12/seat/month (Business) | Expansion revenue |

### 6.4 Enterprise Contract Terms (Financial)

For Enterprise tier customers:

| Term | Detail |
|------|--------|
| Contract length | 12–36 months |
| Payment terms | Annual upfront preferred; quarterly NET-30 for large accounts |
| Price lock | Fixed price for contract term |
| True-up | Seat overage billed quarterly |
| SLA credits | Service credits (not cash) for SLA breaches — 5% credit per hour of downtime above SLA |
| Termination for convenience | 90-day notice; no refund of prepaid fees |
| Auto-renewal | Yes, with 60-day notice required to cancel |

### 6.5 Freemium & Trial Strategy

| Option | Recommendation |
|--------|---------------|
| Free tier (permanent) | **No** — operational cost per tenant is non-trivial; free tier cannibalises Starter |
| Free trial (time-limited) | **Yes** — 14-day trial (current) is appropriate; consider extending to 21 days for enterprise |
| Trial credit card | **Require** — reduces time-wasters, improves conversion quality |
| Trial-to-paid conversion | Target 25%+ (industry average: 15–20%) |
| Freemium for specific features | Consider free public quote sharing permanently as a growth/referral lever |

---

## 7. Unit Economics & SaaS Health Metrics

### 7.1 Metrics Framework

Enterprise investors and board members evaluate SaaS businesses on a standard set of unit economics. Lustre must be able to produce these on demand.

#### The SaaS Magic Number

```
SaaS Magic Number = Net New ARR in Period / Sales & Marketing Spend in Prior Period
```

Target: > 0.75 indicates efficient growth; > 1.0 is exceptional.

#### Cohort LTV Model

| Plan | ARPU (Monthly) | Avg. Gross Margin | Avg. Monthly Churn | LTV |
|------|---------------|------------------|-------------------|-----|
| Starter | £39–49 | 75% | 3.5% | £39 × 0.75 / 0.035 = £836 |
| Professional | £119–149 | 78% | 2.0% | £149 × 0.78 / 0.02 = £5,811 |
| Business | £319–399 | 80% | 1.2% | £399 × 0.80 / 0.012 = £26,600 |
| Enterprise | £1,500+ | 82% | 0.5% | £1,500 × 0.82 / 0.005 = £246,000 |

*These are illustrative targets. Actual figures must be tracked and measured.*

#### CAC Targets

| Channel | Estimated CAC | Recommended CAC Cap |
|---------|--------------|-------------------|
| Organic/SEO | £200–500 | £800 (< LTV/3 for Starter) |
| Content/inbound | £300–700 | £1,000 |
| Paid search | £500–1,500 | £2,000 (Professional+) |
| Enterprise outbound | £2,000–8,000 | £10,000 (Business/Enterprise) |

### 7.2 Revenue Quality Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| NRR (Net Revenue Retention) | Revenue retained + expansion from existing customers | > 110% |
| GRR (Gross Revenue Retention) | Revenue retained excluding expansion | > 85% |
| Expansion Rate | Expansion MRR / Starting MRR | > 10% monthly |
| Quick Ratio | (New + Expansion) / (Contraction + Churn) | > 4 |
| Revenue Concentration | % of revenue from top 10 customers | < 30% (reduce concentration risk) |

### 7.3 Operational Efficiency Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| ARR per FTE | Annual recurring revenue / headcount | > £150k |
| Gross Margin | (Revenue − COGS) / Revenue | > 70% |
| Rule of 40 | Revenue Growth % + EBITDA Margin % | > 40 |
| Burn Multiple | Net Burn / Net New ARR | < 1.5 (efficient growth) |
| Infrastructure Cost per Tenant | Monthly Supabase + Vercel + tooling cost per active org | < £3/month (Starter) |

---

## 8. Financial Controls & Compliance

### 8.1 Audit Trail Requirements

The COO's proposal covers technical audit logging. From a financial controls perspective, the audit trail must also capture:

| Event | Required Audit Data |
|-------|-------------------|
| Invoice created | Actor, amount, client, timestamp |
| Invoice modified | Actor, old value, new value, reason |
| Invoice voided | Actor, reason, timestamp |
| Payment recorded | Amount, method, reference, actor |
| Discount applied | Amount, %, reason, authoriser |
| Quote price changed | Old price, new price, actor, reason |
| Plan upgrade/downgrade | Old plan, new plan, price impact, actor |
| Stripe webhook received | Event type, amount, outcome |
| Refund issued | Amount, reason, authoriser, Stripe ref |

### 8.2 Financial Approval Workflows

For enterprise tier, multi-level approval workflows for financial documents:

| Action | Approval Requirement |
|--------|---------------------|
| Issue quote > £5,000 | Manager approval required |
| Apply discount > 15% | Admin approval required |
| Void an invoice | Admin approval + reason required |
| Issue credit note | Admin approval + reason required |
| Write off debt | Admin approval + reason required |

### 8.3 Revenue Recognition

For accounting compliance:

- **Simple jobs:** Revenue recognised on job completion date
- **Recurring contracts:** Revenue recognised pro-rata over contract period
- **Deposits:** Recognised as deferred revenue until job completion
- **Cancelled jobs with deposit:** Requires defined refund/retention policy

### 8.4 GDPR Financial Data Considerations

Financial data is subject to specific retention requirements under UK GDPR and HMRC:

| Data Type | Retention Requirement | Lustre Action |
|-----------|--------------------|--------------|
| Invoices | 6 years (HMRC) | Must not be deleted even if client requests erasure |
| Payment records | 6 years (HMRC) | Retained; personal data fields anonymised |
| VAT records | 6 years | Retained |
| Quote history | Business discretion | Can be deleted within HMRC constraints |

> **Key Conflict:** GDPR right to erasure vs. HMRC 6-year record retention. Lustre must anonymise personal data on invoices while retaining the financial record. This requires careful design.

### 8.5 SOC 2 Type II Alignment (Financial Controls)

For enterprise sales into larger organisations, SOC 2 Type II certification will be required. Financial controls relevant to SOC 2:

- Change management: all billing system changes tracked and approved
- Access controls: financial data access logged and restricted
- Availability: billing system uptime monitored and SLA'd
- Data integrity: financial records immutable once invoice is issued
- Confidentiality: financial data encrypted at rest and in transit

---

## 9. Investment Plan & Budget Allocation

### 9.1 Development Cost Estimates

This section provides financial framing for the build costs described across all three enterprise proposals (CFO, CCO, COO).

#### Phase 1 — Financial Foundation (Months 1–3)

| Work Item | Owner Doc | Estimated Dev Days | Priority |
|-----------|-----------|-------------------|----------|
| Stripe subscription billing (full integration) | COO + CFO | 10 days | 🔴 Critical |
| Invoice data model and generation | CFO | 8 days | 🔴 Critical |
| UK-compliant invoice PDF | CFO | 3 days | 🔴 Critical |
| Invoice payment via Stripe | CFO | 5 days | 🔴 Critical |
| Basic revenue dashboard (MRR, ARR, chart) | CFO | 6 days | 🔴 Critical |
| Dunning email sequences | CFO + COO | 3 days | 🟠 High |
| Trial conversion flow | CFO | 2 days | 🟠 High |
| Plan enforcement (seat/feature limits) | COO + CFO | 4 days | 🟠 High |
| **Phase 1 Total** | | **~41 dev days** | |

#### Phase 2 — Revenue Operations (Months 3–6)

| Work Item | Owner Doc | Estimated Dev Days | Priority |
|-----------|-----------|-------------------|----------|
| Customer-facing revenue analytics | CFO | 10 days | 🟠 High |
| Quote pipeline analytics | CFO | 5 days | 🟠 High |
| Client LTV reporting | CFO | 4 days | 🟠 High |
| Xero/QuickBooks integration (export) | CFO + COO | 8 days | 🟠 High |
| Stripe Connect (payment collection) | CFO | 10 days | 🟡 Medium |
| Cohort analysis dashboard (internal) | CFO | 5 days | 🟡 Medium |
| Contract management (multi-year) | CFO + CCO | 8 days | 🟡 Medium |
| Financial approval workflows | CFO | 4 days | 🟡 Medium |
| **Phase 2 Total** | | **~54 dev days** | |

#### Phase 3 — Enterprise Financial Analytics (Months 6–12)

| Work Item | Owner Doc | Estimated Dev Days | Priority |
|-----------|-----------|-------------------|----------|
| Custom report builder | CFO + CCO | 15 days | 🟠 High |
| Scheduled report delivery | CFO | 4 days | 🟡 Medium |
| Board reporting pack (internal) | CFO | 5 days | 🟡 Medium |
| Deferred revenue accounting | CFO | 5 days | 🟡 Medium |
| Multi-currency support | CFO | 8 days | 🟢 Future |
| Revenue forecasting model | CFO | 10 days | 🟢 Future |
| SOC 2 financial controls audit | CFO | 5 days | 🟡 Medium |
| **Phase 3 Total** | | **~52 dev days** | |

**Total estimated development investment: ~147 dev days across 12 months**

### 9.2 Infrastructure Cost Projections

As the platform scales, infrastructure costs must be modelled to protect gross margin:

| Scale | Active Orgs | Est. Monthly Infra Cost | Cost per Tenant | Gross Margin Risk |
|-------|------------|------------------------|----------------|-------------------|
| Current (MVP) | < 50 | ~£150 | ~£3.00 | Manageable |
| 500 orgs | 500 | ~£800 | ~£1.60 | Good — economies of scale |
| 2,000 orgs | 2,000 | ~£2,500 | ~£1.25 | Excellent |
| 10,000 orgs | 10,000 | ~£9,000 | ~£0.90 | Very strong |

*Infrastructure cost assumes Supabase, Vercel, Resend, Upstash Redis, Sentry.*

### 9.3 Revenue Targets to Justify Investment

To justify the ~147 dev days of CFO-scope investment:

| Milestone | ARR Target | Orgs Required (avg £1,500 ARPA) | Timeline |
|-----------|-----------|--------------------------------|----------|
| Break-even on Phase 1 | £50k ARR | ~33 paying orgs | Month 6 |
| Growth stage | £250k ARR | ~167 paying orgs | Month 12 |
| Series A readiness | £1M ARR | ~667 paying orgs | Month 18 |
| Enterprise credibility | £3M ARR | 50+ enterprise + 1,500+ SMB | Month 30 |

---

## 10. ROI Framework & Business Case

### 10.1 Value Delivered by Each CFO Initiative

#### Billing Integration (Phase 1)

- **Without it:** Revenue is uncollected; churn is untracked; growth is unmeasurable
- **Value unlocked:** Every pound of subscription revenue; enables fundraising; enables enterprise sales
- **ROI:** Infinite — no alternative path to revenue automation exists

#### Invoice & Payment System (Phase 1–2)

- **Market differentiation:** Most competitors (Jobber, Tradify) offer invoicing; absence is a deal-breaker
- **Revenue impact:** Enables Stripe Connect platform fee (0.5% of GMV processed)
- **Example:** 100 cleaning businesses each invoicing £10k/month = £1M GMV/month × 0.5% = £5,000/month additional revenue
- **12-month revenue opportunity:** £60k (conservative at 100 customers using payment collection)

#### Analytics & Reporting (Phase 1–3)

- **Retention impact:** Analytics features are the #1 driver of product stickiness in vertical SaaS
- **Upsell enabler:** Custom report builder is exclusive to Business/Enterprise tiers — drives upgrades
- **NRR impact:** Estimate +5–10% improvement in NRR from analytics-driven retention
- **12-month revenue impact on £250k ARR base:** +£12,500–25,000 in retained revenue

#### Enterprise Contract Management (Phase 2–3)

- **Average deal size:** Enterprise contracts at £1,500–5,000/month vs. £49–399 SMB
- **Sales cycle impact:** Proper contract tooling reduces enterprise sales cycle by 20–30%
- **Revenue concentration:** 10 enterprise customers = £18k–60k/month ARR

### 10.2 The Financial Case for Enterprise Features

| Feature Investment | One-Time Dev Cost* | Annual Revenue Opportunity | Payback Period |
|-------------------|--------------------|--------------------------|----------------|
| Stripe Billing | £20,000 | All subscription revenue | Immediate |
| Invoicing System | £16,000 | £60k+ (GMV fees) | < 4 months |
| Financial Analytics | £20,000 | +£25k NRR improvement | < 10 months |
| Report Builder | £30,000 | Tier upgrade revenue | < 12 months |
| Contract Management | £16,000 | Enterprise deal enabler | < 6 months |

*Based on £500/day blended developer rate*

---

## 11. Board & Investor Reporting

### 11.1 Monthly Board Pack (Financial Section)

Once Lustre reaches Series A readiness, the board will expect a monthly financial pack containing:

**Section 1: Revenue Overview**
- MRR bridge (waterfall: previous MRR → new → expansion → contraction → churn → current)
- ARR and growth rate (MoM and YoY)
- Revenue vs. budget/forecast
- NRR and GRR

**Section 2: Customer Metrics**
- New customers added
- Churned customers (count + MRR)
- Active customers by plan tier
- Trial conversion rate (this month and trailing 3M average)

**Section 3: Unit Economics**
- CAC by channel
- LTV by plan tier
- LTV:CAC ratio
- Payback period

**Section 4: Financial Statements**
- P&L summary (Revenue, COGS, Gross Profit, OpEx, EBITDA)
- Cash position and runway
- Burn rate (if pre-profitability)

**Section 5: Forecast**
- 3-month rolling revenue forecast
- ARR forecast to year end
- Headcount plan and cost trajectory

### 11.2 Investor Metrics Dashboard

For fundraising purposes, Lustre should be able to produce the following on demand:

- Historical MRR/ARR chart (from inception)
- Cohort retention table (12+ months)
- Waterfall chart (MRR components)
- NRR trend
- Gross margin trend
- Burn and runway

**These metrics should be generated programmatically** from the billing and analytics infrastructure — not assembled manually in spreadsheets. The ability to pull live metrics in a due diligence process is a signal of operational maturity.

---

## 12. CFO Phased Roadmap

This roadmap is designed to run in parallel with and complement the COO (OPS-ENT-001) and CCO (CRM-ENT-001) roadmaps.

### Phase 1: Financial Foundation (Months 1–3)

**Goal:** Get the money engine running. Before scaling, Lustre must be able to collect, track, and report revenue.

| # | Deliverable | Priority | Dependency |
|---|-------------|----------|-----------|
| 1.1 | Stripe subscription billing (Products, Prices, Checkout, Webhooks) | 🔴 Critical | COO Phase 1 |
| 1.2 | Trial-to-paid conversion flow with credit card requirement | 🔴 Critical | 1.1 |
| 1.3 | Plan enforcement (feature/seat limits by plan) | 🔴 Critical | 1.1 |
| 1.4 | Invoice data model, generation, and UK-compliant PDF | 🔴 Critical | None |
| 1.5 | Invoice send flow (email via Resend + shareable link) | 🔴 Critical | 1.4 |
| 1.6 | Basic revenue dashboard: MRR, ARR, active accounts | 🔴 Critical | 1.1 |
| 1.7 | Dunning email sequence for failed payments | 🟠 High | 1.1 |
| 1.8 | Stripe Customer Portal for self-serve billing management | 🟠 High | 1.1 |
| 1.9 | Customer revenue snapshot (job revenue MTD, quote pipeline) | 🟠 High | None |

**Phase 1 Success Criteria:**
- Stripe billing live; first paying customer billed automatically
- Invoice generation tested and UK-compliant
- Basic MRR dashboard showing real-time subscription data

---

### Phase 2: Revenue Operations (Months 3–6)

**Goal:** Build the analytics layer and complete the quote-to-cash pipeline.

| # | Deliverable | Priority | Dependency |
|---|-------------|----------|-----------|
| 2.1 | Customer-facing revenue dashboard (full analytics) | 🟠 High | Phase 1 data |
| 2.2 | Invoice payment via Stripe Payment Link | 🟠 High | 1.4, Stripe |
| 2.3 | Invoice aging report and overdue automation | 🟠 High | 2.2 |
| 2.4 | Quote pipeline analytics (value, conversion, expiry) | 🟠 High | None |
| 2.5 | Client LTV and revenue history | 🟠 High | None |
| 2.6 | Team revenue and utilisation metrics | 🟡 Medium | None |
| 2.7 | Xero integration (export invoices and payments) | 🟡 Medium | 1.4 |
| 2.8 | QuickBooks integration | 🟡 Medium | 2.7 |
| 2.9 | Cohort analysis dashboard (internal Lustre metrics) | 🟡 Medium | 1.1 data |
| 2.10 | CAC and LTV tracking infrastructure | 🟡 Medium | Analytics |

**Phase 2 Success Criteria:**
- Customers can collect payment via Stripe on invoices
- Full revenue analytics available in product
- Accounting sync live for at least one platform (Xero or QuickBooks)
- Lustre internal cohort data visible for board reporting

---

### Phase 3: Enterprise Financial Platform (Months 6–12)

**Goal:** Differentiated, enterprise-grade financial tooling that supports £1,500+/month contracts.

| # | Deliverable | Priority | Dependency |
|---|-------------|----------|-----------|
| 3.1 | Custom report builder (dimensions, metrics, save, schedule) | 🟠 High | Phase 2 data |
| 3.2 | Scheduled report delivery via email | 🟡 Medium | 3.1 |
| 3.3 | Stripe Connect (platform payment processing + fee) | 🟡 Medium | Phase 2 |
| 3.4 | Contract management (multi-year, renewal tracking) | 🟡 Medium | CCO roadmap |
| 3.5 | Deferred revenue tracking for deposits | 🟡 Medium | 1.4 |
| 3.6 | Revenue forecasting model | 🟡 Medium | Phase 2 data |
| 3.7 | Board reporting pack (automated PDF) | 🟡 Medium | Phase 2 |
| 3.8 | Financial approval workflows (quotes, discounts, voids) | 🟡 Medium | RBAC (COO) |
| 3.9 | Multi-currency support (EUR, USD for international) | 🟢 Future | 1.4 |
| 3.10 | SOC 2 Type II financial controls audit readiness | 🟡 Medium | COO security |

**Phase 3 Success Criteria:**
- Report builder shipped in Business/Enterprise tier
- Stripe Connect live and earning platform fees
- Enterprise contract management operational
- SOC 2 audit initiated

---

## 13. Financial Risk Register

| Risk | Probability | Financial Impact | Mitigation |
|------|------------|-----------------|-----------|
| Stripe integration delayed beyond Month 2 | Medium | No automated revenue collection; growth ceiling | Prioritise as Day 1 task; assign dedicated developer |
| Trial conversion rate < 15% | Medium | Slow ARR growth; funding pressure | A/B test onboarding; add in-trial prompts; require card upfront |
| Involuntary churn > 5%/month | Low-Medium | Treadmill effect (adding = losing) | Smart Retry + dunning; proactive card update prompts |
| Enterprise deal requires SOC 2 before purchase | Medium | Lost enterprise ARR | Begin audit process at Month 6; use Vanta or Drata to automate |
| Xero API changes break integration | Low | Customer complaints; churn risk | Pin to stable API version; monitor changelog; abstract integration layer |
| Infrastructure costs spike with growth | Low | Gross margin compression | Monitor cost per tenant monthly; set alert thresholds |
| HMRC audit of VAT handling | Low | Financial penalty; reputational damage | Engage accountant to validate VAT implementation; use Stripe Tax |
| Payment data breach (PCI DSS) | Very Low | Regulatory fines; customer loss | Use Stripe Elements (no raw card data on Lustre servers); achieve PCI SAQ A |
| Revenue concentration in top 5 accounts | Medium | > 40% ARR loss risk if one churns | Diversify enterprise pipeline; monitor revenue concentration monthly |
| Pricing too low for enterprise | Medium | Undervalued perception; margin pressure | Annual pricing review; enterprise pricing should be custom/consultative |

---

## 14. Success Metrics & CFO KPIs

### 14.1 Phase 1 KPIs (Month 3)

| KPI | Target |
|-----|--------|
| Billing live and processing | Yes |
| First automated invoice generated | Yes |
| MRR dashboard accurate within 1% | Yes |
| Trial conversion rate | > 15% |
| Failed payment recovery rate | > 60% (via dunning) |

### 14.2 Phase 2 KPIs (Month 6)

| KPI | Target |
|-----|--------|
| MRR | > £10,000 |
| ARR | > £120,000 |
| NRR | > 100% |
| Gross margin | > 68% |
| Customers using analytics features | > 40% of paid accounts |
| Invoice payment via Stripe adoption | > 25% of paid accounts |
| Average invoice payment time | < 14 days |

### 14.3 Phase 3 KPIs (Month 12)

| KPI | Target |
|-----|--------|
| ARR | > £500,000 |
| NRR | > 110% |
| Gross margin | > 73% |
| LTV:CAC ratio | > 3:1 |
| Report builder active users | > 30% of Business/Enterprise |
| Enterprise accounts | > 5 |
| GMV processed via Stripe Connect | > £500,000 |
| Revenue concentration (top 10) | < 40% of ARR |

### 14.4 Long-Term Financial Health Scorecard

| Metric | Year 1 Target | Year 2 Target | Year 3 Target |
|--------|--------------|--------------|--------------|
| ARR | £500k | £2M | £6M |
| NRR | 105% | 112% | 118% |
| Gross Margin | 70% | 74% | 77% |
| Rule of 40 | 20 | 35 | 45 |
| ARR per FTE | £100k | £150k | £200k |
| Payback Period | 18 months | 14 months | 10 months |

---

## Appendix A: Cross-Proposal Dependency Map

This proposal is designed to work in parallel with the COO and CCO plans. Key dependencies:

| CFO Item | Depends On (COO ref) | Depends On (CCO ref) |
|----------|---------------------|---------------------|
| Stripe billing | OPS §5 (Billing infrastructure) | — |
| Plan enforcement | OPS §4 (RBAC, seat management) | CRM §5 (pricing tiers) |
| Dunning emails | OPS §7 (async email) | — |
| Invoice payments | OPS §5 (Stripe), OPS §7 (async) | — |
| Analytics dashboards | OPS §6 (observability) | CRM §5 (analytics features) |
| Report builder | OPS §6 | CRM §5 (enterprise reporting) |
| Xero/QB integration | OPS §11 (API strategy) | — |
| Contract management | OPS §4 (RBAC) | CRM §5 (commercial management) |
| Approval workflows | OPS §4 (RBAC, roles) | — |
| SOC 2 controls | OPS §3 (security) | — |

---

## Appendix B: Recommended Tooling

| Category | Recommended Tool | Rationale |
|----------|-----------------|-----------|
| Payment processing | Stripe (Billing + Connect) | Industry standard; best UK VAT support |
| Subscription management | Stripe Billing | Integrates with existing Stripe intent |
| Dunning | Stripe Smart Retry + custom Resend emails | Cost-effective; no extra vendor |
| Accounting sync | Xero API first (UK market leader) | UK-preferred; strong API |
| Revenue metrics | Custom (built on Supabase data) | Avoid vendor lock-in; full control |
| SOC 2 automation | Vanta | Fastest path to SOC 2; integrates with GitHub, AWS, Vercel |
| Board reporting | Custom PDF (react-pdf) | Already have PDF renderer; no new tooling |
| Payment links | Stripe Payment Links | Zero-code, instant implementation |
| Tax calculation | Stripe Tax | Auto-handles UK VAT, EU VAT |

---

*Document prepared by the Chief Financial Officer in conjunction with the BA team.*
*To be read alongside: CRM-ENT-001 (CCO) and OPS-ENT-001 (COO).*
*Next review: Monthly cadence aligned with board reporting cycle.*
