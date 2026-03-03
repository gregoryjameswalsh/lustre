# CRM Enterprise Readiness Proposal
**Document Type:** Business Analysis Proposal
**Author:** Chief Commercial Officer
**Date:** March 2026
**Status:** Draft for Review
**Ref:** CRM-ENT-001

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Assessment](#2-current-state-assessment)
3. [Target Market & Enterprise Requirements](#3-target-market--enterprise-requirements)
4. [Gap Analysis](#4-gap-analysis)
5. [Proposed Enhancements — MoSCoW Prioritisation](#5-proposed-enhancements--moscow-prioritisation)
6. [Technical Architecture Considerations](#6-technical-architecture-considerations)
7. [Phased Delivery Roadmap](#7-phased-delivery-roadmap)
8. [Commercial & Pricing Strategy](#8-commercial--pricing-strategy)
9. [Risks & Mitigations](#9-risks--mitigations)
10. [Success Metrics & KPIs](#10-success-metrics--kpis)
11. [Recommended Next Steps](#11-recommended-next-steps)

---

## 1. Executive Summary

Lustre is a purpose-built field service CRM for cleaning and property maintenance businesses. The current product provides a solid operational foundation: client management, job scheduling, quote generation, and a client interaction timeline. It is well-architected with multi-tenancy, row-level security, and audit logging already in place.

However, the product as it stands targets small owner-operated businesses. To compete for enterprise accounts — multi-branch operators, franchise networks, or large FM (facilities management) companies — the CRM must be significantly elevated across five dimensions:

| Dimension | Current Maturity | Enterprise Requirement |
|-----------|-----------------|----------------------|
| Sales Pipeline | Absent | Full deal-stage pipeline with forecasting |
| Contact Intelligence | Basic | Segmentation, tagging, deduplication, GDPR tooling |
| Automation | Absent | Workflow engine, triggers, sequences |
| Reporting & Analytics | Minimal | Custom reports, revenue forecasting, team KPIs |
| Integrations & API | None | Public REST API, webhooks, accounting & calendar sync |
| Compliance & Security | Foundational | SSO, MFA, GDPR tooling, data residency controls |
| Commercial Management | Partial | Contracts, recurring agreements, direct invoicing |
| Organisational Structure | Single-org | Multi-branch hierarchy, RBAC, territory management |

This proposal outlines a structured approach to close these gaps, prioritised by commercial impact, and organised into three delivery phases over approximately 12 months.

---

## 2. Current State Assessment

### 2.1 What Exists Today

The current CRM is built on a robust technical foundation:

- **Framework:** Next.js 16 (App Router) with React 19, TypeScript
- **Database:** Supabase (PostgreSQL) with Row-Level Security on all tables
- **Auth:** Supabase Auth with middleware-enforced session gates
- **Payments:** Stripe integration for subscription management
- **Plans:** Free, Starter, Pro

**Core CRM Entities:**

| Entity | Key Attributes | Current Capability |
|--------|---------------|-------------------|
| `Client` | name, email, phone, status (active/inactive/lead), source, notes | CRUD, status filter |
| `Property` | address, type, bedrooms, access instructions, pets | Linked to client, CRUD |
| `Job` | service type, status, date/time, assignee, price, duration | Scheduling, status workflow |
| `Quote` | line items, fixed/itemised pricing, VAT, valid_until, shareable token | Full lifecycle, PDF export |
| `Activity` | 13 activity types, pinnable, linked to jobs | Timeline view, follow-up creation |
| `Follow-up` | priority, due date, assignee, status | Open/done/dismissed workflow |
| `Organisation` | name, address, VAT, plan, subscription status | Multi-tenant |
| `Profile` | role (admin/team_member), avatar | Two roles only |

**Security Strengths:**
- Row-Level Security on every table — strong multi-tenant data isolation
- Append-only audit log for destructive operations
- CSP, X-Frame-Options, and other security headers in place
- Admin-only gates on delete operations

### 2.2 What the Product Does Well

- Clean, focused UX suited to field service workflows
- Strong data model foundations that are extensible
- Public quote sharing with view tracking — a genuine differentiator
- Activity timeline is well-conceived; it captures the right interaction types
- Onboarding wizard lowers time-to-value for new users

### 2.3 The Core Problem

The product currently conflates CRM (relationship management and sales) with Operations (job scheduling and delivery). While this integration is valuable, it means neither function is enterprise-grade. There is no sales pipeline, no automation, no reporting beyond basic counts, no integrations, and no mechanism for enterprise organisational complexity (branches, territories, delegated admin).

To win enterprise deals, we must be able to answer "yes" to the questions procurement teams and IT departments ask — and right now we cannot.

---

## 3. Target Market & Enterprise Requirements

### 3.1 Enterprise Persona Profiles

**Persona A: Regional Cleaning Franchise (50–500 staff)**
- Multiple branches, each with their own client book
- Franchisor needs consolidated reporting; franchisees need autonomy
- Needs: Multi-branch hierarchy, consolidated reporting, RBAC

**Persona B: Facilities Management Company**
- Complex B2B accounts with multiple sites and contacts
- Long sales cycles, formal quote/contract processes
- Needs: Account hierarchy, contract management, CRM-to-finance integration, SLA tracking

**Persona C: Premium Residential Operator (10–50 staff)**
- High-value recurring clients, relationship-led business
- Marketing comms and client retention are critical
- Needs: Automated follow-up sequences, segmentation, NPS tracking, client portal

**Persona D: Enterprise Property Group (internal team)**
- Large volume of recurring maintenance jobs
- Staff scheduling across multiple properties
- Needs: API access, calendar/FM system integration, advanced reporting, SSO

### 3.2 Common Enterprise Buying Criteria

1. **Data Security & Compliance** — SOC 2, GDPR, SSO, MFA, data residency
2. **Configurability** — Custom fields, custom workflows, tailored reports
3. **Integration** — Connects to their existing accounting, HRIS, calendar, communication stack
4. **Scalability** — Handles 10,000+ contacts, high job volumes, large team sizes
5. **Support & SLA** — Dedicated account manager, uptime guarantees, onboarding support
6. **Audit & Governance** — Complete audit trails, role-based access, approvals workflows

---

## 4. Gap Analysis

### 4.1 Sales & Pipeline Management — CRITICAL GAP

**Current:** Clients have a status of `active`, `inactive`, or `lead`. There is no pipeline, no deal stages, no conversion tracking, no revenue forecasting.

**Enterprise need:** A visual sales pipeline showing leads at each stage, conversion rates, average deal size, expected close dates, and pipeline value. Sales managers need to forecast revenue and identify stalled deals.

**Impact:** Without a pipeline, Lustre cannot be positioned as a sales tool. Enterprise sales teams will not adopt a CRM that cannot show them their funnel.

---

### 4.2 Contact & Account Intelligence — HIGH GAP

**Current:** Client entity is flat — a single individual with contact details and a status. No company/account concept. No custom fields. No tagging. No deduplication. No bulk import.

**Enterprise need:**
- B2B account hierarchy: Company → Site(s) → Contact(s)
- Custom fields configurable per org
- Tags and segments for targeted comms
- Deduplication detection on create/import
- Bulk CSV import with field mapping
- GDPR tools: consent capture, data subject access request (DSAR) export, right-to-erasure workflow

---

### 4.3 Workflow Automation — CRITICAL GAP

**Current:** Zero automation. Everything is manual. Follow-ups must be created individually. No triggers, no sequences, no scheduled actions.

**Enterprise need:**
- Rule-based automation: "When a quote is sent, create a follow-up in 3 days if no response"
- Automated email sequences for lead nurturing
- Job completion triggers: "When job is marked complete, send review request email"
- SLA breach alerts: "If open follow-up is overdue by 48 hours, notify manager"

---

### 4.4 Reporting & Analytics — HIGH GAP

**Current:** Dashboard shows three count cards (clients, upcoming jobs, total jobs), a recent clients widget, upcoming jobs list, and open follow-ups. No charts, no trends, no financial reporting.

**Enterprise need:**
- Revenue dashboard: MRR, ARR, job value by period, average job value
- Sales analytics: pipeline value, conversion rates by source/stage, quote win rate
- Operations analytics: job completion rates, cancellations, staff utilisation
- Client analytics: client lifetime value, churn rate, retention cohorts
- Custom report builder with export to CSV/Excel
- Scheduled report delivery via email

---

### 4.5 Communication & Integration — HIGH GAP

**Current:** Email via Resend for transactional messages (quotes). No inbound email sync, no SMS, no calendar integration, no webhooks, no public API.

**Enterprise need:**
- Two-way email sync (Gmail/Outlook) — emails logged to client timeline automatically
- SMS notifications and two-way SMS
- Calendar integration (Google Calendar, Outlook) for job scheduling
- Public REST API for custom integrations
- Webhooks for real-time event notifications
- Native integrations: Xero, QuickBooks, Slack, WhatsApp Business

---

### 4.6 Commercial & Contract Management — MEDIUM GAP

**Current:** Quotes support fixed or line-item pricing, with VAT. Quote lifecycle ends at accepted/declined. No contracts, no recurring billing, no direct payment collection, no deposit management.

**Enterprise need:**
- Contract generation from accepted quotes
- Recurring service agreements with automated renewal
- Direct payment collection (Stripe payment links on quotes/invoices)
- Deposit and staged payment management
- Invoice generation linked to completed jobs
- Price book / service catalogue with tiered pricing

---

### 4.7 Team & Organisational Structure — HIGH GAP

**Current:** Two roles (admin, team_member). One organisation per subscription. No territory management, no branch hierarchy.

**Enterprise need:**
- Role-Based Access Control (RBAC): custom roles with granular permission sets
- Multi-branch / multi-location support with consolidated reporting
- Territory management: assign staff and clients to geographic zones
- Team performance targets and KPI tracking
- Manager approval workflows (e.g., quote approval before sending)
- Delegation and out-of-office coverage

---

### 4.8 Security & Compliance — MEDIUM GAP (strong foundations exist)

**Current:** RLS, audit log, security headers, Supabase Auth. No SSO, no MFA enforcement, no IP allowlisting, no GDPR tooling, no data export tools.

**Enterprise need:**
- SAML 2.0 / OIDC SSO (Okta, Azure AD, Google Workspace)
- Enforced MFA at organisation level
- IP allowlisting / allowlist management
- GDPR-compliant data export and erasure workflow
- Data residency options (EU hosting)
- SOC 2 Type II readiness
- Session management (force logout, session timeout policy)
- Enhanced audit log coverage (all reads of sensitive data, login events)

---

### 4.9 Client-Facing Portal — MEDIUM GAP

**Current:** Public quote viewing via token URL. No self-service, no document history, no booking.

**Enterprise need:**
- Client portal: view quotes, approve jobs, access invoices, raise requests
- Online booking widget (embeddable on client's website)
- Two-way document sharing
- Client satisfaction / NPS capture

---

## 5. Proposed Enhancements — MoSCoW Prioritisation

### 5.1 Must Have (Phase 1 — Enterprise Threshold)

These are blockers for any enterprise deal. Without them, we cannot credibly sell to enterprise.

| ID | Feature | Rationale |
|----|---------|-----------|
| M01 | **Sales Pipeline (Kanban + List)** | Core CRM function; critical for sales teams |
| M02 | **Custom Fields** | Every enterprise org has unique data; required for adoption |
| M03 | **Tags & Segmentation** | Needed for list management, targeted comms, filtering |
| M04 | **Advanced Filtering & Saved Views** | Enterprise users manage thousands of records |
| M05 | **Bulk Import (CSV) with field mapping** | Data migration is step one of any implementation |
| M06 | **Role-Based Access Control (RBAC)** | Enterprise IT will not accept only 2 roles |
| M07 | **SSO (SAML 2.0 / OIDC)** | Enterprise IT mandate; deal-blocker without it |
| M08 | **MFA Enforcement at Org Level** | Security requirement for enterprise procurement |
| M09 | **GDPR Tooling (consent, DSAR, erasure)** | Legal requirement for UK/EU enterprise clients |
| M10 | **Revenue & Sales Analytics Dashboard** | Procurement and leadership need financial insight |
| M11 | **Enhanced Audit Log (reads + logins)** | Compliance and governance requirement |
| M12 | **Workflow Automation — Basic Rules Engine** | Time-saving at scale; differentiates from basic tools |

---

### 5.2 Should Have (Phase 2 — Enterprise Competitive)

These make the product competitive against Salesforce, HubSpot, and ServiceTitan at the enterprise tier.

| ID | Feature | Rationale |
|----|---------|-----------|
| S01 | **Account/Company Hierarchy (B2B)** | Required for FM and B2B enterprise accounts |
| S02 | **Multi-Branch / Multi-Location Support** | Franchise and regional operators |
| S03 | **Contract Management** | Link accepted quotes to formal contracts |
| S04 | **Recurring Service Agreements** | Core commercial model for cleaning businesses |
| S05 | **Direct Invoice + Payment Collection** | Stripe-powered; closes the billing loop |
| S06 | **Email Sync (Gmail / Outlook)** | Auto-log inbound/outbound emails to timeline |
| S07 | **Calendar Integration** | Bi-directional sync for job scheduling |
| S08 | **Public REST API + Webhooks** | Enables custom integrations and enterprise IT connectivity |
| S09 | **Custom Report Builder** | Self-service analytics; reduces support burden |
| S10 | **Automated Email Sequences** | Lead nurture and client retention automation |
| S11 | **Manager Approval Workflows** | Governance for quotes and high-value actions |
| S12 | **Territory Management** | Regional operators need geographic client assignment |
| S13 | **Duplicate Detection & Merge** | Data quality at scale |

---

### 5.3 Could Have (Phase 3 — Enterprise Premium)

Differentiating features that justify premium pricing and deepen retention.

| ID | Feature | Rationale |
|----|---------|-----------|
| C01 | **Client Self-Service Portal** | Reduces admin overhead; improves client experience |
| C02 | **Online Booking Widget** | Revenue-generating for client's customers |
| C03 | **SMS Two-Way Communication** | High engagement channel, especially for reminders |
| C04 | **WhatsApp Business Integration** | Increasingly expected in UK service businesses |
| C05 | **Xero / QuickBooks Native Integration** | Accounting sync eliminates manual data entry |
| C06 | **NPS / Satisfaction Surveys** | Client retention intelligence |
| C07 | **Price Book / Service Catalogue** | Standardises pricing across large teams |
| C08 | **Staff Commission & Performance Tracking** | Motivates field teams; manager visibility |
| C09 | **Data Residency (EU/UK options)** | Regulated industries; some enterprise mandates |
| C10 | **SOC 2 Type II Certification** | Security-conscious enterprise procurement |
| C11 | **Zapier / Make Native Integration** | Opens integration ecosystem without full API effort |
| C12 | **Slack Integration** | Internal notifications for deal events and job updates |

---

### 5.4 Won't Have (This Cycle)

These are either out of scope, too speculative, or better addressed by third-party tools.

| ID | Feature | Reason |
|----|---------|--------|
| W01 | Full ERP integration | Scope; better via open API |
| W02 | Built-in telephony (VoIP) | Third-party specialist space |
| W03 | AI-powered lead scoring | Requires data maturity first |
| W04 | Mobile native app (iOS/Android) | PWA sufficient for Phase 1–2 |
| W05 | Franchise billing management | Niche; addressable in Phase 3+ |

---

## 6. Technical Architecture Considerations

### 6.1 Database Schema Extensions

**New tables required:**

| Table | Purpose |
|-------|---------|
| `pipeline_stages` | Configurable sales stages per org |
| `deals` | Sales opportunities linked to clients/accounts |
| `accounts` | B2B company entities (parent of contacts) |
| `custom_fields` | Field definitions per entity type per org |
| `custom_field_values` | EAV values for custom field data |
| `tags` | Tag definitions per org |
| `entity_tags` | Polymorphic tag assignments |
| `segments` | Saved filter definitions |
| `contracts` | Service agreements linked to quotes |
| `recurring_schedules` | Recurring job/service templates |
| `invoices` | Invoice records linked to jobs |
| `invoice_line_items` | Itemised invoice lines |
| `automation_rules` | Trigger-action rule definitions |
| `automation_executions` | Execution log for audit/debug |
| `email_sync_accounts` | OAuth tokens for Gmail/Outlook |
| `synced_emails` | Inbound/outbound email records |
| `roles` | Custom role definitions |
| `role_permissions` | Permission assignments per role |
| `branches` | Sub-organisational units |
| `territories` | Geographic zone definitions |
| `gdpr_requests` | DSAR and erasure request tracking |
| `consent_records` | Marketing consent per contact |
| `api_keys` | Public API authentication |
| `webhook_endpoints` | Registered webhook URLs |
| `webhook_deliveries` | Delivery log for reliability |
| `report_definitions` | Saved custom report configurations |

### 6.2 Key Architectural Decisions

**Custom Fields Strategy:**
Recommend Entity-Attribute-Value (EAV) pattern using `custom_fields` + `custom_field_values` tables rather than JSONB columns. EAV allows indexing and RLS on individual field values, which matters for filtering at scale. JSONB is faster to implement but limits queryability.

**Automation Engine:**
Phase 1 automation should be rule-based (trigger + conditions + actions), not code-based. Build a `workflow_engine` service layer that evaluates rules asynchronously (via Supabase Edge Functions or a queue). Start with 5–10 trigger types and 5–10 action types. Avoid building a visual flow builder in Phase 1 — a simple rules UI is sufficient.

**Multi-Branch Architecture:**
Extend the existing `organisation_id` pattern. Add `branch_id` as an optional foreign key on key tables (`clients`, `jobs`, `quotes`). Branch admins have a scoped view; org admins see all. Avoid a full org-within-org hierarchy in Phase 1 — it adds significant complexity. A flat branch model is sufficient for most franchise use cases.

**Public API:**
Design as a versioned REST API (`/api/v1/...`) with API key authentication. Rate-limit per key. Document with OpenAPI 3.0 (Swagger). Start with read endpoints for core entities before adding write endpoints. Webhooks complement the API for push-based integrations.

**SSO Implementation:**
Supabase Auth supports PKCE flows. For SAML, use a middleware provider (WorkOS or Auth0 as an enterprise auth layer) rather than building SAML parsing from scratch. WorkOS in particular offers a managed enterprise SSO product that slots cleanly in front of Supabase.

**RBAC:**
Replace the binary `admin | team_member` model with a `roles` table linked to a `permissions` enum. Apply permissions checks in server actions and API routes. Keep RLS for data isolation; RBAC governs UI access and action authorisation. The two layers are complementary.

### 6.3 Performance Considerations

At enterprise scale (10,000+ contacts, 100,000+ activities):
- Add database indices on `organisation_id`, `client_id`, `status`, and `created_at` for all primary tables
- Implement cursor-based pagination on all list queries (replace simple offset pagination)
- Consider read replicas for reporting queries to avoid contention with operational writes
- Introduce a caching layer (Redis via Upstash, already in stack) for dashboard aggregations
- Audit log queries must be paginated and indexed by `organisation_id` + `created_at`

---

## 7. Phased Delivery Roadmap

### Phase 1 — Enterprise Threshold (Months 1–4)

**Goal:** Achieve the minimum bar to close enterprise pilot deals. Focus on the features procurement teams gate on.

**Deliverables:**
- M01: Sales Pipeline — stages, deal cards, drag-and-drop kanban, list view
- M02: Custom Fields — text, number, date, dropdown types; configurable per org per entity
- M03–M04: Tags, Segmentation, and Advanced Filtering with saved views
- M05: CSV Bulk Import with field mapping and error reporting
- M06: RBAC — custom role builder with granular permission matrix
- M07–M08: SSO (via WorkOS) and org-level MFA enforcement
- M09: GDPR Tooling — consent capture, DSAR export, erasure request workflow
- M10: Revenue & Sales Analytics — pipeline value, win rate, job revenue by period
- M11: Enhanced Audit Log — login events, sensitive data reads
- M12: Basic Automation Rules Engine — 5 triggers, 5 actions, simple rule UI

**Success Criteria:**
- Successfully close 3 enterprise pilot accounts
- Pass initial security questionnaire review from an enterprise prospect
- Feature parity with mid-market competitors on core CRM functions

---

### Phase 2 — Enterprise Competitive (Months 5–8)

**Goal:** Deepen value for enterprise accounts and build integration ecosystem.

**Deliverables:**
- S01: Account/Company hierarchy for B2B clients
- S02: Multi-branch support with consolidated cross-branch reporting
- S03–S04: Contract management and recurring service agreements
- S05: Invoice generation and Stripe payment collection
- S06–S07: Email sync (Gmail/Outlook OAuth) and Google Calendar / Outlook sync
- S08: Public REST API v1 with OpenAPI docs and webhook engine
- S09: Custom Report Builder — drag-and-drop report canvas with CSV/Excel export
- S10: Automated email sequences for lead nurture and post-job comms
- S11: Manager approval workflows for quotes and high-value actions
- S12–S13: Territory management and duplicate detection/merge

**Success Criteria:**
- At least one enterprise customer actively using API/webhooks for integration
- 80%+ of Phase 1 pilot accounts convert to full enterprise contract
- Net Revenue Retention > 110% for enterprise tier

---

### Phase 3 — Enterprise Premium (Months 9–12)

**Goal:** Build stickiness, deepen integrations, and position for upmarket expansion.

**Deliverables:**
- C01: Client self-service portal
- C02: Online booking widget
- C03–C04: SMS and WhatsApp Business integration
- C05: Xero / QuickBooks native integration
- C06: NPS / satisfaction survey engine
- C07: Price book and service catalogue
- C10: SOC 2 Type II audit readiness programme
- C11–C12: Zapier and Slack integrations

**Success Criteria:**
- 5+ enterprise accounts with 100+ users
- SOC 2 Type II report issued
- NRR > 120% for enterprise tier
- Qualified pipeline of £1M+ ARR from enterprise segment

---

## 8. Commercial & Pricing Strategy

### 8.1 Recommended Tier Structure

| Tier | Target | Price Point | Key Features |
|------|--------|-------------|-------------|
| **Starter** | Sole traders, 1–3 staff | £49/mo | Current core features |
| **Professional** | Growing businesses, 4–20 staff | £149/mo | + Custom fields, tags, basic automation, advanced filters |
| **Business** | Established operators, 20–100 staff | £399/mo | + Multi-user RBAC, API access, email sync, custom reports |
| **Enterprise** | 100+ staff, franchise/FM | Custom / £1,500+/mo | + SSO, multi-branch, contracts, dedicated support, SLA |

*All prices per organisation per month. User add-ons could apply above a base seat count.*

### 8.2 Enterprise Pricing Principles

- **Negotiated annual contracts** — Enterprise accounts should be on 12-month minimums with volume discounts
- **Implementation fee** — £2,000–£10,000 depending on complexity; covers data migration, configuration, training
- **Success-based expansion** — Price per active user or per branch above base to capture growth revenue
- **Avoid per-seat pricing as the only metric** — Field service businesses have large teams; per-seat can feel punitive. Consider per-branch or usage-based elements.

### 8.3 Packaging Decisions for Phase 1

- **SSO** should be Enterprise-only (common practice; high perceived value to enterprise buyers)
- **API access** should be available from Business tier upward
- **Custom fields** should be available from Professional tier (needed to drive upgrade)
- **Automation rules** — limit rule count on lower tiers; unlimited on Enterprise

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Engineering capacity insufficient for Phase 1 scope | High | High | Prioritise M01–M06 as MVP; defer M07–M12 to Phase 1b. Consider dedicated enterprise squad. |
| SSO integration complexity (SAML edge cases) | Medium | High | Use WorkOS or Auth0 as a managed SSO layer; do not build from scratch |
| GDPR tooling scope creep | Medium | Medium | Define a minimal GDPR UI (consent flag + export button + erasure request) for Phase 1; full DSAR portal in Phase 2 |
| Database performance at scale | Medium | High | Introduce performance testing early; define load targets and instrument queries before Phase 2 ships |
| Existing customers disrupted by RBAC changes | Low | High | Current admin/team_member roles map to new RBAC defaults; migration must be transparent and backwards-compatible |
| Competitor launches similar enterprise tier | Medium | Medium | Speed to market matters; Phase 1 must ship within 4 months |
| Enterprise pilot fails to convert | Medium | High | Define success criteria for pilots upfront; assign dedicated CSM to each pilot account |
| Custom fields data model causes query complexity | Medium | Medium | Invest in proper indexing and a query abstraction layer early; evaluate JSONB vs EAV tradeoffs in technical design |

---

## 10. Success Metrics & KPIs

### Commercial KPIs

| Metric | Phase 1 Target | Phase 2 Target | Phase 3 Target |
|--------|---------------|---------------|---------------|
| Enterprise accounts (paying) | 3 | 15 | 40 |
| Enterprise ARR | £50K | £250K | £750K |
| Enterprise NRR | - | >110% | >120% |
| ACV per enterprise account | £15K | £17K | £20K |
| Enterprise sales cycle | - | <60 days | <45 days |

### Product KPIs

| Metric | Target |
|--------|--------|
| Pipeline feature adoption (among enterprise accounts) | >70% within 60 days of go-live |
| Custom fields configured per org | Average >5 fields |
| Automation rules active per enterprise org | Average >3 rules |
| API monthly active integrations | >50% of Business/Enterprise accounts |
| Client portal adoption | >30% of enterprise accounts by Phase 3 |

### Quality KPIs

| Metric | Target |
|--------|--------|
| Uptime SLA (Enterprise tier) | 99.9% monthly |
| P1 incident response | <1 hour |
| Security questionnaire pass rate | >90% |
| GDPR erasure request fulfilment | <72 hours |

---

## 11. Recommended Next Steps

### Immediate Actions (This Sprint)

1. **Validate with target accounts** — Conduct discovery calls with 3–5 prospective enterprise clients to validate the feature priorities in Section 5. Confirm which Must Haves are actual blockers vs. nice-to-haves for their specific context.

2. **Technical scoping session** — Engineering leads to review Section 6 architecture proposals and produce effort estimates for each Phase 1 Must Have item. Identify any technical dependencies or sequencing constraints.

3. **Pricing validation** — Test the proposed pricing structure in Section 8 with 2–3 warm prospects. Are enterprise buyers anchoring to a different price point? What are the strongest value drivers in their eyes?

4. **Identify SSO provider** — Evaluate WorkOS vs. Auth0 vs. Supabase Auth extensions for SAML support. Decision needed before Phase 1 development begins.

5. **Data model review** — Architect to produce a detailed ERD for Phase 1 new tables. GDPR and RBAC data models require particular care before implementation begins.

6. **Define Enterprise SLA** — What uptime, support, and response time commitments are we prepared to back contractually? This gates the Enterprise product launch.

### Decision Points Required

| Decision | Owner | Deadline |
|----------|-------|---------|
| SSO provider selection (WorkOS vs. Auth0) | CTO | End of Week 2 |
| Custom fields data model (EAV vs. JSONB) | Lead Architect | End of Week 2 |
| Enterprise pricing sign-off | CEO / CCO | End of Week 3 |
| Phase 1 scope finalisation (after effort estimates) | Product + Engineering | End of Week 4 |
| Pilot account selection (3 target accounts) | Sales | End of Week 3 |

---

## Appendix A: Entity Relationship Overview (Current → Target)

```
CURRENT                              TARGET (Phase 1+)
─────────────────────────────        ──────────────────────────────────────
Organisation                         Organisation
  └── Profile (admin/member)            ├── Branch (optional sub-unit)
  └── Client                            ├── Role (custom RBAC)
        └── Property                    ├── Profile (role-assigned)
        └── Job                         ├── Account (B2B company)
        └── Quote                       │     └── Client (contact under account)
        └── Activity                    ├── Client
        └── Follow-up                   │     ├── custom_field_values
                                        │     ├── tags
                                        │     ├── consent_records
                                        │     ├── Property
                                        │     ├── Deal (pipeline)
                                        │     ├── Job
                                        │     ├── Quote
                                        │     │     └── Contract
                                        │     │     └── Invoice
                                        │     ├── Activity
                                        │     └── Follow-up
                                        ├── Pipeline Stages
                                        ├── Automation Rules
                                        ├── Custom Fields (definitions)
                                        ├── Segments (saved filters)
                                        ├── API Keys
                                        └── Webhook Endpoints
```

---

## Appendix B: Competitor Feature Benchmarking

| Feature | Lustre (Current) | Lustre (Target) | HubSpot Starter | Salesforce Essentials | ServiceTitan |
|---------|-----------------|-----------------|-----------------|----------------------|-------------|
| Sales Pipeline | ✗ | ✓ | ✓ | ✓ | ✓ |
| Custom Fields | ✗ | ✓ | ✓ | ✓ | ✓ |
| Workflow Automation | ✗ | ✓ | ✓ | ✓ | ✓ |
| Email Sync | ✗ | ✓ | ✓ | ✓ | Limited |
| SSO | ✗ | ✓ | Enterprise | ✓ | Enterprise |
| RBAC | Basic | ✓ | Limited | ✓ | ✓ |
| API / Webhooks | ✗ | ✓ | ✓ | ✓ | ✓ |
| Multi-Branch | ✗ | ✓ | ✗ | ✓ | ✓ |
| Contract Management | ✗ | ✓ | ✗ | ✓ | ✓ |
| Client Portal | Partial | ✓ | ✗ | ✗ | ✓ |
| Field Service Specific | ✓ | ✓ | ✗ | ✗ | ✓ |
| Built for UK Market | ✓ | ✓ | ✗ | ✗ | ✗ |

**Key insight:** ServiceTitan is the closest competitor in the field service space, but is US-centric, expensive, complex, and not purpose-built for the UK cleaning market. Lustre's opportunity is to be the ServiceTitan for UK cleaning and property services — at a price point accessible to SME and mid-market operators, while being extensible enough for enterprise.

---

*Document prepared by: Chief Commercial Officer*
*For internal review and discussion — not for external distribution*
*Version 1.0 — March 2026*
