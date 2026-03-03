# Lustre — Chief Revenue Officer: Enterprise Growth Plan
**Author:** Chief Revenue Officer
**Date:** March 2026
**Status:** Draft v1.0
**Horizon:** 12 months (Q2 2026 – Q1 2027)

---

## Executive Summary

Lustre has built a defensible, well-structured CRM for UK cleaning and property maintenance businesses. The foundations are solid — multi-tenant security, professional quote generation, job scheduling, and client relationship tooling that genuinely works. What we have not yet built is a **revenue engine**.

This plan defines how we go from product to revenue machine. It covers everything the CRO owns: go-to-market strategy, pricing and packaging, sales motion, revenue operations, customer success, partnerships, and the reporting infrastructure needed to measure, forecast, and accelerate revenue.

The other executive plans (COO, CTO, CISO, CFO, CCO) define what we must *build*. This plan defines how we *sell it*, how we *retain it*, and how we *grow it* — and crucially, in what *order* we do that to generate the earliest possible enterprise ARR.

**12-month headline targets:**

| Metric | End of Phase 1 (Month 4) | End of Phase 2 (Month 8) | End of Phase 3 (Month 12) |
|---|---|---|---|
| Enterprise ARR | £75K | £300K | £900K |
| Enterprise Accounts | 5 | 20 | 50 |
| Net Revenue Retention | — | 105% | 120% |
| Avg Contract Value (Enterprise) | £18K ACV | £18K ACV | £22K ACV |
| Trial → Paid Conversion | 12% | 22% | 30% |
| Gross Revenue Churn | <5% | <4% | <3% |

---

## 1. Where We Are: Revenue Baseline

### 1.1 Current State

Lustre currently has **zero automated revenue collection**. The database schema anticipates billing (`stripe_customer_id`, `subscription_status`, `plan`, `trial_ends_at`) but no Stripe integration exists. This means:

- We cannot charge customers at scale
- We have no visibility into trial conversion
- We have no churn signal
- We cannot model or forecast revenue
- We cannot enforce plan limits (features are ungated)

This is the single most urgent CRO risk. Until billing infrastructure is live, there is no revenue to operate.

### 1.2 Current Strengths (Revenue Leverage Points)

| Strength | Revenue Relevance |
|---|---|
| Quote PDF generation with public shareable links | Viral loop — every shared quote is a brand touchpoint |
| View tracking on shared quotes | Buying signal data we can surface to sales |
| Activity timeline (13 event types) | Engagement depth drives retention and NPS |
| Clean multi-tenant architecture | Safe to sell to large, security-conscious organisations |
| UK market specificity (VAT, GBP, address formats) | Competitive moat vs US-first CRMs |
| Professional UI/UX | Reduces enterprise selling resistance |

### 1.3 Immediate Revenue Blockers

These are not product wishes — they are blockers that will end enterprise conversations before they start:

1. **No billing infrastructure** — Cannot collect payment
2. **No team invitation flow** — Enterprises cannot onboard their teams
3. **No SSO/SAML** — IT departments will not approve without it
4. **No role-based access control** — Enterprises require granular permissions
5. **No audit logging completeness** — Legal/compliance teams need full trails
6. **No in-product reporting** — Managers need dashboards, not just raw data
7. **No MFA** — Security teams will block procurement without it

---

## 2. Market Opportunity

### 2.1 Target Market

**Primary ICP (Ideal Customer Profile) — Enterprise Tier:**

| Dimension | Definition |
|---|---|
| **Company type** | Commercial and residential cleaning companies, facilities management (FM) firms, property maintenance businesses |
| **Geography** | United Kingdom (primary); English-speaking markets thereafter |
| **Size** | 20–500 staff; multiple operatives in the field; management layer |
| **Revenue** | £500K–£50M turnover |
| **Pain** | Managing jobs, clients, and quotes across spreadsheets, WhatsApp, and disconnected tools |
| **Trigger events** | Winning a large contract, failed software migration, franchise expansion, new management hire |

**Secondary ICP — Growth Tier (Mid-Market):**

| Dimension | Definition |
|---|---|
| **Company type** | Owner-operated businesses growing beyond 5 staff |
| **Size** | 5–20 staff |
| **Revenue** | £150K–£500K |
| **Pain** | Outgrowing manual processes; need visibility without complexity |

**Exclusions (for now):**

- Sole traders / 1-person operations → Self-serve Starter plan only
- Construction/trades outside cleaning/FM → Different compliance, workflow
- International (non-UK) → VAT, data residency complexity

### 2.2 Total Addressable Market (UK)

| Segment | Est. UK Businesses | Our ICP % | TAM |
|---|---|---|---|
| Commercial cleaning companies | ~14,000 | 35% | ~4,900 |
| Residential cleaning companies | ~28,000 | 10% | ~2,800 |
| Facilities management firms | ~5,500 | 40% | ~2,200 |
| Property maintenance businesses | ~22,000 | 15% | ~3,300 |
| **Total ICP** | | | **~13,200 businesses** |

At an average ACV of £18,000 for Enterprise, our 12-month SAM (Serviceable Addressable Market) is conservatively **£237M ARR** in the UK alone.

Our 12-month target of 50 enterprise accounts represents **<0.4% market penetration** — achievable with a focused, disciplined sales motion.

---

## 3. Pricing & Packaging Strategy

The CFO plan outlines tier pricing. This section defines the CRO rationale, packaging logic, and enterprise negotiation guardrails.

### 3.1 Tier Architecture

| Tier | Price | Users | Target | Key Differentiator |
|---|---|---|---|---|
| **Starter** | £49/mo (billed annually: £39/mo) | Up to 3 | Sole traders, micro teams | Core CRM + quotes, no extras |
| **Professional** | £149/mo (annual: £119/mo) | Up to 15 | Growing SMEs | Custom fields, tags, automation, advanced filters, reporting v1 |
| **Business** | £399/mo (annual: £319/mo) | Up to 50 | Established businesses | Multi-user RBAC, API access, email sync, custom reports, priority support |
| **Enterprise** | From £1,500/mo (negotiated ACV) | Unlimited | FM firms, franchises, large commercial | SSO, multi-branch, dedicated CSM, SLA, bespoke onboarding, contract management |

### 3.2 Packaging Principles

**Land with value, expand with breadth:**
- Keep the Starter tier genuinely useful (not crippled) — this drives referrals and organic growth
- Gate power features that matter to managers/directors at Professional+
- Gate infrastructure features (SSO, API, multi-branch) at Enterprise — these are IT/procurement decisions, not end-user decisions

**Avoid per-seat pricing for entry tiers:**
- Per-seat pricing creates friction for adoption within small teams
- Switch to per-seat for Enterprise (£30–£60/seat/mo depending on volume) to capture expansion revenue as headcount grows
- Enterprise contracts should include a base (e.g., 20 seats minimum) with overage pricing

**Annual-first sales motion:**
- Lead with annual pricing in all outbound and trial-to-paid conversations
- Monthly available but at a 25% premium — creates natural urgency to commit annually
- Enterprise: 12-month minimum contract, 2- and 3-year options with 8% and 15% discounts respectively

### 3.3 Feature Gating Matrix (CRO View)

| Feature | Starter | Professional | Business | Enterprise |
|---|---|---|---|---|
| Client & property management | ✓ | ✓ | ✓ | ✓ |
| Quote generation + PDF | ✓ (5/mo) | ✓ Unlimited | ✓ | ✓ |
| Job scheduling | ✓ | ✓ | ✓ | ✓ |
| Follow-ups & activity | ✓ | ✓ | ✓ | ✓ |
| Custom fields | — | ✓ | ✓ | ✓ |
| Tags & segmentation | — | ✓ | ✓ | ✓ |
| Advanced filters & saved views | — | ✓ | ✓ | ✓ |
| CSV bulk import | — | ✓ | ✓ | ✓ |
| In-product reporting (v1) | Basic counts | ✓ Full | ✓ | ✓ |
| Workflow automation | — | Basic (3 rules) | ✓ Advanced | ✓ Unlimited |
| RBAC (roles + permissions) | 2 roles | 3 roles | 4 roles | ✓ Custom |
| API access + webhooks | — | — | ✓ | ✓ |
| Email sync | — | — | ✓ | ✓ |
| Custom report builder | — | — | ✓ | ✓ |
| Multi-branch management | — | — | — | ✓ |
| SSO / SAML | — | — | — | ✓ |
| MFA enforcement | — | — | — | ✓ |
| Dedicated CSM | — | — | — | ✓ |
| SLA | — | — | — | ✓ 99.9% |
| Custom data retention policy | — | — | — | ✓ |
| Bespoke onboarding | — | — | Guided | ✓ White-glove |
| Quote limit | 5/mo | Unlimited | Unlimited | Unlimited |
| Team members | 3 | 15 | 50 | Unlimited |

### 3.4 Enterprise Contract Terms

**Standard Enterprise deal structure:**

- **Minimum contract:** 12 months, invoiced annually upfront
- **Base seats:** 20 minimum at £48/seat/mo (£11,520/yr base)
- **Seat expansion:** Priced in bands (21-50 seats: £42/seat; 51-100: £36/seat; 100+: £30/seat)
- **Implementation fee:** £2,500 one-time (white-glove onboarding, data migration, SSO setup)
- **Success package:** £500/mo optional — dedicated CSM, monthly business reviews, priority SLA
- **Multi-year discount:** 2yr = 8% off, 3yr = 15% off

**Negotiation guardrails (non-negotiables):**
- Annual upfront payment or monthly + credit card on file
- Data processing agreement (DPA) included as standard — do not negotiate away
- Right to audit log access — non-negotiable for enterprise
- No white-labelling below a specific threshold (£50K+ ACV)

---

## 4. Go-to-Market Strategy

### 4.1 GTM Phases

**Phase 1 (Months 1–4): "Earn the Right to Sell Enterprise"**

We cannot credibly run enterprise sales until billing, invitations, RBAC, and basic reporting are live. Phase 1 GTM is therefore focused on:

1. **Closing 5 design-partner enterprise accounts** — Identified, pre-qualified prospects who commit early in exchange for influence over the roadmap, discounted pricing, and white-glove attention. These are reference customers, not revenue targets yet.
2. **Activation of billing infrastructure** — Every trial converts to a paying plan or churns; no more free access without time limit.
3. **Establishing the ICP** — Tighten our definition of who converts fastest and at highest ACV.

Design-partner criteria:
- 15+ field operatives in the UK
- Currently using spreadsheets or a competing product (ServiceM8, Tradify, Jobber)
- Decision-maker accessible (MD, Operations Director, or FD)
- Willing to do a case study / reference call within 6 months
- Pays at least £500/mo (to validate commercial intent)

**Phase 2 (Months 5–8): "Build the Sales Engine"**

With reference customers, a billing system, and expanded feature set:

1. **Outbound motion** — SDR-led outreach to FM firms, commercial cleaning companies, and franchise operators
2. **Inbound motion** — Content, SEO, and partner referrals driving qualified inbound
3. **Trial-to-paid playbook** — Automated and human-assisted conversion sequences
4. **Mid-market self-serve** — Professional and Business tiers purchasable without sales involvement
5. **Target: 20 enterprise accounts**

**Phase 3 (Months 9–12): "Scale and Expand"**

1. **Channel partnerships** — Xero/QuickBooks integration marketplace listings, industry association partnerships
2. **Land-and-expand** — Dedicated CSM programme, usage-based expansion, multi-branch rollouts
3. **Referral programme** — Structured incentive for existing customers who refer new accounts
4. **Target: 50 enterprise accounts, NRR >120%**

### 4.2 Sales Motion by Segment

**Enterprise (£1,500+/mo):** High-touch, relationship-led

```
Lead → Qualification (SDR, 15-min call) → Discovery (AE, 45-min) →
Demo (AE, 60-min) → Pilot / POC (30 days) → Commercial Proposal →
Legal / Procurement Review → Close → Onboarding (CSM) → QBR Cadence
```

- Sales cycle: 60–90 days
- Primary stakeholders: Operations Director, MD, IT Manager (for SSO), FD (for billing/contracts)
- Deal team: AE (owns) + CSM (engaged at pilot stage) + CEO/CRO (executive sponsor for >£2K/mo deals)

**Business (£399/mo):** Assisted self-serve

```
Trial (14 days) → In-app onboarding sequence → Day 3 check-in email →
Day 7 product usage review (automated) → Day 10 human outreach if low activity →
Day 14 trial-to-paid conversion prompt
```

- Sales cycle: 14–21 days
- Primary stakeholder: Owner-operator or Office Manager
- Deal team: AE handles inbound inquiries; SDR handles outbound to cold trials

**Professional (£149/mo) and below:** Fully self-serve

```
Trial → In-app activation flow → Automated email sequence →
Conversion prompt at day 14 → Self-serve plan selection + payment
```

### 4.3 Competitive Positioning

**Primary competitors in UK field service / cleaning CRM:**

| Competitor | Positioning | Our Wedge |
|---|---|---|
| **Jobber** | Broad trades CRM, US-origin | Not UK-native (VAT, GBP); not cleaning-specific; complex onboarding |
| **ServiceM8** | Trades-focused, Australian-origin | Not UK-native; invoice-heavy, not CRM-first |
| **Tradify** | NZ-origin trades management | Not cleaning-specific; limited reporting; weak pipeline management |
| **HubSpot** | Generic CRM powerhouse | Overkill for field service; not operations-integrated; expensive at scale |
| **Spreadsheets / WhatsApp** | Status quo | Our #1 "competitor" — the conversion target |

**Our positioning statement:**

> *"Lustre is the only CRM built specifically for UK cleaning and property maintenance businesses — combining client management, professional quoting, job scheduling, and revenue reporting in one place, without the complexity of generic enterprise tools."*

**Key differentiators to lead with in enterprise conversations:**

1. **UK-native** — VAT handling, UK address formats, GBP-first, GDPR-ready by design
2. **Quote-to-job workflow** — Seamless from quote to scheduled job; competitors require separate tools
3. **Field operative experience** — Designed for teams where not everyone sits at a desk
4. **Enterprise-ready security** — Multi-tenant RLS, full audit trail, SSO/SAML, MFA
5. **Fast time-to-value** — Customers have their first quote out within their first session

---

## 5. Revenue Operations (RevOps)

### 5.1 The RevOps Stack We Need

RevOps is the operational backbone that connects marketing, sales, and customer success into a single revenue view. We currently have none of this infrastructure. Here is what we must build:

| Function | Tool (Recommended) | Priority |
|---|---|---|
| **CRM (internal sales)** | HubSpot CRM Free → Sales Hub Starter | P0 — Month 1 |
| **Billing & subscriptions** | Stripe Billing (already scaffolded) | P0 — Month 1 |
| **Product analytics** | PostHog (self-hosted or cloud) | P0 — Month 1 |
| **Email automation** | Resend (already in stack) + sequences | P1 — Month 2 |
| **Revenue reporting** | Stripe Revenue Recognition + custom dashboard | P1 — Month 2 |
| **Customer success** | HubSpot Service Hub or Intercom | P2 — Month 4 |
| **Contract management** | PandaDoc or Docusign | P2 — Month 4 |
| **Referral programme** | Rewardful (Stripe-native) | P3 — Month 7 |
| **Partner portal** | Custom-built or PartnerStack | P3 — Month 9 |

### 5.2 Revenue Data Model

Every revenue decision must trace back to clean, consistent data. We need a shared definition of every metric:

**Acquisition metrics:**
- **Lead** — Any business that enters our pipeline (inbound inquiry, trial sign-up, outbound response)
- **MQL (Marketing Qualified Lead)** — Lead that meets ICP criteria and has shown intent (e.g., trial sign-up + at least 1 quote created)
- **SQL (Sales Qualified Lead)** — MQL that an SDR has spoken to and confirmed budget, authority, need, timeline (BANT)
- **Trial** — Organisation that has activated a free trial account
- **Trial-to-Paid** — Trial that converts to any paid plan within 30 days

**Retention metrics:**
- **MRR** — Monthly Recurring Revenue (sum of all active paid subscriptions)
- **ARR** — Annual Recurring Revenue (MRR × 12)
- **Churned MRR** — MRR lost from cancellations in a given month
- **Contracted MRR** — MRR locked under annual contract (higher quality than month-to-month)
- **NRR (Net Revenue Retention)** — (Starting MRR + Expansion MRR − Churned MRR − Contracted MRR) / Starting MRR × 100
- **GRR (Gross Revenue Retention)** — (Starting MRR − Churned MRR − Downgrade MRR) / Starting MRR × 100

**Efficiency metrics:**
- **CAC (Customer Acquisition Cost)** — Total sales + marketing spend / new customers acquired
- **LTV (Lifetime Value)** — Avg MRR × Avg Customer Lifespan (months)
- **LTV:CAC ratio** — Must be >3x within 18 months; target >5x for enterprise
- **Payback Period** — CAC / (MRR × Gross Margin %) — target <12 months

### 5.3 Revenue Dashboard (What We Will Build In-Product)

For enterprise buyers, the in-product reporting suite is as much a sales tool as it is a product feature. Decision-makers need to justify the spend to their board. We will build:

**Executive Summary Dashboard (visible to admins and above):**
- Total revenue collected (invoiced and paid jobs) — month, quarter, YTD
- Quote pipeline value (total value of open quotes by stage)
- Quote win rate (accepted / total sent — rolling 30 days)
- Top clients by revenue (jobs completed, invoiced, paid)
- Jobs completed vs. scheduled — operational efficiency score
- Headcount utilisation — jobs per operative per week

**Sales Pipeline Dashboard:**
- Leads → Quotes → Won → Lost funnel with conversion rates
- Average time-to-close by service type
- Quote value by service category
- Revenue forecast (jobs scheduled × expected value)
- Follow-up effectiveness (follow-ups created → converted to quote)

**Operations Dashboard (manager view):**
- Jobs by status (scheduled, in progress, completed, cancelled)
- SLA adherence — jobs completed on time vs. late
- Operative performance — jobs completed, client ratings (if we add rating)
- Property type breakdown (bedrooms, frequency, client tenure)

**Client Health Dashboard:**
- Clients at risk (no activity in 60+ days, overdue follow-ups)
- Revenue by client segment (commercial, residential, lead)
- Client tenure distribution (new, 0–6mo, 6–12mo, 12mo+)
- Lifetime value per client
- Churn indicators (quote activity drop-off, contact drop-off)

These dashboards are built for the *buyer*, not just the user — they make renewal conversations easy and upsell conversations obvious.

---

## 6. Customer Success & Expansion Revenue

### 6.1 CS Philosophy: Revenue, Not Support

Customer Success at Lustre is a **revenue function**, not a support function. Every CSM owns a book of ARR and is accountable for NRR — not ticket resolution times.

### 6.2 Customer Journey

```
Trial (Day 0)
    ↓
Onboarding (Days 1–14) — First quote sent, first job scheduled
    ↓
Activation (Day 30) — Team onboarded, 3+ clients, 5+ quotes
    ↓
Value Realisation (Month 3) — Reports show measurable impact
    ↓
Expansion (Month 6+) — Additional seats, tier upgrade, new branch
    ↓
Advocacy (Month 12+) — Case study, reference, referral
```

### 6.3 Onboarding Programme

**Self-serve (Starter/Professional):**
- Welcome email with 3 first actions (add a client, create a quote, schedule a job)
- In-app checklist with progress tracking
- Day 3 automated email: "Have you sent your first quote?" with how-to guide
- Day 7 email: highlight most-used features by businesses of their size
- Day 10 (if low activity): personal outreach from sales ("Can I help you get set up?")

**Assisted (Business):**
- 30-minute onboarding call with AE within 48 hours of paying
- Shared onboarding tracker (Google Sheet or HubSpot task list)
- Migration support — help exporting from previous tool / CSV cleaning
- Day 30 check-in call

**White-glove (Enterprise):**
- Dedicated CSM assigned at contract signature
- Kickoff call with all stakeholders (operations, IT, finance)
- Phased rollout plan (admin first, then managers, then operatives)
- SSO and RBAC configuration supported by CSM
- Data migration (client list, historical jobs) — managed by CSM with engineering support
- Weekly check-ins for Month 1; biweekly for Month 2; monthly QBRs thereafter

### 6.4 Expansion Playbooks

**Seat expansion:**
- Trigger: Organisation hits 80% of plan seat limit
- Action: CSM proactive outreach — "You're growing fast — let's talk about what the next tier unlocks"
- Offer: First 2 additional seats free for 30 days, then upgrade to next tier

**Branch expansion:**
- Trigger: CSM identifies a comment about a second location or franchise growth
- Action: Demo of multi-branch dashboard, consolidated reporting, territory management
- Offer: Bundle second branch at 40% discount for first 6 months

**Tier upgrade:**
- Trigger: Customer regularly requesting features gated at higher tier (tracked via support tickets and in-app feature gate clicks)
- Action: AE-led upgrade conversation showing ROI of higher tier features
- Use case: "You've hit the quote limit 3 months in a row — upgrading to Professional unlocks unlimited quotes and automation rules"

### 6.5 Churn Prevention

**Health scoring model (built into CSM tooling):**

| Signal | Weight | Positive | Negative |
|---|---|---|---|
| Monthly login frequency | 30% | >10 logins/user | <2 logins/user |
| Quotes created last 30 days | 25% | >5 | 0 |
| Jobs scheduled last 30 days | 20% | >10 | 0 |
| Follow-ups completed | 10% | >80% on time | <50% on time |
| Support tickets (severity) | 10% | No P0/P1 | P0/P1 open |
| Renewal date | 5% | >90 days | <30 days |

**Red account intervention:**
- Health score <40: CSM immediate outreach within 24 hours
- Offer: Free coaching session, feature spotlight for the specific pain causing disengagement
- Escalation: If no improvement within 14 days, offer plan downgrade rather than cancellation (retain some revenue, keep the relationship)

**Cancellation prevention:**
- Required exit survey (NPS-style) on any cancellation attempt
- Cancel-save offer: 1 month free if they commit to 6 more months; or downgrade to Starter rather than full churn

---

## 7. Partnerships & Channels

### 7.1 Partnership Strategy

Partnerships are a **Phase 2 priority** (Months 5–8). They require a stable product and reference customers before we can credibly recruit partners.

**Tier 1: Technology Partners (Integrations)**

| Partner | Relevance | Action |
|---|---|---|
| **Xero** | UK's dominant accounting tool for SMEs — every cleaning company's accountant recommends it | Xero App Marketplace listing; bidirectional invoice sync |
| **QuickBooks** | Second UK accounting platform | Integration + marketplace listing |
| **Google Workspace** | Calendar sync (scheduling), Gmail sync | OAuth integration; G Suite Marketplace listing |
| **Microsoft 365** | Outlook calendar sync, Teams notifications | OAuth integration; Azure Marketplace |
| **Stripe** | Already planned — payment collection | Native integration; co-marketing opportunity |
| **Zapier** | Long-tail automation; connects Lustre to 3,000+ tools | Zapier integration; featured in their CRM category |

**Tier 2: Channel Partners (Resellers / Referrers)**

| Partner Type | Target | Model |
|---|---|---|
| **Accountants** | UK SME accountants who serve cleaning businesses | Referral fee: £150 per converted annual plan; white-label reporting exports |
| **Cleaning industry associations** | BICSc (British Institute of Cleaning Science), NCCA | Endorsed supplier status; association member discount (15% off Professional) |
| **Franchise consultants** | Consultants who advise cleaning franchise operators | Referral fee + co-branded onboarding; franchise-specific configuration support |
| **IT managed service providers (MSPs)** | MSPs serving facilities management clients | Reseller margin (20% off wholesale); enterprise deployment and support |
| **HR/payroll platforms** | Brightpay, Sage HR — operative scheduling overlap | Data sync partnership; co-marketing |

**Tier 3: Industry Media & Communities**

- Advertorial content in Cleaning Matters, Tomorrow's FM
- Sponsorship of BICSc awards, Facilities Show (NEC Birmingham)
- Community building in UK cleaning Facebook groups and LinkedIn communities
- Guest content on accounts / bookkeeping blogs (Xero partner blogs, etc.)

### 7.2 Referral Programme

Launch in Phase 3 (Month 7+) once we have enough satisfied customers to refer.

**Structure:**
- **Customer referral:** Referring customer gets 1 month free credit per new paying customer referred; referred customer gets 20% off first 3 months
- **Partner referral:** Registered partners get 15% of first-year ACV for Enterprise referrals; 10% for Business referrals
- **Tracking:** Unique referral codes per account; tracked via Rewardful (Stripe-native)

**Target:** 20% of new Business/Enterprise accounts originating from referrals by Month 12

---

## 8. Reporting & Analytics: The CRO's Control Panel

### 8.1 Revenue Reporting Stack

We need two layers of revenue reporting:

**Layer 1: Internal RevOps Dashboard** (CRO/exec visibility)

Built from Stripe + PostHog + HubSpot data, likely in Metabase or a custom Next.js internal dashboard:

- **Real-time MRR** — live view of all active subscriptions
- **ARR by segment** — Starter / Professional / Business / Enterprise breakdowns
- **New MRR this month** — new customers + upgrades
- **Churned MRR** — cancellations + downgrades
- **Expansion MRR** — upsells + seat additions
- **NRR rolling 12 months** — the single most important SaaS health metric
- **Trial cohort analysis** — by sign-up week, what % converted, when, and to which tier
- **Pipeline forecast** — open deals × weighted probability × expected close month
- **CAC by channel** — cost per acquired customer by acquisition source
- **LTV:CAC by tier** — are we acquiring the right customers profitably?
- **Payback period** — how quickly does a new customer cover their acquisition cost?

**Layer 2: In-product reporting** (what customers see — see Section 5.3)

This drives *retention* by making Lustre's value visible, and drives *expansion* by showing customers what they could unlock at higher tiers.

### 8.2 Weekly CRO Metrics Review

Every Monday, the CRO reviews:

| Metric | Source | Target (Phase 2) |
|---|---|---|
| New trials this week | PostHog / Stripe | >20 |
| Trial-to-paid conversion (rolling 30d) | Stripe | >22% |
| New MRR this week | Stripe | >£5K |
| Churned MRR this week | Stripe | <£500 |
| Open enterprise pipeline value | HubSpot | >£250K |
| Deals advanced this week | HubSpot | ≥3 |
| Deals closed this week | HubSpot | ≥1 |
| NPS (rolling 90d) | In-product / email survey | >45 |
| Health score red accounts | CSM tool | <5% of book |

### 8.3 Monthly Board Reporting

The CRO presents monthly to the board:

1. **MRR waterfall** — Opening MRR → New + Expansion − Churn = Closing MRR
2. **ARR trajectory** — Actual vs. plan vs. prior month
3. **Enterprise account scorecard** — Each account: tier, ARR, health score, renewal date, expansion potential
4. **Pipeline coverage** — Open pipeline value as multiple of ARR target (must be ≥3x)
5. **Unit economics** — CAC, LTV, payback period by tier
6. **Cohort retention** — Month-by-month NRR by cohort (by sign-up quarter)
7. **Competitive wins/losses** — Who we beat, who beat us, why
8. **Forecast** — Bottom-up and top-down ARR forecast for next 3 months

---

## 9. Sales Team & Hiring Plan

### 9.1 Current State

No dedicated sales function exists. The founders are the sales team.

### 9.2 Phase 1 Hiring (Months 1–4)

**No new hires required** — instead, structure founder-led selling:
- CRO (or CEO/CRO equivalent) personally owns the 5 design-partner conversations
- Define the sales playbook from these deals
- Document objections, champion profiles, decision criteria

### 9.3 Phase 2 Hiring (Months 5–8)

Once we have product-market fit signal, billing infrastructure, and 5 paying enterprise accounts:

| Role | Timing | Responsibility |
|---|---|---|
| **SDR (Sales Development Rep)** | Month 5 | Outbound prospecting, qualification, pipeline building for AE |
| **AE (Account Executive)** | Month 5 | Enterprise deals, trial-to-paid conversion for Business tier |
| **Customer Success Manager** | Month 6 | Onboarding, QBRs, expansion, churn prevention for enterprise accounts |

**Hiring criteria for first AE:**
- 2+ years closing B2B SaaS, ideally vertical SaaS or field service
- Comfortable with 60-90 day sales cycles
- Experience selling to operations/FM buyers
- Based in UK; must be able to attend on-site visits for enterprise prospects

### 9.4 Phase 3 Scaling (Months 9–12)

| Role | Quantity | Timing |
|---|---|---|
| Second AE (mid-market focus) | 1 | Month 9 |
| Second CSM | 1 | Month 10 |
| SDR Manager / second SDR | 1 | Month 11 |
| Channel Partnerships Manager | 1 | Month 12 |

**Sales structure at Month 12:**
```
CRO
├── Head of Sales (AE × 2, SDR × 2)
└── Head of Customer Success (CSM × 2)
```

### 9.5 Sales Compensation

**AE on-target earnings (OTE): £70K–£80K base + £70K–£80K variable = £140K–£160K OTE**

- Quota: 4–5× OTE = £560K–£800K ARR per AE annually
- Commission: 12% of first-year ACV on new enterprise accounts; 6% on renewals
- Accelerator: 1.5× commission rate above 100% quota
- Clawback: Full clawback on deals that churn within 6 months

**CSM OTE: £45K–£55K base + £15K–£20K variable = £60K–£75K OTE**

- Variable tied to: NRR of managed book (60%), expansion ARR generated (40%)
- No clawback — CSMs are accountable for retention, not initial close

---

## 10. Implementation Roadmap

### Phase 1 (Months 1–4): Revenue Infrastructure

| Priority | Initiative | Owner | Revenue Impact |
|---|---|---|---|
| P0 | Stripe billing integration live | CTO + CRO | First revenue collected |
| P0 | User invitation flow live | CTO | Removes onboarding blocker |
| P0 | Define and document ICP | CRO | Tightens sales targeting |
| P0 | HubSpot CRM set up (internal) | CRO | Pipeline visibility |
| P0 | Sign 5 design-partner enterprise accounts | CRO | £30K–£50K ARR |
| P1 | 14-day trial policy enforced (no unlimited free access) | CRO + COO | Conversion pressure |
| P1 | Trial-to-paid email sequence built | CRO + CPO | Improved conversion |
| P1 | Pricing page live on marketing site | CRO + CPO | Self-serve enablement |
| P1 | In-product reporting v1 live | CPO + CTO | Enterprise retention |
| P1 | RBAC 4-role expansion live | CTO + CISO | Enterprise selling unblocked |
| P2 | Case study from first design partner | CRO | Social proof |
| P2 | Competitive battle cards built | CRO | Sales efficiency |
| P2 | Sales playbook documented | CRO | SDR/AE hiring-ready |

### Phase 2 (Months 5–8): Sales Engine

| Priority | Initiative | Owner | Revenue Impact |
|---|---|---|---|
| P0 | SDR + AE hired | CRO | Outbound pipeline |
| P0 | CSM hired | CRO | Enterprise retention |
| P0 | SSO/SAML live | CTO + CISO | Enterprise deal flow |
| P0 | MFA live | CTO + CISO | Enterprise procurement approval |
| P1 | Xero integration live + marketplace listing | CTO + CRO | New inbound leads |
| P1 | Google Calendar sync live | CTO | Retention |
| P1 | In-product reporting v2 live | CPO | NRR improvement |
| P1 | Referral programme launched | CRO | Organic growth |
| P2 | Cleaning association partnership signed | CRO | Channel leads |
| P2 | Custom report builder in beta | CPO | Enterprise upsell |
| P2 | Contract management feature live | CTO | Enterprise stickiness |

### Phase 3 (Months 9–12): Scale

| Priority | Initiative | Owner | Revenue Impact |
|---|---|---|---|
| P0 | Multi-branch management live | CTO | ACV expansion |
| P0 | Public REST API v1 live | CTO | Enterprise integrations |
| P0 | Channel partner programme live | CRO | 20% referral ARR |
| P1 | Zapier integration published | CTO | SME retention |
| P1 | Second AE + CSM hired | CRO | Capacity for 50 accounts |
| P1 | SOC 2 Type II audit started | CISO | Enterprise trust signal |
| P2 | Client self-service portal | CPO | Reduce operative churn |
| P2 | SMS/WhatsApp integration | CTO | Operative UX |
| P2 | Annual pricing push / renewal campaign | CRO | Contracted MRR increase |

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **Billing infrastructure delayed past Month 2** | Medium | Critical — zero revenue | Prioritise Stripe integration as P0 alongside user invitations; accept scope reduction elsewhere |
| **Design-partner accounts churn before Phase 2** | Low | High — no reference customers | Weekly CSM contact with design partners; make them feel like co-founders of the product |
| **Enterprise sales cycle exceeds 90 days** | Medium | High — ARR targets slip | Offer shorter POC (30-day structured pilot) to compress cycle; use design partners as warm references |
| **SSO delayed beyond Month 6** | Medium | High — blocks enterprise procurement | Begin SSO build in Month 1; treat it as infrastructure, not a feature |
| **Competitor launches UK-specific version** | Low | High | Accelerate association partnerships; deepen UK-native features (BICSc compliance, UK VAT edge cases) |
| **NRR falls below 100% in Phase 2** | Medium | High — growth is leaky | Invest in health scoring and proactive CSM before scaling acquisition |
| **First SDR underperforms** | Medium | Medium — pipeline stalls | Strong sales playbook before hiring; 90-day ramp plan; joint selling with AE for first 60 days |
| **Pricing too high for SME market** | Low | Medium — self-serve stalls | Starter tier kept accessible; monthly pricing available; 14-day trial no credit card required |

---

## 12. Success Metrics & OKRs

### OKR Framework (12 months)

**Objective 1: Build and activate the revenue engine**
- KR1: Stripe billing live and first invoice collected by end of Month 2
- KR2: 5 enterprise design-partner accounts signed by end of Month 4
- KR3: Trial-to-paid conversion rate ≥20% by end of Month 6
- KR4: £75K ARR achieved by end of Month 4

**Objective 2: Build a repeatable enterprise sales motion**
- KR1: Documented sales playbook with objection handling, ICP, and discovery questions by Month 5
- KR2: SDR generating ≥10 qualified SQLs per month from Month 6
- KR3: AE closing ≥2 enterprise accounts per month from Month 7
- KR4: £300K ARR achieved by end of Month 8

**Objective 3: Retain and expand enterprise revenue**
- KR1: NRR ≥110% across enterprise cohort by Month 10
- KR2: ≥2 enterprise accounts expanded (tier upgrade or branch addition) by Month 9
- KR3: ≥3 published case studies / reference customers available by Month 10
- KR4: Gross revenue churn <3% by end of Month 12

**Objective 4: Build the partnership and channel engine**
- KR1: Xero integration live and listed in Xero App Marketplace by Month 7
- KR2: 1 cleaning industry association partnership signed by Month 8
- KR3: Referral programme live and generating ≥5 qualified referrals/month by Month 10
- KR4: £900K ARR achieved by end of Month 12

---

## 13. Cross-Functional Dependencies

This plan does not exist in isolation. CRO success depends on:

| Dependency | From | Timeline | If Delayed |
|---|---|---|---|
| Stripe billing integration | CTO | Month 2 | Revenue collection impossible |
| User invitation flow | CTO | Month 1 | Enterprise teams cannot onboard |
| RBAC (4+ roles) | CTO + CISO | Month 3 | Enterprise deals blocked |
| SSO/SAML | CTO + CISO | Month 5 | Enterprise IT approval blocked |
| MFA enforcement | CTO + CISO | Month 3 | Security questionnaires fail |
| In-product reporting v1 | CPO + CTO | Month 4 | Renewal conversations weak |
| Marketing site with pricing page | CPO | Month 2 | Self-serve conversion broken |
| Trial email sequence | CPO | Month 2 | Conversion rate stays low |
| DPA / Privacy Policy | COO + Legal | Month 2 | Enterprise procurement stalls |
| Help centre (initial articles) | COO + CPO | Month 3 | Support load hits sales time |

---

## 14. The CRO's First 30 Days

Before any strategy can be executed, the following must happen in the first 30 days:

1. **Audit every trial account** — Who is currently trialling? What is their ICP fit? Can any be converted to design partners before billing goes live?
2. **Set up HubSpot CRM** — Every prospect, lead, and customer goes in immediately. No more spreadsheet pipeline.
3. **Define the ICP precisely** — Write the one-page ICP document; validate with the 5 best current users.
4. **Write the pricing page copy** — Before engineering builds it, the CRO writes the positioning and feature comparison.
5. **Begin 5 design-partner conversations** — Identify prospects from the trial base or network; personal outreach from the CEO/CRO.
6. **Establish revenue reporting baseline** — Even if Stripe isn't integrated, manually calculate what MRR *would be* if all trials converted. This is the target baseline.
7. **Map every feature gate** — Work with CPO to confirm which features sit behind which plan. Remove any feature that is gated but shouldn't be (onboarding friction).
8. **Review every competitor's pricing page** — Understand how we compare and where we're differentiated or exposed.
9. **Draft the first sales playbook page** — Start writing; every design-partner conversation adds to it.
10. **Book a revenue review cadence** — Weekly CRO metrics review, monthly board revenue report. Instil the habit before there's revenue to report.

---

## Appendix A: CRO Glossary

| Term | Definition |
|---|---|
| **ARR** | Annual Recurring Revenue — MRR × 12 |
| **MRR** | Monthly Recurring Revenue — sum of all active paid subscriptions per month |
| **NRR** | Net Revenue Retention — measures expansion vs. churn in existing customers; >100% = growing without new customers |
| **GRR** | Gross Revenue Retention — NRR excluding expansion; measures pure churn |
| **ACV** | Annual Contract Value — value of a single customer's annual contract |
| **CAC** | Customer Acquisition Cost — total sales & marketing spend / new customers |
| **LTV** | Lifetime Value — average revenue per customer over their lifetime |
| **ICP** | Ideal Customer Profile — precise definition of who we sell to |
| **SQL** | Sales Qualified Lead — prospect confirmed as a genuine sales opportunity |
| **MQL** | Marketing Qualified Lead — prospect who has shown intent but not yet sales-qualified |
| **OTE** | On-Target Earnings — total compensation at 100% quota achievement |
| **QBR** | Quarterly Business Review — structured meeting with enterprise customer to review value, roadmap, and renewal |
| **POC** | Proof of Concept — structured 30-day trial for enterprise prospects |
| **RevOps** | Revenue Operations — the team/function that connects marketing, sales, and CS into one revenue view |
| **Churn** | Customers who cancel; expressed as % of MRR lost per month |
| **Expansion** | Revenue from existing customers upgrading or adding seats |
| **Land and Expand** | Strategy of winning a small initial deal, then growing revenue within the account over time |

---

*This document is confidential and intended for the Lustre executive team only.*
*Next review: 30 days from distribution — align with Phase 1 milestone check-in.*
