# Lustre — Chief Information Security Officer: Enterprise Security Plan

**Reference:** CISO-ENT-001
**Author:** Chief Information Security Officer
**Date:** March 2026
**Status:** Draft for Executive Review
**Companion Documents:** CRM-ENT-001 (CCO), OPS-ENT-001 (COO), CFO-ENT-001 (CFO), CPO-ENT-001 (CPO), CTO-ENT-001 (CTO)

---

## Executive Summary

Lustre is in a better security position than most field service SaaS companies at this stage. That is not flattery — it is a specific claim about specific decisions. Row-Level Security enforced at the database layer, an append-only audit log with immutability enforced by RLS policy, rate limiting on all unauthenticated endpoints, and a deliberate separation between the service role client and the anon client represent security thinking that is usually absent from MVP codebases and very expensive to retrofit. The founding team made these decisions early and made them correctly.

That said, a well-secured MVP is not the same thing as a security posture that enterprise buyers will accept. Enterprise customers — and particularly enterprise procurement, legal, and IT security teams — evaluate security as a programme, not as a collection of technical controls. They want to see governance alongside implementation. They want documented policies alongside code. They want evidence of testing alongside architecture. They want an incident response process alongside an audit log. They want to know what happens when something goes wrong, not just what is in place to prevent it.

This document addresses that gap. It begins from what the engineering team actually built — assessed honestly against the code — and builds forward to the security programme that enterprise sales will require. It is not a list of aspirational controls. It is a prioritised plan, grounded in the actual codebase, for turning a security-aware MVP into an enterprise-grade security programme.

My assessment organises the work into three categories:

**Category 1 — Immediate risk to remediate.** These are gaps in the current security architecture that represent genuine, near-term risk: an audit log that covers only five action types, no formal secrets management, no documented incident response process, and no MFA enforcement. These must be addressed before the first enterprise contract is signed.

**Category 2 — Programme to build.** These are the governance, compliance, and operational security capabilities that enterprise buyers evaluate during procurement: a formal security policy set, a vulnerability management process, penetration testing, compliance alignment (SOC 2 Type II, GDPR), and an enterprise identity integration path (SSO, SAML). These must be in place before enterprise deals close at scale.

**Category 3 — Capabilities to architect.** These are forward-looking security investments that determine whether the platform can serve regulated industries and large enterprise accounts: hardware security module integration, advanced threat detection, data classification and DLP controls, and a formal BCDR programme. These are not immediately blocking, but they must be planned now so that the architecture does not foreclose them.

This document is specifically the security perspective. It does not repeat what the CTO says about secrets management from an infrastructure standpoint, or what the COO says about operational incident response. It addresses the security programme — controls, governance, compliance, and risk — that sits on top of and around the engineering decisions already made.

---

## 1. Security Architecture Assessment — What the Team Built

### 1.1 What Was Done Correctly

**Multi-tenant data isolation at the database layer.** The RLS implementation in `supabase/rls.sql` protects nine tables using a consistent pattern: a `SECURITY DEFINER` helper function (`get_user_org_id()`) resolves the authenticated user's organisation, and every policy enforces that boundary. This means a bug at the application layer — a missing `WHERE` clause, an accidental variable reuse — cannot cause data leakage between tenants. The database enforces the boundary regardless of what the application does. This is the correct architectural decision and it was made at the start, when it was easy. Retrofitting it would be a multi-month project.

**Immutable audit logging by policy.** The audit log table has no UPDATE or DELETE RLS policies. This is a subtle but critical design choice: it means that even an authenticated administrator, with full application-layer access, cannot modify or delete audit records. The log is append-only by architectural constraint, not by convention. This property — which is what enterprise compliance teams mean when they ask for "tamper-evident audit trails" — was built in from day one.

**Rate limiting on all abuse-prone endpoints.** The rate limiting implementation in `src/lib/ratelimit.ts` applies four distinct strategies: brute-force protection on login (5 attempts per 15 minutes, sliding window), signup spam prevention (3 per hour, fixed window), PDF generation abuse prevention (20 per minute, sliding window), and public quote response limiting (5 per hour per token, fixed window). The choice of sliding window for brute-force scenarios is technically correct — it prevents the burst-at-window-boundary attack that fixed windows are vulnerable to.

**Service role isolation.** The Supabase service role client — which bypasses RLS — is isolated to a single file (`src/lib/supabase/service.ts`) and used only in server-side code marked with the `'use server'` directive. It is never imported in client code. This controls the most dangerous capability in the system and does so architecturally, not just by convention.

**Security headers on all responses.** The Next.js configuration in `next.config.ts` applies `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a Permissions Policy disabling camera, microphone, and geolocation, and a Content Security Policy that restricts script and connect sources. These are correctly configured for a production application.

**Open redirect prevention in middleware.** The authentication middleware in `src/middleware.ts` validates redirect paths before following them, blocking `//` prefix attacks and enforcing internal-path-only redirects. This is a commonly overlooked vulnerability that the team caught and addressed.

**Input validation with max length enforcement.** The validation helpers in `src/lib/actions/_validate.ts` enforce both presence and length constraints on all form inputs, with sensible limits (100 characters for names, 254 for emails matching RFC 5321, 30 for phone numbers, 5000 for notes). This is consistently applied across all server actions.

### 1.2 Security Gaps in the Current Architecture

**The audit log covers only five action types.** The current implementation in `src/lib/audit.ts` tracks: `delete_client`, `delete_property`, `delete_job`, `delete_quote`, and `update_vat_settings`. This is a meaningful start but leaves most security-relevant events unlogged: user login and logout, failed authentication attempts, organisation settings changes (other than VAT), user role changes, quote sends and status transitions, and failed authorisation attempts. An enterprise buyer asking to see the audit trail for a specific user's activity over a 30-day period will find it almost empty.

**No MFA enforcement.** Supabase Auth supports TOTP-based multi-factor authentication, but the current implementation does not require it. Enterprise accounts — and particularly admin accounts — must be MFA-protected. This is a standard procurement requirement.

**Secrets management is environment variables only.** The current pattern stores all secrets (Supabase service role key, Resend API key, Upstash Redis credentials) as environment variables. This is adequate for a small team at MVP but does not provide the rotation, access control, or audit trail that enterprise security standards require. There is no process for rotating secrets, no access log for who has retrieved them, and no mechanism for automatic rotation.

**Rate limiting fails open.** The `checkRateLimit` function in `src/lib/ratelimit.ts` returns `{ success: true }` when Redis is not configured. This is the correct default for a development environment but must be a configuration error in production. There is no runtime check that enforces Redis availability before serving production traffic.

**No session timeout configuration.** Session lifetime is delegated entirely to Supabase's defaults. There is no explicit configuration for session expiry, no idle timeout, and no mechanism for an administrator to invalidate all active sessions for a user (which is required for offboarding).

**No SSO or SAML integration.** Enterprise accounts use corporate identity providers (Azure AD, Okta, Google Workspace). They do not create individual username/password accounts in SaaS applications. Without SAML 2.0 or OIDC SSO support, Lustre cannot be deployed inside the security perimeter of an enterprise customer's IT policy. This is a hard blocker for many enterprise procurement approvals.

**No formal incident response process.** There is no documented process for detecting a security incident, containing it, notifying affected customers, or conducting post-incident review. GDPR requires notification of a personal data breach within 72 hours. Enterprise contracts typically require notification within 24. Without a documented, practiced process, the response to an incident will be improvised under pressure.

**No penetration testing.** The application has never been formally assessed by an independent security tester. Enterprise buyers will ask for penetration test results or the right to conduct their own assessment.

---

## 2. Compliance Landscape

### 2.1 GDPR

Lustre processes personal data (names, email addresses, phone numbers, property addresses, access instructions) on behalf of its customers. Under GDPR, Lustre acts as a **data processor** for its customers (the data controllers) and as a data controller for its own employee and prospect data.

**Current alignment:**
- Org-scoped data isolation is a strong technical control supporting data minimisation and access limitation principles.
- The immutable audit log supports the accountability principle.
- The public quote endpoint exposes only the minimum data necessary to the intended recipient.

**Current gaps:**
- No Data Processing Agreement (DPA) template for customers.
- No documented legal basis for each category of data processing.
- No Data Protection Impact Assessment (DPIA) for high-risk processing activities (property access codes, alarm codes).
- No mechanism for subject access requests (SAR) — a user requesting all data held about them would require manual database queries.
- No data retention schedule: data is retained indefinitely with no automated deletion.
- No appointed Data Protection Officer (DPO) or equivalent responsible party.
- No breach notification procedure documented or practised.

**Priority actions for GDPR readiness:**
1. Appoint a named DPO or responsible party (can be external counsel at this stage).
2. Draft a customer DPA and include it in enterprise contracts.
3. Document the legal basis for each processing activity in a Records of Processing Activities (RoPA) register.
4. Implement a configurable data retention schedule with automated deletion.
5. Build a SAR response workflow (export of all data for a given individual across all org-scoped tables).
6. Conduct a DPIA for property access code storage (alarm codes constitute sensitive operational data).

### 2.2 SOC 2 Type II

Enterprise buyers in North America and increasingly in the UK and EU will request a SOC 2 Type II report as a condition of procurement. A SOC 2 Type II report covers the Security, Availability, Processing Integrity, Confidentiality, and Privacy trust service criteria over an observation period (typically 6 or 12 months).

**Current alignment (Security TSC):**
- Logical access controls: strong (RLS, RBAC, middleware authentication).
- Change management: partially in place (git-based, but no formal review process documented).
- Risk assessment: not documented.
- Incident response: not documented.
- Vendor management: not documented.

**What a SOC 2 audit will find missing:**
- No formal security policies (acceptable use, access control, incident response, change management, vendor management).
- No security awareness training programme.
- No formal vulnerability management programme (scanning, remediation SLAs).
- No penetration testing history.
- No formal background check process for personnel with privileged access.
- No formal business continuity or disaster recovery plan.

**SOC 2 readiness timeline:** A realistic SOC 2 Type II engagement — from policy documentation through the observation period to report issuance — takes 12–18 months for a company starting from scratch. Work must begin now for a report to be available during enterprise sales cycles next year.

### 2.3 ISO 27001

ISO 27001 is the international standard for information security management systems. It is increasingly required by European enterprise buyers. The certification requires a formal ISMS (Information Security Management System) covering 93 controls across four domains.

At this stage, pursuing ISO 27001 certification in parallel with SOC 2 is not recommended — the overhead is duplicative and the market demand from North American enterprise buyers skews toward SOC 2. The programme should be designed so that SOC 2 compliance is the primary target, with ISO 27001 certification achievable in year two by extending the programme rather than rebuilding it.

### 2.4 What Lustre Is Not Currently Suitable For

**HIPAA:** Lustre stores property access codes and alarm codes, but not health information. HIPAA is not applicable and should not be pursued.

**PCI DSS:** Lustre stores Stripe customer IDs but not card numbers, CVVs, or other cardholder data. The Stripe integration is correctly architected to keep card data out of Lustre's systems. PCI DSS Level 4 self-assessment questionnaire (SAQ A) may be relevant for the payment flow but full PCI DSS certification is not required.

**FedRAMP:** Not relevant at this stage. The customer base is private sector field service businesses.

---

## 3. Identity and Access Management

### 3.1 Current State

The current authentication model is Supabase Auth with email/password credentials. Authorisation uses a two-tier role model: `admin` and `team_member`. Admin-only actions are enforced through the `requireAdmin()` helper in `src/lib/actions/_auth.ts`. Organisation membership is validated on every database operation through the `get_user_org_id()` RLS function.

This model is correct for a small-team SaaS CRM. It is not sufficient for enterprise.

### 3.2 Enterprise IAM Requirements

**SSO and SAML 2.0.** Enterprise customers require their employees to authenticate through their corporate identity provider. This is not a preference — it is an IT security requirement at most large organisations. When an employee is offboarded, their access to all corporate applications must be revoked by disabling their IDP account, not by manually removing them from each SaaS tool. Supabase supports third-party OAuth providers and, through the Auth API, SAML 2.0. Implementing SSO is the single highest-impact identity change for enterprise readiness.

**MFA enforcement.** Administrator accounts must require MFA. Enterprise plans should enforce MFA for all users. Supabase TOTP support can be enabled and enforced at the application layer; the enforcement logic belongs in the middleware and the onboarding flow.

**Role granularity.** The current admin/team_member binary is insufficient for enterprise accounts with multiple teams, managers, and permission tiers. Enterprise customers will want: org-level admins, billing-only admins, read-only users, and team-scoped access (a user who can see jobs for London but not Manchester). This requires a more sophisticated RBAC model — not necessarily complex to design, but it must be planned before the data model is locked.

**Session management.** Explicit session timeout policies (idle timeout: 30 minutes; absolute timeout: 8 hours) and the ability for an admin to invalidate all sessions for a specific user are required for enterprise compliance. The current implementation delegates this entirely to Supabase defaults with no application-layer control.

**Privileged access management.** Access to the Supabase service role key — which bypasses all RLS — must be treated as privileged access. Who holds it, when it was last rotated, and what monitoring exists on its use must be documented and controlled.

### 3.3 IAM Roadmap

| Phase | Action | Timeline |
|-------|--------|----------|
| Pre-contract | Implement MFA enforcement for admin accounts | Month 1 |
| Pre-contract | Document and audit all privileged access holders | Month 1 |
| Pre-contract | Implement session timeout (idle + absolute) | Month 2 |
| Pre-launch | SAML 2.0 / OIDC SSO for enterprise tier | Month 3–4 |
| Pre-launch | Expanded RBAC model (team-scoped roles) | Month 4–6 |
| Year 1 | JIT provisioning via SCIM for large enterprise | Month 9–12 |

---

## 4. Vulnerability Management

### 4.1 Current State

There is no formal vulnerability management programme. Dependencies are not scanned for known vulnerabilities. No penetration test has been conducted. There is no SLA for remediating discovered vulnerabilities.

### 4.2 Required Programme

**Dependency scanning.** The `package.json` dependencies include `@supabase/supabase-js`, `@upstash/ratelimit`, `@upstash/redis`, `resend`, and `next`. All are actively maintained libraries with security advisory programmes. GitHub Dependabot or Snyk should be enabled immediately to surface CVEs in direct and transitive dependencies with automated pull request remediation.

**Static application security testing (SAST).** A SAST tool (Semgrep, CodeQL, or SonarQube) should be integrated into the CI pipeline to scan for common vulnerability patterns: SQL injection (not applicable with the ORM but relevant for raw query usage), XSS, hardcoded secrets, insecure randomness, and prototype pollution. This should block merge to main on high-severity findings.

**Penetration testing.** An annual penetration test by an accredited third-party tester (CHECK-certified or CREST-certified in the UK; OSCP/GPEN-qualified in the US market) is required for SOC 2 compliance and will be requested by enterprise procurement teams. The first test should be conducted before the first enterprise contract closes. The scope should cover: authentication bypass, tenant isolation (can Organisation A access Organisation B's data?), rate limit bypass, the public quote endpoint, PDF generation, and the server action layer.

**Vulnerability remediation SLAs.** Define and publish (internally first, then to customers in the security policy):
- Critical (CVSS 9.0+): 24-hour remediation or compensating control
- High (CVSS 7.0–8.9): 7-day remediation
- Medium (CVSS 4.0–6.9): 30-day remediation
- Low (CVSS < 4.0): 90-day remediation or accepted risk

**Bug bounty programme.** Once penetration testing is complete and the application has been hardened, a private bug bounty programme (HackerOne or Bugcrowd) inviting a small number of trusted researchers is appropriate. This is increasingly expected by enterprise security teams as evidence that the vendor actively invites external scrutiny.

---

## 5. Data Security

### 5.1 Data Classification

No formal data classification scheme exists. The following classification is proposed based on the data currently stored:

| Classification | Examples | Controls Required |
|----------------|----------|-------------------|
| **Restricted** | Property alarm codes, access instructions, Stripe customer IDs, service role keys | Encrypted at rest, access logged, need-to-know only |
| **Confidential** | Client PII (name, email, phone), financial quote data, VAT numbers, user passwords | Org-scoped RLS, encrypted in transit, audit on access |
| **Internal** | Job notes, activity logs, follow-up records | Org-scoped RLS, standard controls |
| **Public** | Organisation name (on public quotes), app marketing content | No special controls |

### 5.2 Encryption

**Encryption in transit** is handled by Supabase's enforced HTTPS and WSS connections. This is correctly implemented and should be verified as enforced (no HTTP fallback) in the infrastructure configuration.

**Encryption at rest** is provided by Supabase's PostgreSQL storage encryption. The specifics (AES-256, key management by Supabase) should be documented in the security posture documentation provided to customers.

**Application-layer encryption** is not currently implemented. Property alarm codes — which are classified as Restricted — should be considered for application-layer encryption before they are used to meet the security requirements of large property management customers. This is a specific risk: a database breach would expose alarm codes in plaintext. The implementation would use a key management service (AWS KMS, or Supabase Vault, which is available on the Pro plan) rather than application-managed keys.

**Key rotation** is not currently managed. The Supabase service role key, Resend API key, and Upstash credentials have no documented rotation schedule. These should be rotated quarterly at minimum, with the process documented and access-logged.

### 5.3 Data Retention and Deletion

No retention schedule exists. Data is currently retained indefinitely. This creates GDPR liability (personal data must not be retained longer than necessary for the stated purpose) and increases the blast radius of any future data breach.

The retention schedule should be defined per data category:
- **Audit logs:** 7 years (regulatory requirement for financial records in the UK)
- **Client and property data:** Duration of customer relationship plus 2 years (or shorter if the customer requests deletion)
- **Job and quote data:** 7 years (VAT and financial records requirement)
- **System logs:** 90 days
- **Inactive organisation data:** Notify at 90 days, delete at 180 days

Automated deletion pipelines must be implemented. The current RLS model does not allow application-layer deletion of audit records (correctly), so a controlled, audited admin process for audit log archival after the retention period is required.

---

## 6. Security Operations

### 6.1 Logging and Monitoring

The current audit log captures five action types. A complete security logging strategy requires:

**Application security events to log:**
- Authentication events: login (success and failure), logout, MFA challenge (success and failure)
- Authorization failures: attempts to access resources outside the user's organisation
- Administrative actions: user role changes, organisation setting changes, user invitations and removals
- Data operations: bulk exports, quote sends, all delete operations (currently: delete client, property, job, quote — expand to cover all tables)
- Public endpoint access: quote token access attempts (both valid and invalid tokens)
- Rate limit hits: records of throttled requests by IP and user

**Infrastructure events to log:**
- Supabase service role usage (each invocation should be logged with context)
- Environment variable access (requires secrets management platform)
- Deployment events (who deployed what and when)

**Log integrity:** Logs must be shipped to a write-only destination external to the application (e.g., a SIEM or log aggregation service with retention guarantees). Application-level logs in the Supabase audit table are protected from modification by RLS, but a compromise of the Supabase service role would allow bypassing these controls. External log shipping provides a defence-in-depth layer.

### 6.2 Alerting

No alerting exists on security events. Minimum alerting required:
- Authentication failure rate exceeding threshold (potential credential stuffing)
- Rate limit hits on login endpoint
- Invalid token attempts on the public quote endpoint exceeding threshold
- Any use of the service role client in production (should be a rare, specific event)
- Failed deployments or configuration changes

### 6.3 Incident Response

No incident response plan exists. The following is the minimum viable incident response process for pre-enterprise:

**Phase 1 — Detection.** Security events are identified through alerts, customer reports, or routine log review. All suspected security events are escalated to the CISO immediately.

**Phase 2 — Containment.** Depending on the nature of the incident: isolate affected systems, invalidate compromised credentials, apply rate limiting or IP blocks, disable the compromised feature if necessary.

**Phase 3 — Assessment.** Determine: What data was accessed or exfiltrated? Which customers are affected? What is the root cause? Is the incident contained?

**Phase 4 — Notification.** GDPR requires notification to the relevant supervisory authority (ICO in the UK) within 72 hours of becoming aware of a personal data breach. Enterprise contracts will require customer notification within 24 hours. A notification template should be prepared in advance. Legal counsel must be involved in all breach notifications.

**Phase 5 — Remediation.** Fix the root cause, implement additional controls, and verify the fix.

**Phase 6 — Post-incident review.** Conduct a blameless post-mortem within 5 business days. Document findings and distribute to the executive team.

The incident response plan must be a written document, reviewed by legal counsel, tested at least annually through a tabletop exercise, and referenced in enterprise contracts.

---

## 7. Third-Party and Supply Chain Risk

Lustre's security posture is substantially dependent on the security of three third-party platforms:

**Supabase.** The database, authentication, and storage layer. Supabase is SOC 2 Type II certified. The DPA with Supabase covers Supabase's obligations as a data processor. Key risks: Supabase service availability, Supabase security breach, Supabase pricing changes (commercial risk), and Supabase platform policy changes. Mitigation: maintain a documented off-ramp architecture (the database is standard PostgreSQL; migration away from Supabase is feasible with engineering effort).

**Upstash Redis.** The rate limiting backend. Upstash is used for a security control (rate limiting). If Upstash is unavailable, the rate limiting function returns `success: true` (fail-open). This must be changed to fail-closed in production — a rate limiting outage should result in degraded service (no new sessions), not an open door for brute-force attacks. Upstash's data processing agreement and SOC 2 status should be verified.

**Resend.** The email delivery service used for authentication emails (password reset, magic links). A compromise of the Resend API key or Resend's infrastructure could allow an attacker to send fraudulent emails appearing to come from Lustre. The Resend API key must be treated as a high-value secret, rotated quarterly, and its usage monitored.

**Software Bill of Materials (SBOM).** A formal SBOM should be generated from `package.json` and its lock file and maintained as a security artefact. Enterprise buyers in regulated industries (financial services, utilities) increasingly require this for supply chain risk assessment.

---

## 8. Security Policies and Governance

A security programme without written policies is not a security programme. Enterprise buyers and SOC 2 auditors will request the following policy documents:

| Policy | Purpose | Priority |
|--------|---------|----------|
| Information Security Policy | Master policy; commitment from leadership | Pre-contract |
| Access Control Policy | Who can access what, how access is granted and revoked | Pre-contract |
| Incident Response Policy | How security incidents are detected, responded to, and reported | Pre-contract |
| Data Classification Policy | How data is classified and handled by tier | Pre-contract |
| Acceptable Use Policy | What employees can and cannot do with company systems | Pre-contract |
| Change Management Policy | How code changes are reviewed and deployed | Pre-SOC 2 |
| Vendor Management Policy | How third parties are assessed and monitored | Pre-SOC 2 |
| Business Continuity Policy | How the business operates during and after a disruption | Pre-SOC 2 |
| Data Retention and Deletion Policy | How long data is kept and how it is securely deleted | Pre-contract |
| Vulnerability Management Policy | How vulnerabilities are discovered, prioritised, and remediated | Pre-SOC 2 |

These documents do not need to be lengthy. A one-page Access Control Policy that is consistently followed is more valuable than a 50-page policy document that describes aspirational practices never implemented. The policies should describe what Lustre actually does, not what it intends to do.

---

## 9. Phased Security Roadmap

### Phase 1 — Enterprise Foundation (Months 1–3)

These actions are required before the first enterprise contract is signed. They address the most critical gaps and can largely be accomplished within the existing architecture.

| Action | Owner | Description |
|--------|-------|-------------|
| Expand audit log coverage | Engineering | Log all authentication events, admin actions, and authorisation failures |
| Enforce MFA for admin accounts | Engineering | Implement Supabase TOTP with enforcement in middleware |
| Implement session timeout | Engineering | Configure idle (30 min) and absolute (8 hr) session limits |
| Fix rate limiting fail-open | Engineering | Runtime assertion that Redis is available before serving production traffic |
| Rotate all secrets | Engineering + Ops | Establish rotation schedule; rotate immediately |
| Document incident response plan | CISO + Legal | Written plan reviewed by legal; tabletop exercise scheduled |
| Draft customer DPA | Legal | Standard DPA for enterprise contracts |
| Enable Dependabot / Snyk | Engineering | Automated dependency vulnerability scanning |
| Write core security policies | CISO | Information Security, Access Control, Incident Response, Data Classification |
| Appoint DPO or privacy counsel | Legal | Named responsible party for GDPR compliance |

### Phase 2 — Enterprise Sales Enablement (Months 4–6)

These actions enable enterprise sales by providing the security evidence and capabilities that procurement teams request.

| Action | Owner | Description |
|--------|-------|-------------|
| First penetration test | CISO + Vendor | Accredited third-party assessment; remediate findings |
| SAML 2.0 / OIDC SSO | Engineering | Supabase SAML integration for enterprise tier |
| SAST pipeline integration | Engineering | CodeQL or Semgrep in CI; blocking on high-severity findings |
| External log shipping | Engineering + Ops | Ship security events to external write-only destination |
| Security alerting | Engineering + Ops | Alerts on authentication failure rates, rate limit hits |
| SOC 2 readiness assessment | CISO + Auditor | Gap assessment against SOC 2 TSC; identify observation period start |
| Implement data retention | Engineering | Configurable retention schedule with automated deletion |
| SBOM generation | Engineering | Automated SBOM from lock file; include in security documentation |
| Application-layer encryption for alarm codes | Engineering | Encrypt Restricted data using Supabase Vault or equivalent KMS |

### Phase 3 — SOC 2 Compliance and Enterprise Scale (Months 7–12)

| Action | Owner | Description |
|--------|-------|-------------|
| SOC 2 observation period | All | 6-month observation period with controls operating |
| Expanded RBAC | Engineering | Team-scoped roles; billing admin; read-only tier |
| SCIM provisioning | Engineering | Automated user provisioning from enterprise identity providers |
| Secrets management platform | Engineering + Ops | HashiCorp Vault or AWS Secrets Manager; replace environment variables |
| Private bug bounty programme | CISO | HackerOne or Bugcrowd private programme |
| Annual penetration test cycle | CISO | Second annual test; scope extended to SSO and new RBAC model |
| Business continuity testing | Ops + CISO | Documented BCDR plan; annual test |
| Security awareness training | CISO | All staff; phishing simulation |
| SOC 2 Type II report | Auditor | Report issued; available to enterprise prospects |

---

## 10. Risk Register

| Risk | Likelihood | Impact | Current Controls | Residual Risk | Owner |
|------|-----------|--------|-----------------|--------------|-------|
| Tenant data isolation breach (RLS bypass) | Low | Critical | RLS enforced at DB layer; org-scoped queries in all actions | Low | Engineering |
| Credential compromise (brute force) | Medium | High | Rate limiting (5 attempts/15 min, sliding window) | Low-Medium | Engineering |
| Credential compromise (phishing/reuse) | Medium | High | No MFA enforcement currently | **High** | CISO |
| Service role key exposure | Low | Critical | Isolated to server-side; never in client code | Medium | Engineering |
| Third-party breach (Supabase) | Low | Critical | DPA; off-ramp architecture feasibility | Medium | CISO |
| Third-party breach (Resend) | Low | High | API key rotation schedule (not yet implemented) | **High** | CISO |
| Supply chain compromise (npm dependency) | Low | High | No dependency scanning currently | **High** | Engineering |
| Audit log tampering | Very Low | High | RLS immutability; no DELETE/UPDATE policies | Low | Engineering |
| GDPR breach notification failure | Medium | High | No documented process | **High** | CISO + Legal |
| Penetration test finding (unauthenticated access) | Unknown | Critical | No test conducted | **Unknown** | CISO |
| Property alarm code exposure | Low | High | Plaintext in DB; RLS protected but not encrypted | **Medium-High** | Engineering |
| Session hijacking | Low | High | No explicit session timeout; no invalidation mechanism | Medium | Engineering |

Risks marked **High** or **Unknown** must be addressed in Phase 1 before enterprise contracts are executed.

---

## 11. Security KPIs and Metrics

The following metrics should be reviewed monthly by the executive team and included in board reporting:

**Vulnerability management:**
- Time to remediate critical vulnerabilities (target: < 24 hours)
- Open vulnerability count by severity tier
- Dependency scanning pass rate (% of builds with no new High/Critical findings)

**Identity and access:**
- MFA adoption rate (target: 100% for admin accounts pre-Phase 1; 100% all accounts post-Phase 2)
- SSO adoption rate among enterprise customers (target: 100%)
- Number of privileged access holders (service role key; target: ≤ 2 named individuals)

**Incident response:**
- Mean time to detect (MTTD) security incidents
- Mean time to contain (MTTC) security incidents
- Number of breaches requiring customer or regulatory notification

**Compliance:**
- Days until SOC 2 Type II report available
- Number of outstanding critical SOC 2 control gaps
- Policy review currency (all policies reviewed within 12 months)

**Audit:**
- Audit log coverage (% of sensitive actions logged; target: 100% by end of Phase 1)
- Audit log query availability (can security team retrieve logs for any user/time range within 1 hour?)

---

## 12. The CISO's Bottom Line

Lustre's engineering team made the right calls at the right times. The security foundation — RLS, immutable audit logs, rate limiting, service role isolation — is genuinely sound. That is not nothing; it is the difference between a platform that can be secured and a platform that cannot.

The gap is not in the code. The gap is in the programme. There is no documented incident response process, no MFA enforcement, no formal compliance pathway, no penetration test, no GDPR governance structure. These are not engineering problems; they are security programme problems, and they are solvable with focused attention over the next six to twelve months.

The sequencing matters. Phase 1 actions — expanding audit coverage, enforcing MFA, fixing the rate limiting fail-open, documenting incident response, drafting the customer DPA — can be completed in three months and are required before the first enterprise contract. Phase 2 and Phase 3 build the programme that will sustain enterprise growth and support the SOC 2 certification that will open the door to large enterprise accounts.

The alternative — treating security as an afterthought and catching up after signing the first enterprise contract — is a false economy. Enterprise customers discover security gaps during procurement, not after it. A programme that cannot answer basic security questionnaire questions honestly loses deals before they close. A programme that answers them honestly, with evidence, wins them.

The programme starts now.

---

*CISO-ENT-001 | Lustre Information Security | March 2026 | Draft for Executive Review*
