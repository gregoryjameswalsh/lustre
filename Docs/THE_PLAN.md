# THE PLAN
**Author:** CEO
**Date:** March 2026
**Status:** Final — Version 1.0
**Horizon:** 12 months (Q2 2026 – Q1 2027)

---

## The One-Line Summary

Get the first pound into the bank account within 30 days, close 5 paying customers within 90 days, and build the engine that reaches £900K ARR by end of Year 1.

---

## Where We Are

Lustre is real. The product works. We have a clean, well-architected CRM built specifically for UK cleaning and property maintenance businesses — quote generation with shareable PDFs, job scheduling, client management, activity tracking, multi-tenant security. This is not vapourware.

What we do not have is revenue.

The CRO plan is comprehensive and correct. I've reviewed it in full. The diagnosis is accurate: the database schema already anticipates billing (`stripe_customer_id`, `subscription_status`, `plan`, `trial_ends_at`) but no Stripe integration exists. We are leaving money on the table every single day that changes.

This document is the synthesis. It is what we actually do, in what order, and why.

---

## The CEO's Three Principles for This Phase

**1. Revenue before anything else.**
Every decision in the next 90 days is filtered through one question: *does this help us get paid*? Features that don't touch billing, conversion, or onboarding enterprise customers wait.

**2. Five customers before fifty.**
The CRO plan has £900K ARR targets at Month 12. Those are right. But the only way to get there is to obsess over the first five paying customers more than any other activity. Five real paying customers teach us more than fifty conversations.

**3. Small team, big focus.**
We do not hire until we have ten paying customers. Every hour spent hiring before that is an hour not spent closing. The founders are the sales team until the playbook is proven.

---

## The Honest Assessment: What's Built, What's Missing

### What We Have (and It's Good)

| Feature | Status | Revenue Relevance |
|---|---|---|
| Client & property management | ✓ Live | Core product value |
| Quote generation + PDF | ✓ Live | Primary sales tool for our customers |
| Shareable quote links with view tracking | ✓ Live | Viral loop + buying signals |
| Job scheduling | ✓ Live | Core retention feature |
| Activity timeline (13 event types) | ✓ Live | Engagement depth = retention |
| Onboarding flow (4 steps) | ✓ Live | Activation path exists |
| Multi-tenant RLS architecture | ✓ Live | Enterprise-grade security |
| UK-native (VAT, GBP, addresses) | ✓ Live | Competitive moat |
| Professional UI/UX | ✓ Live | Reduces selling friction |

### What We're Missing (Ordered by Revenue Impact)

| Gap | Revenue Impact | Target |
|---|---|---|
| **Stripe billing integration** | Cannot collect money at all | Week 2 |
| **Pricing page on marketing site** | Self-serve impossible | Week 3 |
| **Team invitation flow** | Enterprises can't onboard teams | Week 4 |
| **Trial enforcement (14-day limit)** | No conversion pressure | Week 4 |
| **In-product reporting v1** | Renewal conversations are weak | Month 2 |
| **RBAC (4 roles)** | Enterprise deals blocked | Month 2 |
| **MFA** | Security teams block procurement | Month 3 |
| **SSO / SAML** | IT departments won't approve | Month 5 |
| **Multi-branch management** | Franchise/FM expansion blocked | Month 8 |

---

## The Plan: Three Phases

---

### Phase 1 — "First Revenue" (Months 1–4)
**Goal: £75K ARR. 5 paying enterprise accounts. Billing live.**

This phase is entirely about removing every blocker between us and taking payment. Nothing else matters as much.

#### The Critical Path to First Revenue

The sequence is strict. Each item unblocks the next:

```
Week 1:  Stripe integration scoped and started
Week 2:  Stripe billing live (subscriptions, trial enforcement, webhooks)
Week 3:  Pricing page live on marketing site
Week 4:  Team invitation flow live
Week 4:  14-day trial enforced for all new signups
Month 2: First paying customers converted from existing trials
Month 2: In-product reporting v1 live
Month 3: RBAC (4 roles) + MFA live
Month 4: 5 design-partner enterprise accounts signed and paying
```

#### Pricing — What We Launch With

We launch four tiers. Prices are annual-first (monthly available at 25% premium):

| Tier | Annual Price | Monthly Price | Users | Target Customer |
|---|---|---|---|---|
| **Starter** | £39/mo | £49/mo | Up to 3 | Sole traders, micro teams |
| **Professional** | £119/mo | £149/mo | Up to 15 | Growing SMEs |
| **Business** | £319/mo | £399/mo | Up to 50 | Established businesses |
| **Enterprise** | From £1,500/mo | Negotiated | Unlimited | FM firms, franchises |

**Important CEO note on pricing:** These prices are right. Do not discount them to win early customers except within the formal design-partner programme. Discounting before we have data tells us nothing — it just trains prospects to wait for a deal.

#### Design-Partner Programme (Enterprise Fast Track)

We cannot wait for full enterprise feature completion to sign enterprise accounts. Instead, we run a formal design-partner programme: five companies who get preferential treatment in exchange for early commitment and feedback.

**Design-partner criteria:**
- 15+ field operatives, UK-based
- Currently on spreadsheets, WhatsApp, ServiceM8, Tradify, or Jobber
- Decision-maker is accessible (MD, Operations Director, or Finance Director)
- Willing to do a case study / reference call within 6 months
- Pays at least £500/mo from day one — this validates commercial intent, not just interest

**What design partners get:**
- 40% off Enterprise pricing for the first 12 months (minimum £900/mo still)
- Direct access to the founders for roadmap input (monthly call)
- White-glove onboarding — we migrate their data personally
- Feature prioritisation influence for the things that block their workflow

**What we get:**
- First revenue
- Real usage data at enterprise scale
- Reference customers for Phase 2 sales conversations
- Validated ICP before we hire salespeople

**Where we find them:**
- Existing trial accounts — audit all current trials this week; identify any ICP-fit companies
- Founder networks — personal outreach, not cold email
- LinkedIn — Operations Directors and MDs at UK commercial cleaning firms and FM companies
- BICSc members directory
- Competitors' reviews on Capterra and G2 — unhappy ServiceM8/Jobber users are our warmest leads

**The outreach script (short version):**
> "We're building the CRM that UK cleaning companies have always needed and we're looking for five forward-thinking businesses to shape it with us. In exchange for early access and your input, you get [X]. Can we have 20 minutes?"

Every design-partner conversation is led personally by the CEO or CRO. No delegation at this stage.

#### Self-Serve Revenue (The Other Stream)

Enterprise is not the only path to revenue. While we're pursuing design partners, the self-serve funnel can start generating Starter and Professional revenue the moment billing is live — potentially within 30 days.

**Self-serve activation sequence:**
1. Billing live → all trials show "your trial ends in X days" countdown
2. Pricing page live → clear comparison of what each tier includes
3. In-app upgrade prompt → contextual, triggered by feature gate clicks
4. Trial-to-paid email sequence → 5 emails over 14 days:
   - Day 0: Welcome + "3 things to do in your first session"
   - Day 3: "Have you sent your first quote?" — highlights quote PDF feature
   - Day 7: "Your pipeline at a glance" — highlights activity timeline
   - Day 10: If low activity — personal "Can I help?" from a real person
   - Day 14: "Your trial ends today" — upgrade prompt with annual pricing
5. Cancel-intent survey → anyone who doesn't upgrade gets asked why

**Target:** 15% trial-to-paid conversion from Month 2. Even 10 conversions/month at £149 average is £1,490 MRR — not enterprise money, but it is real revenue and it proves the model.

#### What We Are Not Doing in Phase 1

- No hiring (unless a design-partner deal requires it)
- No SSO/SAML (build it, but not a Phase 1 selling requirement)
- No partnerships or integrations
- No PR or marketing campaigns
- No referral programme
- No public API

If it's not on the critical path above, it waits.

---

### Phase 2 — "Build the Engine" (Months 5–8)
**Goal: £300K ARR. 20 enterprise accounts. First hires made.**

By Month 5 we have five paying enterprise customers, a billing system, reference customers, and a playbook. Now we build the machine that replicates those results without founders doing every deal personally.

#### The Hiring Plan

We hire in this sequence, and only after the preceding milestone is hit:

| Hire | Trigger | Month |
|---|---|---|
| **Account Executive** | 5 enterprise accounts closed | Month 5 |
| **SDR** | AE fully ramped (30 days in) | Month 6 |
| **Customer Success Manager** | 10 enterprise accounts | Month 6 |

**CEO rationale:** Hiring before the playbook is proven wastes money and creates bad habits. The first AE inherits a documented process — discovery questions, objection handling, demo script, pilot structure. We write that playbook during Phase 1. The first AE runs the plays, doesn't invent them.

**First AE profile:** UK-based. 2+ years closing B2B SaaS. Comfortable with 60–90 day cycles. Experience selling to operations or FM buyers is a strong plus. OTE £140K–£160K (£70–80K base + variable).

#### Product Priorities in Phase 2

| Feature | Why Now | Target |
|---|---|---|
| SSO / SAML | Unblocks enterprise IT procurement | Month 5 |
| MFA enforcement | Security questionnaires | Month 5 |
| In-product reporting v2 | QBR conversations and renewal justification | Month 6 |
| Xero integration | Marketplace listing, inbound leads, retention | Month 7 |
| Google Calendar sync | Scheduling UX, retention for Business tier | Month 7 |
| Custom report builder (beta) | Enterprise upsell trigger | Month 8 |

#### The Sales Motion at Scale

With an AE + SDR in place:

**Enterprise pipeline targets:**
- SDR generates 10+ qualified SQLs/month from Month 6
- AE closes 2+ enterprise accounts/month from Month 7
- Sales cycle: 60–90 days average
- Pipeline coverage: maintain 3× ARR target at all times

**Outbound targets (SDR-led):**
- FM companies with 20+ staff (Facilities Show attendees list, LinkedIn)
- Commercial cleaning companies with multiple client contracts (Cleaning Matters readership)
- Franchise networks operating multiple cleaning brands (BFA members directory)

**Inbound motion (starts in Phase 2):**
- Xero App Marketplace listing drives discovery
- Case studies from design partners published on the site
- SEO content targeting "CRM for cleaning companies UK", "field service management software UK"
- Association partnership with BICSc (endorsed supplier)

#### Customer Success: Revenue, Not Support

The CSM hired in Month 6 owns a book of ARR. Their job is NRR — not ticket resolution time.

**CSM cadence for enterprise accounts:**
- Month 1: Weekly check-ins, active onboarding support
- Months 2–3: Biweekly reviews, usage coaching
- Month 4+: Monthly QBRs showing revenue impact (via in-product reporting)
- Renewal minus 90 days: Expansion conversation begins

**Health scoring triggers:**
- Red flag: <2 logins/user/month, 0 quotes in 30 days, 0 jobs scheduled in 30 days
- Red account response: CSM outreach within 24 hours, coaching offer, feature spotlight
- Last resort: Plan downgrade before cancellation — keep the relationship, keep some revenue

---

### Phase 3 — "Scale and Expand" (Months 9–12)
**Goal: £900K ARR. 50 enterprise accounts. NRR >120%.**

Phase 3 is execution of a proven system at higher volume. The playbook is written. The hires are made. The product is feature-complete for enterprise. Now we pour fuel on it.

#### Expansion Revenue (The Growth Multiplier)

NRR >120% means existing customers are growing faster than we're churning them. This is the most capital-efficient form of growth. The mechanisms:

- **Seat expansion:** Automated trigger when account hits 80% of plan limit → CSM outreach → upgrade conversation
- **Branch expansion:** Multi-branch feature live in Month 8 → franchise and FM accounts add locations → ACV doubles or triples per account
- **Tier upgrade:** Feature gate click tracking identifies upgrade candidates → AE-led conversation showing ROI of next tier

**Target:** 2+ enterprise accounts expanded per month from Month 9.

#### Channel and Partnerships

| Partner Type | Model | Target Month |
|---|---|---|
| **Xero** | Integration + App Marketplace listing | Month 7 |
| **Cleaning industry accountants** | £150 referral fee per annual conversion | Month 8 |
| **BICSc (British Institute of Cleaning Science)** | Endorsed supplier, member discount | Month 8 |
| **Franchise consultants** | Referral fee + co-branded onboarding | Month 10 |
| **Zapier** | Integration published | Month 10 |
| **QuickBooks** | Integration + marketplace | Month 11 |

**Referral programme (Month 9 launch):**
- Referring customer: 1 month free credit per new paying customer referred
- Referred customer: 20% off first 3 months
- Target: 20% of new Business/Enterprise accounts from referrals by Month 12

#### Scale Hires (Phase 3)

| Role | Month | Trigger |
|---|---|---|
| Second AE (mid-market focus) | Month 9 | >20 enterprise accounts |
| Second CSM | Month 10 | Book of ARR exceeds 1 CSM capacity |
| Channel Partnerships Manager | Month 11 | Partner programme has 3+ active relationships |

**Month 12 sales structure:**
```
CRO / Head of Revenue
├── Sales (AE × 2, SDR × 2)
└── Customer Success (CSM × 2)
```

---

## The Revenue Model

### 12-Month Targets

| Metric | Month 4 | Month 8 | Month 12 |
|---|---|---|---|
| Enterprise ARR | £75K | £300K | £900K |
| Enterprise Accounts | 5 | 20 | 50 |
| Self-serve MRR | £5K | £20K | £50K |
| Total ARR | ~£135K | ~£540K | ~£1.5M |
| Net Revenue Retention | — | 105% | 120% |
| Trial → Paid Conversion | 12% | 22% | 30% |
| Gross Churn | <5% | <4% | <3% |

*Self-serve ARR targets are conservative — they depend on marketing investment which is minimal in Phase 1. These will be revised upward if we invest in SEO/content earlier.*

### Unit Economics Targets

| Metric | Target | Why It Matters |
|---|---|---|
| LTV:CAC ratio | >5× (enterprise) | Sustainable growth |
| Payback period | <12 months | Capital efficiency |
| Gross margin | >80% | SaaS benchmark |
| Enterprise ACV | £18K (Year 1) → £22K (Year 2) | Land and expand working |

---

## The CEO's First 30 Days

No strategy survives first contact with reality. Here is exactly what I am doing in the next 30 days:

**Week 1:**
- [ ] Audit every current trial account — name, company, ICP fit score, usage depth
- [ ] Identify top 10 ICP-fit trials who could become design partners
- [ ] Begin Stripe billing integration (scope with CTO — this is Week 1, not Month 1)
- [ ] Write pricing page copy (before engineering builds it)
- [ ] Set up HubSpot CRM — every prospect goes in immediately

**Week 2:**
- [ ] Personal outreach to 10 design-partner candidates (email + LinkedIn + phone)
- [ ] First 5 design-partner conversations booked
- [ ] Stripe integration in review/testing
- [ ] 14-day trial enforcement spec written and scoped

**Week 3:**
- [ ] Pricing page live on marketing site
- [ ] Stripe billing live (even if limited to card-on-file, not full self-serve)
- [ ] Trial-to-paid email sequence built and live in Resend
- [ ] First design-partner calls completed; 2+ advanced to proposal stage

**Week 4:**
- [ ] Team invitation flow live (blocker for enterprise onboarding)
- [ ] Trial enforcement live (all new signups see countdown)
- [ ] First design-partner contract signed
- [ ] Write the first page of the sales playbook from what we've learned

**By end of Month 1, we will have:**
- At least one paying customer
- Billing infrastructure live
- A pricing page
- A trial-to-paid conversion sequence
- The beginning of a documented sales playbook

If we don't hit the first paying customer by end of Month 1, we stop and ask why. There is no acceptable reason to have billing live and no paying customers within 30 days of it going live.

---

## Risks and How We Handle Them

| Risk | Likelihood | Impact | Our Response |
|---|---|---|---|
| **Stripe integration takes longer than 2 weeks** | Medium | Critical | This is P0. Scope aggressively, cut other work to protect it. Accept debt. |
| **Design partners won't pay before SSO/RBAC is live** | Medium | High | Design-partner deal explicitly stages features — they commit now, SSO delivered by Month 3. Use contract. |
| **Trial-to-paid conversion stays below 10%** | Medium | High | Exit survey every non-converter. Listen, respond, adjust. Don't guess. |
| **Enterprise sales cycle slips past 90 days** | Medium | High | 30-day structured POC (pilot). Reference calls from other design partners. CEO as executive sponsor. |
| **Competitor launches UK-specific version** | Low | High | Deepen UK-native features faster than they can catch up. Accelerate BICSc partnership. |
| **First AE underperforms** | Medium | Medium | Full playbook before hire. 90-day ramp plan. Joint selling for first 60 days. Clear quota milestone at day 90. |
| **NRR falls below 100% in Phase 2** | Medium | High | Invest in CSM and health scoring *before* scaling acquisition. A leaky bucket is worse than a slow one. |

---

## What Success Looks Like

At the end of 12 months, Lustre should look like this:

- **50 enterprise accounts**, each paying £18K+ ACV annually — none of them wondering if they'll renew
- **NRR >120%** — existing customers growing faster than we're churning, meaning we grow without needing new customers to just stand still
- **£900K ARR** on the enterprise side alone, plus a growing self-serve base heading toward £1.5M total ARR
- **A documented, repeatable sales machine** — discovery → demo → pilot → close — that works without the founders in every deal
- **3+ published case studies** from design partners who genuinely champion the product
- **A team of 6–8** (2 AEs, 2 SDRs, 2 CSMs, plus engineering and leadership) — not 25 people burning runway, but 6–8 doing the right work
- **SOC 2 Type II audit started** — the signal to enterprise IT that we're serious about security
- **Xero and Google integrations live** — the most-asked-for integrations that drive both inbound leads and retention

---

## The Competitive Position We Are Building

Our positioning statement — and we should be able to say this without hesitation to every prospect:

> *"Lustre is the only CRM built specifically for UK cleaning and property maintenance businesses — combining client management, professional quoting, job scheduling, and revenue reporting in one place, without the complexity of generic enterprise tools."*

The four wedges we lead with in every enterprise conversation:

1. **UK-native** — VAT handling, UK address formats, GBP-first, GDPR-ready by design. Not a US or Australian tool retrofitted for the UK market.
2. **Quote-to-job workflow** — Seamless from prospect to quote to accepted to scheduled job. Competitors require separate tools for each.
3. **Enterprise-ready security** — Multi-tenant RLS, full audit trail, SSO/SAML, MFA. Built in, not bolted on.
4. **Fast time-to-value** — Customers send their first quote in their first session. We've seen this in trials.

The primary "competitor" we're beating is **spreadsheets and WhatsApp**. Every enterprise customer we close has a story about losing a quote, forgetting a follow-up, or not knowing which jobs were profitable. We solve that.

---

## A Note on Focus

The CRO plan (which is excellent and forms the backbone of this document) covers every angle at once: partnerships, channel, referrals, RevOps stack, content, SEO, PR, associations, and more. That is the right 12-month picture.

But the biggest risk to Lustre right now is not a missing feature or a wrong hire. It is **trying to do too many things in the wrong order**.

The path is:
1. Get billing live
2. Get the first customer paying
3. Get five customers paying
4. Learn what makes them stay
5. Then scale that

Everything else is in service of those steps, or it waits.

---

*This document synthesises the CRO enterprise plan and existing product state.*
*Next review: 30 days from distribution — first milestone check-in against Week 4 targets above.*
*Owner: CEO*
*Distribution: Executive team only*
