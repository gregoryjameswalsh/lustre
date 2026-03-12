# THE PLAN — v2
**Author:** CEO
**Date:** March 2026
**Status:** Final — Version 2.0 (full exec synthesis)
**Horizon:** 12 months (Q2 2026 – Q1 2027)
**Inputs:** CRO-ENT (CRO), CTO-ENT-001 (CTO), CISO-ENT-001 (CISO), CFO-ENT-001 (CFO), OPS-ENT-001 (COO), CRM-ENT-001 (CCO), CPO-ENT-001 (CPO)

---

## Preface: I've Read All Seven Plans

Version 1 of this document was written having read only the CRO's plan. This is the complete version, written after reading all seven executive proposals in full. It supersedes v1.

Six smart people have written detailed, well-reasoned plans. The product of reading them all is not one master list of everything everyone wants — that would be 400 items nobody will execute. The product is **clarity about what to do first, why, and what to defer without losing**. That is what this document provides.

---

## The One-Line Summary

Get paying customers in 30 days while simultaneously fixing the two things that will kill every enterprise deal if left unresolved: no billing infrastructure, and no security compliance baseline.

---

## Where We Stand: The Honest Assessment

The exec team has landed on a consistent diagnosis across seven independent documents. That level of alignment is rare and valuable. Here is the shared view:

**What we have built (and it genuinely is good):**
- Multi-tenant Row-Level Security at the database layer — most MVPs don't do this, and it saves us months of remediation
- A type-safe TypeScript codebase, server-side rendering from day one, and clean data models for clients, properties, jobs, quotes, and activities
- Quote PDF generation with shareable links and view tracking — a genuine differentiator, the feature our customers' customers already see
- An immutable audit log and security headers — the CISO's assessment is that this is better than it has any right to be at MVP stage
- UK-native (VAT, GBP, address formats) — a competitive moat against US and Australian competitors
- An onboarding wizard that gets someone to their first quote in under 30 minutes

**What is critically missing (from all seven plans combined):**

| Gap | Who Flagged | Revenue Impact | Risk if Left |
|---|---|---|---|
| No Stripe billing | CRO, CFO, COO, CCO | Cannot collect payment | Zero revenue indefinitely |
| No team invitation flow | COO, CCO, CPO | Enterprises can't onboard | Disqualified from enterprise |
| No MFA | CISO, CRO, COO | Enterprise procurement blocked | Failed security questionnaires |
| No product analytics | CPO | Building blind | Wrong features, no insight |
| No CI/CD or tests | CTO, COO | Deployment risk | Regression breaks enterprise deal |
| No error monitoring | CTO, COO | Issues invisible until customers complain | Enterprise SLA breach |
| Service role key in request path | CTO, CISO | — | Single largest security vulnerability |
| No schema migration tooling | CTO | — | Data loss risk on every deploy |
| No GDPR tooling | CISO, COO, CCO | Enterprise deals blocked | Legal enforcement risk |
| No vendor DPAs | CISO | Enterprise procurement blocked | GDPR non-compliance |
| No RBAC beyond 2 roles | CISO, COO, CCO, CRO | Enterprise deals blocked | Disqualified from enterprise |
| No in-product reporting | CRO, CPO, CCO | Renewals hard to justify | High churn risk |
| No sales pipeline | CCO | — | Cannot manage enterprise funnel |
| No SSO/SAML | CISO, COO, CCO, CRO | Enterprise IT won't approve | Enterprise deals blocked |

---

## The CEO's Decisions

Before laying out the plan, here are the calls I am making as CEO where the exec plans create tension:

### Decision 1: Revenue and Technical Foundation Run in Parallel — Neither Waits

The CTO's recommendation to refuse enterprise contracts until the technical foundation is complete is correct in principle but commercially wrong in practice. Design-partner agreements are structured with staged commitments — they sign now at a discount, we deliver security features by Month 3. We are not signing full enterprise contracts on an unresolved technical base. We are securing commercial intent now and delivering the full platform against a timeline.

This means Tracks 1 (Revenue), 2 (Technical Foundation), and 3 (Security) all run simultaneously from Day 1. This requires prioritisation discipline, not sequential execution.

### Decision 2: PostHog Ships in Week 2, Before Any New Feature

The CPO is correct: we are building blind. Every feature we add without measurement is a guess. PostHog (or equivalent) ships in Week 2, full event taxonomy instrumented, before any net-new feature work begins. No exceptions.

### Decision 3: GDPR Compliance is Not a Feature — It's a Legal Baseline

The CISO is correct that GDPR obligations are legal requirements, not product features. DPAs with Supabase, Vercel, Resend, and Upstash are paperwork that can be completed this week. GDPR documentation (data processing register, legal basis for processing, privacy policy update) is a Week 2 task for the COO, not a Phase 2 engineering task. The engineering work (erasure flows, DSAR export) follows in Month 2.

### Decision 4: The CRO's Pricing Stands — No Discounting Without Design-Partner Structure

The pricing tiers (Starter £39/mo, Professional £119/mo, Business £319/mo, Enterprise from £1,500/mo) are correct and aligned across the CFO and CRO plans. We do not discount outside the formal design-partner programme. Discounting before we have data trains the market to wait for deals.

### Decision 5: CCO's Enterprise CRM Features Are Phase 2, Not Phase 1

The CCO's plan (sales pipeline, custom fields, tags, automation, contract management) describes a very compelling enterprise CRM. These are right features — they just aren't Phase 1 features. Phase 1 is about getting paying customers through billing, invitations, RBAC, and basic reporting. The CCO's feature list becomes the Phase 2 product roadmap from Month 5.

### Decision 6: SOC 2 Starts in Month 9 — Not Later, Not Earlier

The CISO's SOC 2 timeline is correct. Type I requires readiness; Type II requires a 6+ month observation period. Starting the Type I process in Month 9 means we can have Type II completed by Month 18-20 — the right timeline for the enterprise accounts we're signing in Year 1 who will require it at renewal.

### Decision 7: No New Hires Until 10 Paying Customers

The CRO plan's hiring recommendations are right. We do not hire sales staff until the playbook is proven. Ten paying customers (any tier) is the trigger for the first AE hire. Five enterprise accounts is the trigger for the CSM.

---

## The Priority Matrix

Everything across all seven plans, collapsed into a single priority order. P0 items are non-negotiable — they block revenue or represent active risk. P1 items are required for enterprise readiness. P2 items are important but can follow P1 completion.

### P0 — Do These or Nothing Else Works (Weeks 1–4)

| Item | Owner | Effort | Why P0 |
|---|---|---|---|
| Remove service role key from app request path | CTO | 1 day | Single largest security vulnerability per CTO + CISO |
| Schema migration tooling (Supabase CLI) | CTO | 2 days | Data loss risk on every deploy |
| Stripe billing integration (Checkout + webhooks) | CTO + CFO | 10 days | Cannot collect any revenue |
| Team invitation flow | CTO | 5 days | Enterprises cannot onboard teams |
| Sentry error tracking | CTO | 1 day | Flying blind in production |
| CI/CD pipeline (GitHub Actions) | CTO | 3 days | Deployment without validation is reckless |
| Uptime monitoring (Checkly) | COO | 1 day | No visibility into downtime |
| PostHog analytics instrumentation | CPO | 3 days | Every subsequent decision needs data |
| DPAs with Supabase, Vercel, Resend, Upstash | CISO + COO | 1 day (paperwork) | GDPR legal obligation |
| GDPR documentation (register, legal basis, privacy policy) | CISO + COO | 3 days (paperwork) | Legal obligation |
| Pricing page live on marketing site | CPO + CRO | 3 days | Self-serve impossible without it |
| 14-day trial enforcement for all new signups | CTO + CRO | 2 days | No conversion pressure without it |
| Make rate limiting mandatory (fail-closed) | CTO | 2 days | Current fail-open is a security gap |
| Audit log — expand to all material actions | CTO + CISO | 3 days | Enterprise compliance requirement; legal risk |
| HubSpot CRM set up (internal sales pipeline) | CRO | 1 day (setup) | No pipeline visibility = no sales discipline |
| Begin 5 design-partner conversations | CRO + CEO | 0 days (calls) | First revenue depends on this |

**P0 checkpoint: By end of Week 4, billing is live, first customer has paid, analytics is running, and the two critical security gaps (service role key, fail-open rate limiting) are closed.**

---

### P1 — Enterprise Readiness (Months 2–4)

These must be complete before we can close any enterprise deal with confidence.

**Engineering (Months 2–3):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| MFA / TOTP implementation | CTO + CISO | 5 days | CISO, COO, CRO |
| GDPR data export (CSV ZIP) | CTO | 3 days | CISO, COO, CCO |
| GDPR right to erasure / account deletion | CTO | 3 days | CISO, COO |
| RBAC expansion: admin / manager / operative / viewer | CTO + CISO | 8 days | CISO, COO, CCO, CRO |
| Cursor-based pagination on all list queries | CTO | 3 days | CTO |
| Structured error handling library | CTO | 3 days | CTO |
| Password reset UI | CTO | 2 days | COO, CISO |
| Session management UI (revoke active sessions) | CTO | 2 days | CISO |
| Unit test suite (Vitest) — core utilities + RLS | CTO | 5 days | CTO, COO |
| Supabase PITR enabled + backup configuration | CTO | 1 day | CTO, COO |
| In-product reporting v1 (executive summary dashboard) | CPO + CTO | 8 days | CRO, CPO, CCO |
| Onboarding redesign (activation-focused flow) | CPO | 5 days | CPO |
| Global search (Cmd+K palette) | CPO + CTO | 4 days | CPO |
| Trial-to-paid email sequence (5 emails, Resend) | CPO + CRO | 3 days | CRO, CPO |
| UK-compliant invoice PDF generation | CFO + CTO | 8 days | CFO, CCO |
| Structured async job queue (Inngest) — email + PDF | CTO | 5 days | COO, CFO |
| Incident response plan documented | CISO + COO | 3 days (doc) | CISO |
| Internal revenue dashboard (MRR, ARR, churn) | CFO + CTO | 6 days | CFO, CRO |

**Operations / Compliance (Months 2–3):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| Help centre — 8 launch articles | COO + CPO | 5 days | COO, CPO |
| Status page (Betterstack) | COO | 1 day | COO |
| In-app support widget (Intercom or Crisp) | COO | 1 day | COO |
| SLA definitions per tier (documented) | COO + CRO | 2 days | COO, CRO |
| On-call rotation established | CTO + COO | 1 day | COO |
| Responsible disclosure / bug report email | CISO | 1 day | CISO |
| Data retention policy defined and documented | CISO + COO | 2 days | CISO, COO |
| Security incident response runbook | CISO + CTO | 3 days | CISO |

**Commercial (Months 2–4):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| Design-partner contracts signed (5 accounts) | CRO + CEO | — | CRO |
| Sales playbook documented (from design-partner calls) | CRO | 5 days | CRO |
| Enterprise contract template + DPA template | CRO + CISO | 3 days | CISO, CRO |
| Competitive battle cards | CRO | 2 days | CRO |
| NPS survey deployed (in-product, Day 30 trigger) | CPO | 1 day | CPO |
| Case study #1 published | CRO + CPO | 3 days | CRO |

**P1 checkpoint: By end of Month 4, we have 5 paying enterprise accounts, billing is running, MFA is live, RBAC has 4 roles, GDPR compliance is documented and enforced in the product, in-product reporting v1 is live, and we have a documented sales playbook.**

---

### P2 — Scale and Enterprise Feature Completion (Months 5–8)

These items are required for Phase 2 enterprise growth but depend on P0 and P1 being complete.

**Engineering (Months 5–6):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| SSO / SAML via WorkOS | CTO + CISO | 10 days | CTO, CISO, COO, CCO, CRO |
| Public REST API v1 (read endpoints first) | CTO | 12 days | CTO, COO, CCO, CRO |
| API key management UI | CTO | 3 days | CTO, COO |
| Webhook system | CTO | 5 days | CTO, COO, CCO |
| Sales pipeline (deal stages, kanban, list view) | CCO + CPO + CTO | 10 days | CCO |
| Custom fields (text, number, date, dropdown) | CCO + CTO | 8 days | CCO, CPO |
| Tags and segmentation | CCO + CTO | 5 days | CCO |
| Advanced filtering and saved views | CCO + CPO | 5 days | CCO |
| CSV bulk import with field mapping | CCO + CTO | 6 days | CCO |
| E2E test suite (Playwright — critical journeys) | CTO | 8 days | CTO, COO |
| Feature flag infrastructure (PostHog flags) | CPO + CTO | 2 days | CPO, COO |
| Scheduled async jobs (reminders, expiry, trial warnings) | CTO | 5 days | COO |
| Supabase Storage for logos and files | CTO | 3 days | CTO, COO |

**Engineering (Months 7–8):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| Xero integration + App Marketplace listing | CTO + CRO | 15 days | CRO, CCO, COO |
| Google Calendar sync (bidirectional) | CTO | 8 days | CRO, COO, CCO |
| In-product reporting v2 (operations + commercial dashboards) | CPO + CTO | 10 days | CRO, CPO, CCO |
| Automated email sequences (lead nurture, post-job) | CCO + CTO | 8 days | CCO |
| Manager approval workflows (quote threshold) | CCO + CTO | 5 days | CCO |
| Basic automation rules engine (5 triggers, 5 actions) | CCO + CTO | 12 days | CCO |
| Duplicate detection on client create/import | CCO + CTO | 3 days | CCO |
| Mobile optimisation — operative view + PWA | CPO + CTO | 8 days | CPO |
| Accessibility v1 — WCAG 2.1 Level A | CPO | 5 days | CPO |

**Security (Months 5–6):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| Cyber Essentials Plus certification | CISO + COO | 10 days (process) | CISO (£1,500–£3,000) |
| Penetration test (external, accredited) | CISO | 3 days (manage) | CISO (£5,000–£12,000) |
| CSP — remove unsafe-inline, implement nonces | CTO + CISO | 2 days | CISO, COO |
| Dependency vulnerability scanning in CI | CTO + CISO | 1 day | CTO, CISO |
| Field-level encryption for access codes / sensitive PII | CTO + CISO | 5 days | CISO |
| SCIM provisioning for SSO user lifecycle | CTO + CISO | 8 days | CISO |

**Commercial (Months 5–8):**

| Item | Owner | Effort | Source |
|---|---|---|---|
| First AE hired | CRO | — | CRO |
| First SDR hired | CRO | — | CRO |
| First CSM hired | CRO | — | CRO |
| BICSc association partnership signed | CRO | — | CRO |
| Referral programme launched (Rewardful) | CRO | 3 days | CRO, CPO |
| Quarterly Business Review cadence started (enterprise) | CRO + CSM | — | CRO |
| Xero App Marketplace listing live | CRO + CTO | — | CRO |

**P2 checkpoint: By end of Month 8, SSO is live, API is live, sales pipeline is in product, custom fields are available, Xero is integrated, pen test is passed, Cyber Essentials Plus is certified, and we have 20 paying enterprise accounts.**

---

### P3 — Scale and Enterprise Premium (Months 9–12)

| Item | Owner | Source |
|---|---|---|
| Multi-branch / multi-location support | CTO + CCO | CRO, CCO |
| SOC 2 Type I audit initiated | CISO | CISO (£15,000–£40,000) |
| SOC 2 compliance tooling (Vanta or Drata) | CISO | CISO (£150–300/mo) |
| QuickBooks integration | CTO + CRO | CRO, CCO |
| Zapier connector published | CTO | CRO, COO, CCO |
| Custom report builder | CPO + CTO | CFO, CCO, CRO |
| Account/company hierarchy (B2B) | CCO + CTO | CCO |
| Contract management and recurring service agreements | CCO + CFO + CTO | CCO, CFO |
| Invoice payment via Stripe (for customers' clients) | CFO + CTO | CFO |
| Stripe Connect / payment collection | CFO + CTO | CFO |
| Scheduled email reports (weekly/monthly digest) | CPO + CFO | CPO, CFO |
| Client self-service portal | CCO + CPO | CCO, CPO |
| Accessibility v2 — WCAG 2.1 Level AA | CPO | CPO |
| i18n scaffolding (next-intl, currency config) | CPO + CTO | CPO |
| Channel partner programme live | CRO | CRO |
| Second AE + second CSM hired | CRO | CRO |
| Territory management | CCO | CCO |
| Security awareness training programme | CISO | CISO |
| Annual penetration test (second) | CISO | CISO |
| Board pack automation | CFO | CFO |

---

## The Phased Plan

### Phase 1 — "First Revenue + Foundation" (Months 1–4)
**Revenue target: £75K ARR. 5 paying enterprise accounts. Billing live.**

This phase runs three parallel tracks simultaneously. There is no sequential dependency between them — they all start on Day 1.

**Track 1: Revenue (Weeks 1–4)**
```
Week 1:  Design-partner outreach begins (CEO + CRO, 10 prospects identified)
Week 1:  Service role key removed from request path
Week 1:  Schema migration tooling configured
Week 2:  Stripe billing integration started
Week 2:  PostHog analytics live and instrumented
Week 2:  DPAs signed with all sub-processors (Supabase, Vercel, Resend, Upstash)
Week 3:  Stripe billing live (Checkout + webhooks handling)
Week 3:  Pricing page live on marketing site
Week 3:  Trial-to-paid email sequence live in Resend
Week 4:  Team invitation flow live
Week 4:  14-day trial enforcement live
Week 4:  First customer converted to paid plan
Month 2: UK-compliant invoice PDF generation live
Month 2: In-product reporting v1 (executive summary dashboard)
Month 2: Internal revenue dashboard (MRR, ARR, churn) for CEO/CFO view
Month 3: First design-partner case study published
Month 4: 5 enterprise accounts signed and paying
```

**Track 2: Technical Foundation (Weeks 1–6)**
```
Week 1:  Sentry error tracking live
Week 1:  Schema migration tooling (Supabase CLI)
Week 1:  Service role key removed (security critical)
Week 2:  CI/CD pipeline (GitHub Actions) — lint, build, npm audit on every PR
Week 2:  Uptime monitoring (Checkly) — alerts within 2 minutes
Week 2:  Rate limiting made mandatory (fail-closed)
Month 2: Cursor-based pagination on all list queries
Month 2: Structured error handling library
Month 2: Structured logging (Pino + Axiom)
Month 2: PITR enabled + daily backup configured
Month 2: Unit test suite (Vitest) — core utilities, RLS policy validation
Month 2: Async job queue (Inngest) — email sends, PDF generation, retries
Month 3: Status page live (Betterstack)
```

**Track 3: Security & Compliance (Weeks 1–8)**
```
Week 1:  DPAs signed with all sub-processors (no code — paperwork)
Week 2:  GDPR documentation: data processing register, legal basis, sub-processor list
Week 2:  Privacy policy updated to reflect actual data processing
Week 2:  Incident response plan drafted and published internally
Week 2:  Responsible disclosure email published
Month 2: MFA / TOTP implementation live (mandatory for admin role)
Month 2: GDPR data export (admin-triggered, ZIP with all org data)
Month 2: Right to erasure / account deletion flow
Month 2: Session management UI (revoke active sessions)
Month 2: Audit log expanded to cover all material events
Month 3: Password reset UI (surprising this doesn't exist)
Month 3: RBAC expanded to 4 roles (admin / manager / operative / viewer)
Month 4: Enterprise contract template + DPA template for customers
```

**Track 4: Product Foundation (Weeks 2–12)**
```
Week 2:  PostHog live — Day 1 event taxonomy instrumented
Week 3:  Feature flag infrastructure (PostHog flags) — all new features behind flags
Month 2: NPS survey deployed (Day 30 trigger for new accounts)
Month 2: Onboarding redesign — activation-focused, real quote in first session
Month 3: Global search (Cmd+K palette)
Month 3: Mobile optimisation — operative "My Jobs Today" view
Month 3: Help centre — 8 launch articles
Month 3: In-app support widget (Intercom)
Month 4: In-product reporting v1 live (quote pipeline, revenue, follow-ups)
```

---

### Phase 2 — "Build the Engine" (Months 5–8)
**Revenue target: £300K ARR. 20 enterprise accounts. First hires made.**

Phase 2 is the enterprise feature layer, the sales team, and the third-party integrations. Triggered by: billing live, 5 paying customers, sales playbook documented.

**Enterprise product (Months 5–6):**
- SSO / SAML via WorkOS (the CISO and CTO both recommend WorkOS over building SAML from scratch)
- Public REST API v1 — read endpoints for clients, jobs, quotes
- API key management in settings
- Sales pipeline (deal stages, kanban view, conversion tracking)
- Custom fields (text, number, date, dropdown — EAV pattern per CCO + CTO recommendation)
- Tags and segmentation
- Advanced filtering and saved views

**Enterprise product (Months 7–8):**
- Xero integration + App Marketplace listing
- Google Calendar sync (bidirectional)
- In-product reporting v2 (operations + commercial dashboards, CSV export)
- Basic automation rules engine (5 triggers × 5 actions)
- Mobile PWA (home screen install, push notifications, offline job view)

**Security (Months 5–6):**
- Cyber Essentials Plus certification — required for regulated-industry enterprise prospects
- External penetration test (accredited firm, £5K–£12K)
- CSP nonce-based hardening
- Field-level encryption for access codes and sensitive PII (CISO: property access instructions carry physical security risk)

**Sales and CS (Month 5 onward):**
- First AE hired (trigger: 5 enterprise accounts)
- First SDR hired (30 days after AE)
- First CSM hired (trigger: 10 enterprise accounts)
- BICSc endorsed supplier status
- Referral programme launched
- Xero App Marketplace listing drives inbound

---

### Phase 3 — "Scale and Expand" (Months 9–12)
**Revenue target: £900K ARR. 50 enterprise accounts. NRR >120%.**

- Multi-branch management (ACV expansion — franchise accounts add locations)
- SOC 2 Type I audit initiated (CISO: £15,000–£40,000; use Vanta/Drata to accelerate)
- Custom report builder (upgrade driver for Business and Enterprise tiers)
- Account/company hierarchy for B2B (FM firms with multiple site contacts)
- Contract management + recurring service agreements
- Zapier connector + QuickBooks integration
- Client self-service portal
- Channel partner programme live
- Second AE + second CSM hired
- Territory management

---

## Revenue Model

### The Three Revenue Streams

**Stream 1: Self-Serve (Starter + Professional)**
- Activated the moment billing goes live
- No sales involvement — pricing page, trial-to-paid email sequence, in-app upgrade prompts
- Conservative target: 15% trial conversion rate from Month 2
- Month 6 target: £20K MRR from self-serve alone

**Stream 2: Enterprise Accounts (Business + Enterprise)**
- Design-partner programme in Phase 1 (5 accounts, minimum £500/mo each)
- Sales-assisted from Month 5 (AE + SDR hired)
- Each enterprise account: minimum £1,500/mo, ACV £18K
- Month 4 target: £75K ARR (5 accounts)
- Month 12 target: £900K ARR (50 accounts)

**Stream 3: Expansion Revenue (NRR)**
- Seat expansion: accounts hitting 80% of plan seat limit → CSM outreach
- Branch expansion: multi-branch feature unlocked Month 9 → franchise ACV doubles
- Tier upgrade: feature gate click tracking identifies upgrade candidates
- Target NRR Month 12: >120% (existing customers growing faster than churn)

### 12-Month Financial Targets

| Metric | Month 4 | Month 8 | Month 12 |
|---|---|---|---|
| Enterprise ARR | £75K | £300K | £900K |
| Self-serve MRR | £5K | £20K | £50K |
| Total ARR | ~£135K | ~£540K | ~£1.5M |
| Enterprise Accounts | 5 | 20 | 50 |
| Net Revenue Retention | — | 105% | 120% |
| Trial → Paid Conversion | 12% | 22% | 30% |
| Gross Revenue Churn | <5% | <4% | <3% |

*These targets are the CRO's numbers, validated by the CFO's unit economics model. The CFO notes £50K ARR by Month 6 (~33 accounts) as the operational breakeven and £1M ARR as Series A readiness threshold.*

### Pricing (Final — Aligned Across CRO + CFO + CCO + CEO Decision on Solo Tier)

| Tier | Annual | Monthly | Users | Key Gate |
|---|---|---|---|---|
| **Solo** | £19/mo (annual only) | — | 1 | Core CRM, 50 clients max, 10 quotes/mo, "Powered by Lustre" mandatory |
| **Starter** | £39/mo | £49/mo | Up to 3 | Core CRM, unlimited clients/quotes |
| **Professional** | £119/mo | £149/mo | Up to 15 | Custom fields, tags, unlimited quotes |
| **Business** | £319/mo | £399/mo | Up to 50 | RBAC, API, email sync, custom reports |
| **Enterprise** | From £1,500/mo | Negotiated | Unlimited | SSO, multi-branch, CSM, SLA, contracts |

**Solo tier — CEO decision notes:**
- Annual billing only (no monthly option). £228/yr is the entry commitment. Prevents churn arbitrage.
- Hard limits (50 clients, 10 quotes/mo, 1 user) create natural upgrade moments — product surfaces Starter when limits are approached.
- "Powered by Lustre" link on all public quote footers is **non-removable** at Solo tier. This is the commercial return on subsidising solo operators: every quote is a brand impression in front of exactly the right audience.
- Support is help centre only. No email support. This is the primary mechanism that keeps the unit economics healthy.
- Solo tier launches in **Phase 2 (Month 5–6)** — after Starter conversion data exists and self-serve support infrastructure (help centre 30+ articles) is in place. It is NOT a Phase 1 feature.
- Floor analysis: infrastructure cost ~£1.60/tenant at 500 accounts, Stripe fees ~£0.49/transaction, support ~£1.50/mo = ~£3.80 total cost floor. £19/mo = ~80–92% gross margin at scale.
- No free tier until Phase 2 self-serve infrastructure (in-app tours, 30+ help articles, zero-touch onboarding) is in place.

**Enterprise deal structure (CRO standard):**
- 12-month minimum, invoiced annually upfront
- 20 seat base at £48/seat/mo (£11,520/yr base)
- Implementation fee: £2,500 one-time
- Multi-year discounts: 2yr = 8% off, 3yr = 15% off

---

## Budget and Investment

The CFO has estimated ~147 engineering days for the full billing and financial analytics buildout. The COO and CTO add another ~200 days of infrastructure and security work. This is a full engineering team's year.

**Non-negotiable external costs to budget now:**

| Item | Cost | Timing | Source |
|---|---|---|---|
| Cyber Essentials Plus certification | £1,500–£3,000 | Month 5–6 | CISO |
| External penetration test | £5,000–£12,000 | Month 6 | CISO |
| SOC 2 compliance tooling (Vanta/Drata) | £150–£300/mo | Month 9 | CISO |
| SOC 2 Type I audit | £15,000–£40,000 | Month 9–11 | CISO |
| SOC 2 annual re-test | £3,000–£6,000 | Month 20+ | CISO |
| WorkOS (enterprise SSO) | ~£500/mo at scale | Month 5 | CTO |
| PostHog (analytics) | Free tier sufficient for Month 1–6 | Month 1 | CPO |
| Inngest (async jobs) | Free tier initially | Month 2 | COO |
| Sentry (error tracking) | £0 on free tier | Month 1 | COO |
| Intercom (support) | ~£74/mo starter | Month 3 | COO |
| Betterstack / Checkly (uptime) | ~£30/mo | Month 1 | COO |

**Total external tooling budget (Year 1):** ~£25,000–£65,000 depending on SOC 2 scope.

---

## Key Tensions and How They Resolve

### "Revenue First" vs. "Fix Technical Debt First"
**Resolved:** Both happen in Week 1. The two critical technical issues (service role key in request path, fail-open rate limiting) take 2 days combined and run while Stripe integration is being scoped. There is no trade-off.

### "Sign Enterprise Deals Now" vs. "Don't Sign Until Technical Foundation is Complete"
**Resolved:** Design-partner agreements are commercial intent, not full enterprise contracts. They commit to a price, we commit to a delivery timeline. SSO, MFA, and RBAC are Month 3 deliverables in the agreement. This is how early-stage SaaS works — staged commitments, delivered incrementally.

### "Build All the CCO's CRM Features" vs. "Revenue First"
**Resolved:** Sales pipeline, custom fields, and automation are Phase 2 (Month 5+). Enterprise design partners need billing, invitations, RBAC, and reporting. They do not need a full CRM overhaul on Day 1. We will validate with design partners which Phase 2 features are actual blockers before committing to the full CCO roadmap.

### "GDPR is a Legal Obligation" vs. "It Isn't a Revenue Feature"
**Resolved:** The paperwork (DPAs, documentation, privacy policy update) is Week 2. The engineering (erasure flows, DSAR export, data export) is Month 2. These timelines are correct — the paperwork does not require engineering, and the engineering doesn't require the full legal framework to be in place first.

### "Hire Sales Now" vs. "Wait for the Playbook"
**Resolved:** No hire before 10 paying customers and a documented sales playbook. The founders run the first 5 design-partner deals personally. This produces the playbook. The AE inherits a documented process on Day 1.

### "Three Different 'Phase 1' Definitions"
**Resolved:** All three Phase 1 definitions (CTO's technical foundation, CISO's security compliance, CFO/CRO's billing) run in parallel on four simultaneous tracks as described above. They are not sequential. This requires prioritisation discipline but is entirely achievable with a focused team.

---

## The Unified Risk Register

Synthesised from all seven plans, ranked by combined likelihood × impact:

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe integration takes >3 weeks | Medium | Critical | P0 priority; scope aggressively; accept all other debt |
| Enterprise deal fails security questionnaire (MFA / RBAC not live) | High | Critical | Stage enterprise contracts: MFA + RBAC delivered by Month 3 contractually |
| GDPR non-compliance triggers enforcement | Low | Critical | DPAs and documentation completed Week 2; engineering Month 2 |
| Service role key exposure causes data breach | Medium | Critical | Week 1 task — this is already scheduled |
| Design partners won't pay before SSO is live | Medium | High | Design-partner contract explicitly stages SSO to Month 5; they commit now |
| Production error goes undetected until customer reports it | High | High | Sentry + Checkly live in Week 2; this risk is resolved early |
| Trial-to-paid conversion stays below 10% | Medium | High | Exit survey every non-converter; iterate on onboarding; PostHog tracks it |
| CCO's Phase 1 feature scope exceeds engineering capacity | High | High | CCO's enterprise CRM features are Phase 2; Phase 1 is billing + invitations + RBAC |
| First AE hired without documented playbook | Medium | High | No hire before 10 paying customers and documented playbook |
| Enterprise sales cycle exceeds 90 days | Medium | High | 30-day structured POC; CEO as exec sponsor on all enterprise deals |
| NRR falls below 100% before Phase 3 | Medium | High | CSM hired at 10 accounts; health scoring in place; do not scale acquisition on a leaky bucket |
| SOC 2 delayed — costs enterprise renewal | Low | High | Start Month 9; use Vanta to accelerate; Type II not required until Year 2 renewals |

---

## The CEO's First 30 Days

**This week (Week 1):** *(Updated: 3 March 2026)*
- [ ] Identify top 10 ICP-fit trial accounts — review every existing signup, score for ICP fit
- [x] **DONE** Remove service role key from application request path (CTO) — replaced with SECURITY DEFINER PostgreSQL RPC functions; `service.ts` deleted; `SUPABASE_SERVICE_ROLE_KEY` no longer required in the app
- [x] **DONE** Configure Supabase CLI migration tooling (CTO) — `supabase/config.toml` created, migrations directory structured (`20260303000000_initial_schema.sql`, `20260303000001_public_quote_functions.sql`), `npm run db:push/pull/diff/reset` scripts added
- [ ] Sign DPAs with Supabase, Vercel, Resend, Upstash (COO/CISO — paperwork)
- [x] **DONE (ahead of schedule)** Stripe billing integration — full infrastructure built: Stripe client + plans config, Checkout session API, Customer Portal API, webhook handler (checkout.session.completed, subscription.created/updated/deleted, invoice.payment_succeeded/failed), `/billing` plan picker page, `/dashboard/settings/billing` plan management page, `stripe_subscription_id` + `stripe_price_id` DB migration. `stripe` added to dependencies. **Needs:** Stripe Products + Prices created in dashboard, Price IDs set as env vars, webhook endpoint registered.
- [ ] Set up HubSpot CRM — all prospects enter here from today
- [x] **DONE** Deploy Sentry (CTO) — `@sentry/nextjs` configured; client/server/edge config files live; `global-error.tsx` captures to Sentry; CSP updated; Checkly setup pending (external service config)
- [ ] Personal outreach to 10 design-partner candidates

**Week 2:**
- [x] **DONE** PostHog live and instrumented (CPO) — posthog-js + posthog-node installed; 11 events instrumented across auth, clients, and quotes (user_signed_up, user_signed_in, onboarding_completed, client_created, quote_created, quote_sent, quote_accepted, quote_declined, job_created, quote_viewed_by_client, quote_accepted/declined_by_client); /ingest reverse proxy configured in next.config.ts; user identified in root layout
- [x] **DONE** Uptime monitoring (Checkly) — three API checks live (health endpoint, login page, Stripe webhook); deployed to eu-west-1 + eu-central-1; 5-minute frequency; BrowserCheck with HMAC signing for Stripe webhook check
- [x] **DONE (early)** CI/CD pipeline live — GitHub Actions workflow created: lint → typecheck → build → `npm audit` on every PR and push to main
- [ ] GDPR documentation drafted: data processing register, legal basis, sub-processor list
- [ ] Privacy policy updated
- [ ] Incident response plan drafted
- [ ] Rate limiting made mandatory (fail-closed)
- [ ] 5+ design-partner conversations booked
- [ ] Write pricing page copy (CRO)

**Week 3:**
- [x] **DONE (early)** Stripe billing live (Checkout + webhooks) — code complete; activation requires Stripe product/price setup and env vars
- [x] **DONE (early)** Pricing / billing page live (`/billing`) — plan picker with monthly + annual options, enterprise callout
- [ ] Trial-to-paid email sequence live in Resend
- [ ] Design-partner calls underway — 2+ advanced to proposal

**Week 4:**
- [ ] Team invitation flow live (enterprises can now onboard)
- [ ] 14-day trial enforcement live
- [ ] First paying customer converted
- [ ] First design-partner contract drafted
- [ ] Sales playbook page 1 written (from first five conversations)

**By end of Month 1, we must have:**
- ✓ At least one paying customer
- ✓ Billing infrastructure live
- ✓ Pricing page live
- ✓ Service role key vulnerability closed
- ✓ CI/CD running
- ✓ Error monitoring running
- ✓ Analytics running
- ✓ DPAs signed with all sub-processors
- ✓ 5+ design-partner conversations in progress

If we don't hit the first paying customer by end of Month 1 of billing going live, we stop and diagnose. The conversion data from PostHog will tell us where people are dropping off.

---

## The Competitive Position We Are Building

The six exec plans give us a combined picture of where Lustre will sit in the market by end of Year 1. The CCO's competitor benchmarking (vs. Jobber, ServiceM8, HubSpot, Salesforce, ServiceTitan) shows our sustainable differentiation:

> *"Lustre is the only CRM built specifically for UK cleaning and property maintenance businesses — combining client management, professional quoting, job scheduling, and revenue reporting in one place, with the security, compliance, and integration ecosystem that enterprise procurement requires."*

**The CCO's benchmark insight is worth noting verbatim:** ServiceTitan is the closest comparable in the field service space — US-centric, expensive, complex, and not purpose-built for the UK cleaning market. Our opportunity is to be the ServiceTitan for UK cleaning and property services at a price point accessible to the SME and mid-market, with the extensibility required by enterprise.

We win on four dimensions no single competitor matches simultaneously:
1. **UK-native** — VAT, GBP, UK address formats, GDPR-ready by design
2. **Field-service-specific** — Quote-to-job workflow, operative view, scheduling — not a generic CRM
3. **Enterprise-grade security** — RLS, SSO, MFA, audit trail, RBAC — built in, not bolted on
4. **Fast time-to-value** — First quote in first session — our own trial data confirms this

---

## What Success Looks Like at Month 12

A year from now, Lustre should look like this:

- **50 enterprise accounts** paying an average £18K ACV — all of them actively using in-product reporting to justify the spend to their own boards
- **NRR >120%** — existing customers growing faster than we're churning, proving the land-and-expand model works
- **£900K enterprise ARR** plus £600K self-serve ARR = **£1.5M total ARR** — Series A readiness
- **A repeatable, documented sales motion** — discovery → demo → 30-day POC → close — running without the founders in every deal
- **3+ published case studies** from design partners who champion the product publicly
- **A team of 8–10** (2 AEs, 2 SDRs, 2 CSMs, CTO + engineering, CEO/CRO) doing focused, high-leverage work
- **Cyber Essentials Plus certified and pen-tested** — the CISO's minimum bar for credible enterprise security claims
- **SOC 2 Type I audit in progress** — the signal to regulated-industry enterprise customers that we're serious
- **Xero and Google Calendar integrations live** — the two integrations that appear in almost every enterprise conversation
- **Mobile PWA live** — operatives using Lustre from the field, not just admins from desks
- **PostHog telling us exactly which features drive retention** — no more guessing

---

## A Note on Scope and Focus

The seven exec plans collectively describe approximately 400 line items of work. This plan does not endorse doing all of them — it endorses doing the right ones in the right order.

The most dangerous failure mode is treating this as a feature delivery exercise. It is not. It is a revenue exercise. Every item on the P0 list either puts money in the bank or closes a security gap that would otherwise block money getting in the bank. The P1 items are required for enterprise retention and expansion. The P2 items are the feature layer that makes enterprise deals possible. The P3 items are what turns us into a platform.

The sequence matters more than the completeness. A company that ships billing, invitations, RBAC, and one great reporting dashboard will outperform a company that ships 50 features in the wrong order every time.

---

*This document synthesises input from all seven Lustre executive proposals: CRO-ENT (CRO), CTO-ENT-001 (CTO), CISO-ENT-001 (CISO), CFO-ENT-001 (CFO), OPS-ENT-001 (COO), CRM-ENT-001 (CCO), CPO-ENT-001 (CPO).*
*Owner: CEO*
*Version: 2.0*
*Next review: 30 days from distribution — first milestone check-in.*
*Distribution: Executive team only*
