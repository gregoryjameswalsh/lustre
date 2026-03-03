# Lustre — Chief Product Officer: Enterprise Readiness Plan
**Reference:** CPO-ENT-001
**Author:** Chief Product Officer
**Date:** March 2026
**Status:** Draft for Executive Review
**Companion Documents:** CRM-ENT-001 (CCO), OPS-ENT-001 (COO), CFO-ENT-001 (CFO)

---

## Executive Summary

Lustre has a solid MVP. The architecture is clean, the data model is sound, and the core workflow — client → property → job → quote — is well-implemented. What we have built is a capable operational tool for small cleaning and property maintenance businesses.

What we have not yet built is a **product** in the full sense: something with measurable adoption, deliberate user experience, feedback loops, a clear ICP, a growth motion, and the layers of polish and capability that enterprise buyers expect before signing a contract.

The COO's plan addresses operational infrastructure. The CCO's plan addresses commercial features. The CFO's plan addresses financial viability. This plan addresses the fourth pillar: **product strategy, user experience, analytics, and the operating model that ties it all together.**

My assessment is direct: Lustre is currently a well-built internal tool dressed as a SaaS product. Closing the gap requires us to stop building features in isolation and start building a product — one that guides users to value, measures whether they reach it, and compounds on what works.

**This plan will not duplicate the COO or CCO roadmaps.** Where those plans define *what* features to build (SSO, pipeline, automation), this plan defines *how we build and ship product*, *who we are building it for*, *what the experience must feel like*, and *how we measure whether it is working*.

---

## 1. Current State — A Product Assessment

### 1.1 What Lustre Gets Right

The core user journey is coherent. A cleaning business owner can sign up, complete the onboarding wizard, add a client, create a quote, send it, and log the result — all in under 30 minutes on first use. That is a meaningful achievement for an MVP.

The data model is well-designed. The use of an immutable audit log, RLS-enforced tenancy, and an append-only activity timeline reflects product maturity beyond what the version number suggests.

The quote PDF feature is a genuine customer delight moment — a polished, shareable output that makes the user look professional. This is a strong signal about where Lustre's core value lies: **helping small businesses present themselves with confidence.**

### 1.2 What Lustre Gets Wrong (or Has Not Yet Done)

**There is no product telemetry.** We do not know which features users engage with, where they drop off, how often they return, or what actions correlate with retention. We are shipping in the dark.

**The UX is functional, not considered.** The interface renders well but has not been designed with the user's mental model in mind. Actions feel disconnected. The dashboard surfaces data but does not tell a story. There are no empty states, no contextual prompts, no progressive disclosure — the hallmarks of a product that teaches itself.

**There is no user feedback loop.** No NPS survey. No in-app feedback widget. No mechanism for users to tell us what is missing or broken. We are inferring user needs from first principles rather than evidence.

**The onboarding wizard is a form, not an experience.** It collects data but does not demonstrate value. A user who completes onboarding has configured their organisation — they have not yet experienced *why Lustre is worth paying for*.

**The mobile experience is unknown and likely poor.** Field service workers are not at desks. Operatives need to check job details, mark jobs complete, and capture notes from their phones. The product is built desktop-first with no documented mobile strategy.

**Role experience is binary and unthoughtful.** Admin and team_member roles exist in the database but the product experience does not meaningfully differentiate between them. An operative logs in and sees the same interface as the owner — a missed opportunity for role-appropriate design.

**There is no search.** A business owner with 200 clients cannot quickly surface a specific record. Global search is a baseline expectation.

---

## 2. Ideal Customer Profile — Who We Are Building For

Before we can make good product decisions, we need to be precise about who we are serving. The current MVP was built for a generic "cleaning business owner." For enterprise readiness, we need sharper definitions.

### 2.1 Primary ICP: The Growth-Stage Independent Cleaning Company

**Size:** 5–30 staff
**Structure:** Owner-operator with 2–5 field teams and an admin or coordinator
**Revenue:** £200K–£2M per year
**Pain points:**
- Managing job scheduling across multiple teams using WhatsApp and spreadsheets
- Sending quotes via email attachments that look unprofessional
- Losing track of follow-ups when busy
- Having no visibility into which clients are most profitable
- Struggling to bring on staff without sharing passwords

**What they value:** Looking professional, saving time, not making mistakes in front of clients.
**What they fear:** Overpaying for software they won't use, losing customer data, disrupting a business that is already working.

**Success signal:** Within 7 days of signing up, they have sent a quote from Lustre to a real client.

### 2.2 Secondary ICP: The Regional Property Maintenance Company

**Size:** 30–150 staff across multiple locations
**Structure:** Regional manager + branch managers + field operatives
**Revenue:** £1M–£8M per year
**Pain points:**
- Franchised structure means data is siloed across locations
- Manager needs oversight without micromanagement
- Enterprise customer clients require SLAs and formal documentation
- Existing tools (spreadsheets, basic CRMs) cannot scale to multi-site

**What they value:** Reporting, oversight, process consistency, compliance documentation.
**What they fear:** A tool that works for the CEO but fails for the field team.

**Success signal:** Multiple branch locations active, manager-level reporting in use, at least one enterprise client served via Lustre.

### 2.3 Anti-ICP (Who We Are Not Building For — Yet)

- Solo sole traders with fewer than 3 clients (cannot monetise effectively)
- Large FM (facilities management) companies requiring deep ERP integration (complexity would compromise core product)
- Non-cleaning industries (dilutes domain expertise and marketing message)

---

## 3. Product Strategy — The Three-Horizon Framework

### Horizon 1: Core Excellence (Now → 6 Months)
*Make the core product so good that users cannot imagine managing their business without it.*

The features we have must work flawlessly, feel polished, and reward use. The jobs-to-be-done for the primary ICP are: schedule jobs, win quotes, track clients, follow up reliably. These must be the best-in-class experience in our category.

### Horizon 2: Platform Expansion (6–12 Months)
*Add the layers that enterprise buyers require and that competitive alternatives do not easily replicate.*

This is where SSO, RBAC, API, multi-branch, and automation live — not because they are exciting features, but because they are the price of entry to mid-market deals. The COO and CCO roadmaps cover *what* these features are. This document covers *how they must feel and be validated*.

### Horizon 3: Network Effects and Ecosystem (12+ Months)
*Create value that exists between users, not just within individual organisations.*

A client portal that end-customers use. A marketplace of integration partners. Benchmark data that shows a Lustre customer how their average quote conversion rate compares to similar businesses. These are the moat-building features that make Lustre defensible.

---

## 4. Product Experience — The Enterprise UX Gap

Enterprise software has a reputation for being ugly and complex. That is not inevitable — it is the result of adding features without design leadership. Lustre has an opportunity to be the "Stripe of field service CRMs": technically rigorous, visually clean, and obviously well-made.

### 4.1 Design System Foundation

The current implementation uses Shadcn UI and Tailwind CSS — a solid choice. What is missing is a **product design system**: a documented set of design decisions, component patterns, and interaction guidelines that ensure the product feels coherent as it scales.

**Required deliverables:**
- Component library documented with usage guidelines (Storybook or equivalent)
- Colour and typography tokens that encode brand identity
- Spacing and layout grid system applied consistently
- Icon set locked to Lucide (already in use) — no mixing icon libraries
- Motion and transition standards (current: none)
- Loading state patterns (skeleton screens, not spinners)
- Empty state standards — every list view needs a considered empty state
- Error state standards — form errors, network errors, permission errors

**Why this matters for enterprise:** Enterprise buyers evaluate software in demos and trials. A product that feels inconsistent signals engineering immaturity. Design consistency is a trust signal.

### 4.2 Role-Appropriate User Experiences

The product must present differently depending on who is logged in. This is not just a permissions problem — it is a design problem.

**Admin / Owner view:**
- Full dashboard with financial summary, team activity, outstanding follow-ups
- Access to settings, billing, team management
- Ability to see all jobs, quotes, and clients across the organisation

**Manager view:**
- Team performance, open follow-ups assigned to their direct reports
- Approval workflows for quotes above a threshold
- Reporting for their team or region only

**Operative view:**
- "My Jobs Today" — a simplified, mobile-optimised view of their day
- Ability to mark jobs complete, add notes, capture photos (future)
- No access to client financials, quote values, or team settings
- Clean, fast, low-cognitive-load interface

**Coordinator / Admin support view:**
- Client list, job scheduling, quote management
- No access to billing, user management, or financial reporting

Designing these role views requires a UI approach that is **adaptive by default**, not a single universal interface that everyone sees.

### 4.3 Mobile-First Field Operations

Field service workers are mobile. This is not a detail — it is the nature of the industry. The current product has no documented mobile strategy.

**Requirements:**
- Responsive design that degrades gracefully to 375px viewport
- "My Jobs Today" view optimised for one-handed mobile use
- Job status updates must be completable in under 3 taps
- No data entry flows that require more than a soft keyboard
- Offline-capable job viewing (service worker cache for job details)
- Push notifications for job reminders and updates

**Progressive Web App (PWA) as Phase 1 mobile strategy:**
- PWA is the right starting point — it uses the existing Next.js codebase, no app store submission
- Home screen installation, offline caching, push notifications
- This covers 80% of the mobile use case without the overhead of native development

**Native app consideration (Horizon 3):**
- iOS and Android native apps only if PWA falls short on camera integration (photo capture on job completion)
- Defer until we have field usage data to justify the investment

### 4.4 Global Search

Every entity in the system — client, job, quote, property, follow-up — must be searchable from a single, persistent search bar. This is a basic expectation in any tool used daily.

**Implementation approach:**
- Keyboard shortcut (Cmd/Ctrl + K) to open search palette
- Search across: clients (name, email, phone), jobs (status, service type), quotes (title, client name), properties (address, postcode)
- Results grouped by entity type
- Recent searches persisted per user
- Full-text search via Postgres `tsvector` — already available in Supabase

### 4.5 Notification Centre

Currently, users discover new information by navigating to it. Enterprise users need to be pulled to what matters.

**In-app notification centre:**
- Quote viewed by client → notify the assigned user
- Quote accepted or declined → notify
- Follow-up due today or overdue → notify
- Job approaching scheduled time → notify assigned operative
- Team member completed a job → notify admin

**Notification preferences:** Per-user opt-in per notification type. Never force notifications on users.

**Email digests:** Daily digest of outstanding follow-ups and upcoming jobs — configurable per user.

---

## 5. Product Analytics — Building the Measurement Layer

The most urgent gap in our current product is the absence of any measurement. We cannot improve what we cannot see.

### 5.1 Product Analytics Platform

**Recommended: PostHog** (self-hosted or cloud)
- Open source, privacy-friendly, GDPR-compliant
- Combines event analytics, session recording, feature flags, and A/B testing in one platform
- Supabase-compatible identity joining
- Strong Next.js SDK

**Alternative: Mixpanel** (if PostHog is vetoed)
- Better enterprise analytics features
- Higher cost
- Requires more engineering to integrate GDPR compliance

**What we must instrument (Day 1 events):**

| Event | Properties | Purpose |
|-------|-----------|---------|
| `user_signed_up` | plan, source, referrer | Acquisition funnel |
| `onboarding_step_completed` | step_name, time_spent | Onboarding drop-off |
| `onboarding_completed` | total_time, steps_skipped | Activation |
| `client_created` | source (manual/import) | Core action |
| `quote_created` | pricing_type, line_item_count | Core action |
| `quote_sent` | delivery_method | Value moment |
| `quote_viewed` | time_on_page | Engagement signal |
| `quote_accepted` | value, days_to_accept | Revenue signal |
| `job_created` | service_type, assigned | Core action |
| `job_completed` | duration, price | Completion |
| `follow_up_created` | priority | Engagement |
| `follow_up_completed` | days_overdue | Health signal |
| `feature_used` | feature_name, role | Adoption tracking |
| `session_started` | role, days_since_signup | Retention |
| `subscription_upgraded` | from_plan, to_plan | Revenue |
| `subscription_cancelled` | reason (from exit survey) | Churn |

**Privacy requirements:**
- No PII in event properties — use IDs, not names or emails
- Org-level aggregation for benchmarking
- Cookie consent gate before tracking (GDPR requirement)
- IP anonymisation enabled by default

### 5.2 The Activation Metric

The single most important product metric in the next 6 months is the **activation rate**: the percentage of new signups who reach a meaningful value moment within their first 7 days.

**Proposed activation definition:**
> A user is "activated" if they have, within 7 days of signup: (1) completed onboarding, (2) created at least one client, and (3) either created a job or sent a quote.

This is measurable, meaningful, and connected to real business value (the user has managed a real client interaction using Lustre).

**Target:** 40% activation rate within 6 months of instrumentation.

### 5.3 In-Product Reporting for Users

The COO dashboard shows three count cards. That is not reporting — it is a status bar.

Enterprise users need **business intelligence built into the product**. These are not optional nice-to-haves; they are the primary reason a business owner opens the app on Monday morning.

**Required dashboard views:**

**Executive / Owner Summary:**
- Revenue booked this month vs. last month (from completed jobs)
- Quote conversion rate: sent → accepted (rolling 30 days)
- Top 5 clients by job value
- Average job value trend (12-month sparkline)
- Outstanding follow-ups by priority
- Revenue forecast: upcoming scheduled jobs × average job value

**Operations Summary:**
- Jobs by status: scheduled / in-progress / completed / cancelled
- Upcoming jobs by day (next 7 days — Gantt-style or calendar)
- Team utilisation: jobs per operative this week
- Overdue follow-ups with owner and days overdue

**Commercial Summary:**
- Quote pipeline: draft / sent / viewed / accepted / declined (funnel visualisation)
- Average time from quote sent → quote accepted
- Win rate by service type
- New clients this month (vs. target)
- Clients with no activity in 60+ days (churn risk indicator)

**Report export:**
- CSV export on all data views
- PDF report generation for board or client reporting (Phase 2)
- Scheduled email reports (weekly summary to admin email)

### 5.4 Analytics as an Enterprise Feature Gate

Detailed reporting (custom date ranges, team comparisons, export) should be gated behind the Business and Enterprise plans. This creates a meaningful upgrade driver beyond headcount.

| Plan | Analytics |
|------|-----------|
| Starter | 30-day dashboard only, no export |
| Professional | 90-day range, CSV export |
| Business | 12-month range, scheduled reports, comparison views |
| Enterprise | Custom date range, multi-branch rollup, API access to metrics |

---

## 6. Onboarding — From Configuration to Value

The current onboarding wizard asks users to configure their account. It does not show them why Lustre is worth their time. This is the most important UX investment we can make in the next 90 days.

### 6.1 Onboarding Redesign Principles

**Principle 1: Get to value in one session.**
A new user should complete onboarding and take their first meaningful action (send a quote or create a job) within their first visit. The current 5-step wizard completes configuration but deposits the user on an empty dashboard with no next step.

**Principle 2: Earn data, don't demand it.**
Every field in the onboarding wizard should have a visible purpose. If we ask for a logo, show a preview of how it appears on a quote PDF. If we ask for service types, show how they map to job categories. Data entry should feel generative, not bureaucratic.

**Principle 3: The first client should be a real one.**
The final onboarding step should guide the user to add a real client (not a dummy), and then create a quote or job for that client. Activation happens when Lustre is used for real work, not when configuration is complete.

### 6.2 Redesigned Onboarding Flow

**Step 1: Business Identity (2 minutes)**
- Business name, logo upload (preview rendered in real-time on a quote template)
- Address and phone number
- *Why we ask:* "This appears on every quote we generate for you."

**Step 2: Your First Client (3 minutes)**
- Add one real client from their existing list
- Name, email, phone — the minimum
- Show an immediate preview: "This is how [Client Name] will appear in your CRM"
- *Skip option:* "I'll do this later" — but track the skip rate

**Step 3: Create Your First Quote (5 minutes)**
- Pre-populated with the client they just added
- Walk through line items with example prices
- Show the live quote preview rendering
- One-click: "Send this quote" → triggers the Resend email flow
- *This is the activation moment.*

**Step 4: Invite Your Team (2 minutes)**
- Add up to 3 team members during onboarding (requires invitation system — COO plan)
- Skip for solo operators
- *Why here:* Multi-user is a retention driver; earlier is better

**Step 5: Personalise Your Dashboard (1 minute)**
- Choose which KPIs to show on the dashboard (sets expectation of reporting value)
- Enable email digest (daily or weekly)

**Post-onboarding:**
- Checklist visible in sidebar for 14 days post-signup: "Add 5 clients" / "Create your first job" / "Send your first quote"
- In-app tooltips on first visit to each major feature area
- 3-email welcome sequence (Day 0, Day 3, Day 7) with getting-started guidance

### 6.3 Enterprise Onboarding (Separate Flow)

For accounts joining via a sales-assisted motion (mid-market, enterprise), onboarding is different. They need:

- **Dedicated customer success onboarding call** (pre-scheduled from CRM)
- **Bulk data import** (clients, properties, jobs from CSV — CCO plan)
- **SSO configuration** (COO plan) with IT team involvement
- **RBAC setup** — creating roles and teams before users are added
- **Template configuration** — branded quote templates, service type catalogues
- **Training session** for admin and for field team (separate sessions)

Enterprise onboarding should be treated as a **project**, not a product flow.

---

## 7. Feature Prioritisation Framework

The COO and CCO proposals contain substantial feature lists. The risk — common in enterprise roadmap planning — is that we build everything on the list in sequence and deliver a mediocre version of many features rather than an excellent version of the few that matter most.

This framework governs how we decide what to build next.

### 7.1 The RICE Scoring Model

Every feature request or roadmap item must be scored before entering the development backlog.

| Dimension | Description | Scale |
|-----------|------------|-------|
| **Reach** | How many users or accounts are affected per month? | Number of users/accounts |
| **Impact** | How much does it move the needle on our primary metric? | 3 = massive, 2 = high, 1 = medium, 0.5 = low, 0.25 = minimal |
| **Confidence** | How confident are we in our Reach and Impact estimates? | 100% / 80% / 50% |
| **Effort** | How many person-weeks of engineering + design? | Weeks |

**RICE Score = (Reach × Impact × Confidence) / Effort**

Higher score = higher priority. This prevents loud stakeholders or shiny features from displacing high-value, low-effort work.

### 7.2 Feature Tiers

**Tier 0 — Table Stakes:** Features that must exist for us to be considered as a vendor at all. These are blockers, not priorities — they have to ship.
- User invitations (currently impossible to have a team)
- Stripe billing (currently zero revenue)
- MFA (enterprise IT mandate)
- GDPR data export (legal requirement)

**Tier 1 — Differentiated Value:** Features where we can be meaningfully better than alternatives. These are our product strategy bets.
- In-product analytics and reporting
- Mobile-first operative experience
- Quote experience (already a strength — extend it)
- Automation and workflow rules

**Tier 2 — Competitive Parity:** Features that alternatives have and that we must match to avoid disqualification. Ship them well but not elaborately.
- Custom fields
- Tags and segmentation
- CSV import/export
- REST API

**Tier 3 — Enterprise Premium:** Features that justify enterprise pricing and generate expansion revenue.
- Multi-branch / multi-location
- SSO / SAML
- Custom report builder
- Client portal

### 7.3 The "Nail It Then Scale It" Rule

No feature moves from Tier 0 or Tier 1 to general availability until it meets the following bar:
- 3 real customers have used it in a non-guided setting
- NPS score for the feature is ≥ 7/10 from those customers
- Error rate on the feature's server actions is < 0.1%
- Mobile and desktop experience have both been validated

Shipping features that work but are not good enough trains customers to have low expectations. We must resist the temptation to ship fast at the cost of shipping well.

---

## 8. Product-Led Growth Strategy

The CCO plan correctly identifies enterprise sales as the revenue growth driver. However, enterprise accounts must be earned — and the most effective enterprise sales motion is one where the product earns trust before the commercial conversation happens.

### 8.1 The Bottoms-Up Growth Motion

Target: Cleaning company owner signs up on free trial → activates by sending a quote → invites 2 team members → converts to Starter → expands to Professional as team grows → referred to as a case study by CS team → enterprise conversation initiated.

This motion depends on:
1. **Free trial that delivers real value** — Current 14-day trial period needs to be long enough to experience full value. Recommendation: extend to 30 days for Starter, 21 days for Professional.
2. **Viral loop via quote sharing** — Every public quote URL is a brand touchpoint. Add a subtle "Powered by Lustre" link at the bottom of public quote pages (with opt-out for Enterprise plan). Each accepted quote is a lead.
3. **Referral programme** — Within the product, prompt users to refer another business after their first successfully accepted quote. Reward: one month free per successful referral.
4. **G2 / Capterra reviews** — At the moment of quote acceptance, prompt the user: "You just won a job with Lustre — would you share what that means for your business?" Route to review platform.

### 8.2 The Self-Serve vs. Sales-Assisted Segmentation

| Signal | Motion | Owner |
|--------|--------|-------|
| Signup with company email, 1 user, no stated employee count | Self-serve | Product |
| Signs up, adds 3+ team members in first 7 days | Low-touch CS | Customer Success |
| Contacts sales page or requests demo | Sales-assisted | CCO / Sales |
| Enterprise domain SSO enquiry | Enterprise sales | CCO / Sales |
| Inbound from Google Ads for "cleaning company software" | Self-serve / nurture | Marketing |

### 8.3 Pricing Page and Conversion Optimisation

The pricing page does not exist yet. It must do significant work:
- Communicate value at each tier clearly and specifically (not generic feature lists)
- Make the Starter → Professional upgrade path obvious
- Show social proof (logos, testimonials, case studies) appropriate to each tier
- Include a clear ROI message: "Businesses using Lustre win 23% more quotes" (requires real data to back this)
- For Enterprise: "Talk to us" CTA with a 48-hour response commitment

---

## 9. Customer Feedback Infrastructure

We are building a product for a specific industry. The fastest way to build the right features is to stay in continuous conversation with users. This is a process, not a project.

### 9.1 Continuous NPS

**Deploy NPS 30 days after signup** for all accounts, then every 90 days for active accounts.

- Use a Typeform or in-product modal (not email — response rates are 4x higher in-product)
- Ask the follow-up question: "What is the one thing we could do to improve Lustre for you?"
- Segment NPS by plan tier, role, and activation status
- **Target:** NPS > 45 (good), > 60 (excellent) among activated users

### 9.2 Feature Feedback Loops

- **In-product feedback widget** (Canny or similar): Persistent button in the sidebar — "Suggest a Feature" → votes on existing requests visible to users → closes the loop when we ship
- **Session recording** (PostHog): Review recordings of users on new features weekly — no substitute for watching real usage
- **Monthly user interviews**: 4 per month, targeted — mix of activated churned users (exit interviews) and power users (expansion signals)
- **Churn survey**: When a subscription is cancelled, trigger a mandatory 1-question survey before cancellation completes: "What was the main reason you decided to leave?"

### 9.3 Beta Programme

Before any major feature ships to all users, it must go through a structured beta:
1. **Internal dogfooding** — product and CS team use the feature for 1 week
2. **Closed beta** — 5–10 self-selected customers (our most engaged users), 2-week minimum
3. **Open beta** — available to all users with a clear "beta" label, 2–4 weeks
4. **GA release** — announced via in-app notification and release email

Every beta participant must consent to a debrief call after the beta. This is the most efficient user research we can do.

---

## 10. Product Governance and Operating Model

### 10.1 The Product Development Cadence

**Two-week sprints.** No exceptions. Shorter cycles are appropriate for hotfixes; longer cycles breed scope creep.

**Sprint rhythm:**
- **Monday:** Sprint planning — stories sized and accepted into sprint
- **Wednesday:** Mid-sprint check-in — remove blockers, re-scope if needed
- **Friday:** Sprint demo — show working software to stakeholders (internal)
- **Monday of following week:** Retrospective (30 minutes), then next sprint planning

**Monthly product review:**
- Review RICE-scored backlog with CCO and COO
- Review product metrics dashboard
- Review NPS scores and qualitative feedback themes
- Adjust priorities for next month

**Quarterly roadmap update:**
- Full executive review of product strategy
- Reassess ICP assumptions based on actual customer data
- Update Horizon 1/2/3 allocations

### 10.2 Feature Flags

Every significant new feature must be built behind a feature flag. This is not optional.

**Why feature flags are non-negotiable for enterprise:**
- Enterprise buyers require controlled rollouts — they cannot accept unexpected UI changes without notice
- Feature flags enable gradual rollouts with automatic rollback if error rates spike
- Per-organisation overrides allow us to enable beta features for specific accounts
- Plan-based feature gating becomes trivial to implement and modify

**Recommended tooling:** PostHog Feature Flags (consistent with the analytics platform recommendation — one SDK, one data layer).

### 10.3 The Definition of Done

A feature is not done when code is merged. A feature is done when:
- [ ] Code is reviewed, merged, and deployed to production
- [ ] Feature flag is enabled for internal users
- [ ] Analytics events are firing correctly (verified in PostHog)
- [ ] Mobile and desktop tested manually
- [ ] Error rate monitored for 48 hours post-deployment
- [ ] Release note written and added to in-app changelog
- [ ] CS team briefed with a one-page feature guide
- [ ] Help centre article published (if user-facing)

### 10.4 Documentation as a Product Responsibility

Product documentation is not a post-launch task. It is a feature component.

**Required documentation types:**
- **In-app changelog:** Visible from the sidebar, updated every release — "What's new in Lustre"
- **Help centre:** Minimum 8 articles at launch (COO plan), growing to 50+ over 12 months
- **API documentation:** Public, versioned, with code examples (required for Enterprise tier)
- **Integration guides:** Step-by-step for each supported integration (Xero, Google Calendar, etc.)
- **Release notes email:** Monthly digest of significant changes, sent to admins

---

## 11. Accessibility and Inclusivity

Enterprise procurement processes increasingly require WCAG 2.1 AA compliance. This is not a cosmetic requirement — it is a commercial gate for public sector and mid-market UK contracts.

**Current state:** Unknown. No accessibility audit has been performed.

**Required actions:**

**Phase 1 (Next 90 days):**
- Commission an accessibility audit of the current UI
- Fix all WCAG 2.1 Level A violations (critical — these affect users who rely on assistive technology)
- Add `aria-label` attributes to all icon-only buttons (current implementation has none)
- Ensure all form inputs have explicit `<label>` associations
- Keyboard navigation audit — every action must be accessible without a mouse

**Phase 2 (Months 3–6):**
- Fix all WCAG 2.1 Level AA violations
- Automated accessibility testing in CI/CD pipeline (axe-core or Playwright + axe)
- Screen reader testing on VoiceOver (macOS) and NVDA (Windows)
- Colour contrast compliance across all UI states

**Phase 3 (Months 6–12):**
- Publish accessibility statement on website
- Annual third-party accessibility audit
- VPAT (Voluntary Product Accessibility Template) for US enterprise customers

---

## 12. Internationalisation and Localisation

Lustre is currently UK-focused (GBP, VAT, UK address format). This is appropriate for the current ICP but will become a constraint if we pursue European expansion or if UK-based franchise businesses operate internationally.

**Phase 1 — UK hardening:**
- Currency: GBP only (appropriate for now)
- Tax: VAT-aware (✓ already implemented)
- Date format: DD/MM/YYYY consistently across all views
- Phone format: UK (+44) validation in forms
- Address format: UK standard (line 1, line 2, town, county, postcode)

**Phase 2 — i18n scaffolding (Months 6–12):**
- Extract all UI strings into a translation layer (next-intl or i18next)
- Currency configured at organisation level (£, €, $)
- Tax rate configurable at organisation level (VAT, GST, Sales Tax)
- Date and number format respects browser locale

**Phase 3 — Localised markets (Horizon 3):**
- Irish market (€, Irish address format, Eircode)
- Australian market (AUD, GST, Australian address format)
- Full translation: Irish English, Australian English (minimal delta — primarily tax/currency terminology)

---

## 13. CPO Metrics Dashboard

The product organisation should be measured on outcomes, not output. The following metrics constitute the CPO reporting dashboard, reviewed monthly.

### 13.1 Growth Metrics

| Metric | Definition | Target (Month 6) | Target (Month 12) |
|--------|-----------|-----------------|-----------------|
| New signups | New accounts created | Baseline | 3× baseline |
| Trial-to-paid conversion | % of trials that convert | 15% | 25% |
| Activation rate | % reaching activation within 7 days | 30% | 45% |
| Time to activation | Median days from signup to first quote sent | < 3 days | < 1 day |

### 13.2 Engagement Metrics

| Metric | Definition | Target (Month 6) | Target (Month 12) |
|--------|-----------|-----------------|-----------------|
| DAU/MAU ratio | Daily / Monthly active users | 25% | 40% |
| Feature adoption rate | % of accounts using each major feature | Tracked per feature | |
| Mobile session % | % of sessions on mobile viewport | Tracked | > 30% |
| Search usage | % of sessions with at least one search | Tracked | > 50% |

### 13.3 Quality Metrics

| Metric | Definition | Target |
|--------|-----------|--------|
| NPS | Net Promoter Score (activated users) | > 45 |
| CSAT | Post-support satisfaction | > 4.2 / 5 |
| Feature error rate | Server action errors per feature | < 0.1% |
| Onboarding completion | % who finish all steps | > 70% |
| P1 bug resolution time | Time from report to fix | < 24 hours |

### 13.4 Retention Metrics

| Metric | Definition | Target (Month 12) |
|--------|-----------|-----------------|
| Monthly churn rate | Accounts cancelled / start-of-month total | < 3% |
| Net Revenue Retention | (MRR end - churn + expansion) / MRR start | > 110% |
| 90-day retention | % of activated accounts still active at Day 90 | > 65% |
| Enterprise logo retention | Enterprise accounts retained (annual) | > 90% |

---

## 14. Phase Roadmap Summary (CPO Perspective)

This is not a feature list — it is a sequencing of product bets. It should be read alongside the COO and CCO phase roadmaps.

### Phase 1: Foundation (Months 1–3) — "Earn the Right to Sell"

**Product priorities:**
1. **Product analytics instrumentation** — PostHog deployed, Day 1 events firing, activation metric defined
2. **Onboarding redesign** — Activation-focused flow, real value demonstrated before configuration complete
3. **Global search** — Cmd+K search palette across clients, jobs, quotes, properties
4. **Mobile optimisation** — "My Jobs Today" operative view, PWA configuration
5. **In-product reporting v1** — Executive summary dashboard, quote pipeline funnel, revenue booked KPI
6. **Notification centre** — In-app notifications for quote events and follow-up reminders
7. **Empty states and onboarding tooltips** — Every list view has a considered empty state
8. **Feature flag infrastructure** — PostHog flags, plan-based gating framework

**KPI targets at end of Phase 1:**
- Activation rate > 25%
- NPS measurement baseline established
- Mobile sessions tracked
- 0% of features shipped without analytics instrumentation

### Phase 2: Scale (Months 4–8) — "Win Enterprise Trials"

**Product priorities:**
1. **Role-appropriate UI** — Adaptive experience for admin / manager / operative roles
2. **In-product reporting v2** — Operations summary, commercial summary, CSV export, scheduled email reports
3. **Custom dashboard** — Drag-and-drop KPI widgets per user preference
4. **PWA launch** — Push notifications, offline job viewing, home screen install prompt
5. **Beta programme launch** — Formal process for closed beta of new features
6. **Accessibility v1** — WCAG 2.1 Level A compliance, keyboard navigation
7. **In-app changelog** — "What's new" visible from sidebar
8. **Help centre v1** — 30 articles covering core features
9. **Feature feedback widget** — Canny integration, user voting on roadmap items

**KPI targets at end of Phase 2:**
- Activation rate > 40%
- NPS > 45
- Mobile DAU > 20% of total DAU
- Feature adoption tracked for all major features

### Phase 3: Enterprise (Months 9–12) — "Close and Retain Enterprise Accounts"

**Product priorities:**
1. **Multi-branch reporting** — Rollup analytics across locations; branch vs. branch comparison
2. **Custom report builder** — Drag-and-drop report creation with saved report templates
3. **Accessibility v2** — WCAG 2.1 Level AA, VPAT published
4. **i18n scaffolding** — Translation layer, currency and tax configuration
5. **In-product NPS** — Automated NPS survey at Day 30 and quarterly
6. **Enterprise onboarding playbook** — Templated CS process for enterprise account setup
7. **API documentation portal** — Public, versioned, with interactive playground
8. **In-app product tour library** — Interactive walkthroughs for new features (Shepherd.js or Intro.js)

**KPI targets at end of Phase 3:**
- NPS > 55
- Enterprise logo retention > 90%
- 90-day retention > 65%
- Help centre deflects > 40% of support queries (measured via CS ticket volume)

---

## 15. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Build features without measuring adoption | High | High | Phase 1 analytics instrumentation is non-negotiable — block all Phase 2 features until PostHog is live |
| Mobile ignored, operative churn is high | High | High | Mobile metrics tracked from Day 1; PWA in Phase 2 is hard deadline |
| Onboarding unchanged, activation stays low | Medium | High | Redesign is Phase 1 priority; activation rate reviewed weekly |
| Enterprise buyers disqualify on accessibility | Medium | High | Phase 2 WCAG AA compliance; audit commissioned in Phase 1 |
| Analytics data polluted by internal users | Medium | Medium | Internal user IDs flagged in PostHog; excluded from metrics |
| Design inconsistency as product scales | High | Medium | Design system formalised in Phase 1; Storybook maintained |
| Feature flags not used, rollbacks disruptive | Medium | High | Feature flag usage enforced in Definition of Done |
| NPS never measured, churn reasons unknown | High | High | NPS survey in production by end of Phase 1 |

---

## 16. Conclusion and Recommendations

Lustre has the technical foundations to become an enterprise-grade product. What it currently lacks is the product infrastructure — the measurement, the design system, the feedback loops, and the deliberate user experience — that allows us to improve the product with evidence rather than intuition.

The COO plan correctly identifies operational gaps. The CCO plan correctly identifies commercial feature gaps. This CPO plan identifies the gap between them: we can build all the right features and still fail if we do not know whether users are engaging with them, if the experience does not meet the expectations of enterprise buyers, or if we have no mechanism to learn from our mistakes.

**My top four recommendations for the next 90 days:**

1. **Ship product analytics first.** Before any new feature is built, PostHog must be deployed and the core event taxonomy must be instrumented. We will not make good product decisions without data.

2. **Redesign onboarding around activation.** The single metric we should optimise in the next quarter is the percentage of new users who send a real quote within their first 7 days. Every change to onboarding should be evaluated against this.

3. **Commit to mobile-first for operatives.** The field team is the product's second user base, and they are entirely mobile. A product that does not work well on a phone will be uninstalled — and the admin will follow.

4. **Establish the product operating model now.** Feature flags, Definition of Done, RICE scoring, beta programme — these processes are difficult to retrofit onto a mature product. Establish them while the product is still small.

The ambition to reach enterprise readiness within 12 months is achievable. But it requires treating product development as a discipline — not just a set of features to ship, but a system of continuous learning, deliberate experience design, and rigorous measurement.

---

## Appendix A — Recommended Product Tooling Stack

| Function | Tool | Rationale |
|----------|------|-----------|
| Product analytics | PostHog | Open source, GDPR-compliant, combines events + session recording + feature flags |
| Feature flags | PostHog Feature Flags | Unified with analytics — same SDK, same identity |
| User feedback / roadmap | Canny | Best-in-class for public roadmap + feature voting |
| NPS / surveys | Typeform embedded | High response rate, clean UI, GDPR-compliant |
| Design system documentation | Storybook | Industry standard for component documentation |
| Accessibility testing | axe-core (CI) + manual | axe-core automated; VoiceOver/NVDA for manual |
| Session recording | PostHog | Included in PostHog — no additional tool required |
| Help centre | Intercom Articles | Integrates with support (consistent with COO recommendation) |
| In-app tours | Shepherd.js | Open source, lightweight, no vendor lock-in |
| PWA tooling | next-pwa | Next.js native, well-maintained |
| i18n | next-intl | Best-in-class for Next.js App Router |

---

## Appendix B — Quick Reference: CPO vs. COO vs. CCO Responsibilities

| Area | CPO (This Document) | COO (OPS-ENT-001) | CCO (CRM-ENT-001) |
|------|--------------------|--------------------|-------------------|
| What features exist | Define scope + experience | Define operational requirements | Define commercial requirements |
| How features are built | Process, DoD, feature flags | CI/CD, testing, observability | Feature specifications |
| Who uses them | ICP, personas, role UX | SLA commitments per plan | Enterprise buyer personas |
| Are they working | Product analytics, NPS | Error rates, uptime | Revenue metrics, win rates |
| Reporting | In-product analytics for users | Internal ops dashboard | CRM sales reporting |
| Mobile | PWA strategy, operative UX | API reliability for mobile | Mobile CRM features |
| Pricing | Feature gating per plan | SLA per plan | Pricing tier definition |

---

*This document should be reviewed alongside CRM-ENT-001 (CCO), OPS-ENT-001 (COO), and CFO-ENT-001 (CFO). All four proposals together constitute the complete enterprise readiness strategy.*

*Next review: April 2026*
*Owner: Chief Product Officer*
