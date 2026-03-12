# Lustre — Testing Plan

**Owner:** Head of Quality Engineering
**Last updated:** 2026-03-12
**Status:** Active

---

## Table of Contents

1. [Strategy & Philosophy](#1-strategy--philosophy)
2. [Testing Pyramid](#2-testing-pyramid)
3. [Toolchain & Setup](#3-toolchain--setup)
4. [Unit Tests](#4-unit-tests)
5. [Integration Tests](#5-integration-tests)
6. [End-to-End Tests](#6-end-to-end-tests)
7. [Security & RBAC Tests](#7-security--rbac-tests)
8. [API & Webhook Tests](#8-api--webhook-tests)
9. [Performance Tests](#9-performance-tests)
10. [Test Data Management](#10-test-data-management)
11. [CI/CD Integration](#11-cicd-integration)
12. [Coverage Targets](#12-coverage-targets)
13. [Test Environments](#13-test-environments)
14. [Defect Management](#14-defect-management)
15. [Roles & Responsibilities](#15-roles--responsibilities)

---

## 1. Strategy & Philosophy

### Goals

- Catch regressions before they reach production
- Give every developer fast, trustworthy feedback
- Protect the revenue-critical paths: billing, invoices, RBAC, and data isolation
- Be reusable — this plan applies to every feature branch, PR, and release

### Guiding Principles

| Principle | What it means in practice |
|-----------|--------------------------|
| **Test behaviour, not implementation** | Assert what the user experiences; avoid testing internals that are likely to change |
| **Tests must be deterministic** | Flaky tests are deleted or quarantined within one sprint |
| **Fast feedback first** | Unit → integration → e2e. Never block a PR on slow tests that could run async |
| **Data isolation** | Each test creates and destroys its own data; never share mutable state across tests |
| **Fail loudly, fix quickly** | A failing test suite blocks merges to `main`; the author owns the fix |

### Risk Register

The following areas carry the highest business risk and therefore require the deepest test coverage:

| Area | Risk | Priority |
|------|------|----------|
| Row-Level Security (RLS) | Data leaking between organisations (multi-tenancy breach) | P0 |
| Stripe webhooks | Missed payment events, double-processing | P0 |
| RBAC permissions | Under-privileged users accessing restricted features | P0 |
| Invoice & quote generation | Financial documents with wrong totals or wrong org data | P0 |
| Authentication / session | Account takeover, broken SSO | P1 |
| Pagination & data queries | Silent data loss or duplicated records across pages | P1 |
| PDF generation | Corrupt or empty PDF delivered to client | P1 |
| Rate limiting | Abuse paths bypassing Upstash limits | P2 |

---

## 2. Testing Pyramid

```
              ┌──────────────────────┐
              │    E2E / Browser     │  ~10%  — Playwright, critical user journeys
              │  (slow, high value)  │
              ├──────────────────────┤
              │  Integration Tests   │  ~30%  — Server actions, API routes, DB queries
              │  (medium speed)      │
              ├──────────────────────┤
              │     Unit Tests       │  ~60%  — Pure functions, helpers, permissions
              │  (fast, isolated)    │
              └──────────────────────┘
```

### When each layer runs

| Layer | Runs on | Blocking |
|-------|---------|----------|
| Unit | Every commit (pre-push hook + CI) | Yes |
| Integration | Every PR | Yes |
| E2E | Every PR + scheduled nightly | Yes on PR |
| Performance | Nightly + before major releases | Advisory |

---

## 3. Toolchain & Setup

### Recommended Frameworks

| Purpose | Tool | Rationale |
|---------|------|-----------|
| Unit & integration tests | **Vitest** | Native ESM, first-class TypeScript support, fast HMR, compatible with Next.js App Router |
| Component tests | **@testing-library/react** + Vitest | Standard for React Server/Client components |
| E2E / browser tests | **Playwright** | Already used in `__checks__/`; supports multi-browser, network interception, and auth state |
| DB test helpers | **Supabase local dev** (`supabase start`) | Runs a full Postgres instance locally; seed with `seed_business_test_data.sql` |
| API mocking | **MSW (Mock Service Worker) v2** | Intercepts fetch at the edge/node boundary; works with both Vitest and Playwright |
| Test coverage | **Vitest's built-in c8/v8** | Zero-config; outputs LCOV for CI upload |
| Visual regression | **Playwright screenshots** (optional, Phase 2) | PDF previews, invoice layouts |

### Installation

```bash
npm install --save-dev vitest @vitest/coverage-v8 @testing-library/react \
  @testing-library/user-event @testing-library/jest-dom \
  @vitejs/plugin-react jsdom msw playwright @playwright/test
```

### Vitest Configuration

Create `vitest.config.ts` at the project root:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',           // for component tests
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['src/test/**', '**/*.d.ts', 'src/app/**/page.tsx'],
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
})
```

### Test Setup File

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

### Playwright Configuration

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [['html'], ['github']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## 4. Unit Tests

Unit tests cover **pure functions and isolated modules** — no database, no network, no Next.js runtime required.

### File Convention

Test files live alongside source files:

```
src/lib/permissions.ts
src/lib/permissions.test.ts

src/lib/pagination.ts
src/lib/pagination.test.ts
```

### 4.1 Permissions (`src/lib/permissions.ts`)

Test every permission predicate for every role.

```
Roles under test: owner | admin | manager | operative | viewer
```

| Test case | Assertion |
|-----------|-----------|
| `hasPermission(owner, 'clients:write')` | `true` |
| `hasPermission(viewer, 'clients:write')` | `false` |
| `hasPermission(manager, 'invoices:send')` | `true` (if granted) |
| `hasPermission(operative, 'billing:manage')` | `false` |
| Unknown permission key | `false` (safe default) |
| `null` / `undefined` user | `false` (no throw) |

All constants from `PERMISSIONS` in `src/lib/types/index.ts` must have at least one positive and one negative test.

### 4.2 Pagination (`src/lib/pagination.ts`)

| Test case | Assertion |
|-----------|-----------|
| `buildCursorQuery` with no cursor | Produces correct SQL fragment for first page |
| `buildCursorQuery` with cursor | Produces `WHERE id > cursor` fragment |
| `parsePaginationParams` with valid params | Returns typed `{ limit, cursor }` |
| `parsePaginationParams` with out-of-range limit | Clamps to max (e.g. 100) |
| `parsePaginationParams` with malformed cursor | Returns `null` cursor (no throw) |
| `hasNextPage` when results === limit | Returns `true` |
| `hasNextPage` when results < limit | Returns `false` |

### 4.3 Audit Logging (`src/lib/audit.ts`)

| Test case | Assertion |
|-----------|-----------|
| `createAuditEvent` returns correct shape | Required fields present and typed |
| Action name normalisation | Consistent casing/format |
| Metadata sanitisation | PII fields stripped if applicable |

### 4.4 Type Guards & Utilities

Any type guard or utility function in `src/lib/` that contains conditional logic should have unit tests covering all branches.

### 4.5 React Components (Isolated)

Use `@testing-library/react` to render components in isolation with mock data.

**Priority components:**

| Component | Key tests |
|-----------|-----------|
| `PaginationControls` | Renders prev/next; disables when at boundary; emits correct params on click |
| `TagPicker` | Renders tags; selects/deselects correctly; applies `onChange` callback |
| `ActivityTimeline` | Renders empty state; renders list of activities in order |
| `JobsList` | Renders skeleton while loading; renders empty state; renders items |
| `ClientsList` | Same pattern as JobsList |
| `Nav` | Active link highlighted; role-gated nav items hidden for unauthorised roles |

---

## 5. Integration Tests

Integration tests exercise **server actions, API route handlers, and database queries** against a real local Supabase instance.

### Prerequisites

```bash
npx supabase start          # starts local Postgres on port 54322
npx supabase db reset       # applies migrations + seed
```

Set `TEST_SUPABASE_URL` and `TEST_SUPABASE_SERVICE_KEY` in `.env.test.local`.

### File Convention

```
src/lib/actions/__tests__/clients.test.ts
src/lib/queries/__tests__/clients.test.ts
src/app/api/webhooks/__tests__/stripe.test.ts
```

### 5.1 Client Actions (`src/lib/actions/clients.ts`)

Each action is tested with: (a) an authorised user, (b) an unauthorised user, (c) invalid input.

| Test case | Assertion |
|-----------|-----------|
| `createClient` — valid payload, owner role | Client row created; audit event written |
| `createClient` — missing required field | Returns validation error; no row created |
| `createClient` — viewer role | Returns permission denied error |
| `updateClient` — own organisation | Row updated; audit event written |
| `updateClient` — different organisation ID | Row NOT updated (RLS prevents it) |
| `deleteClient` — owner role | Row soft-deleted or removed |
| `deleteClient` — operative role | Returns permission denied error |

### 5.2 Job Actions (`src/lib/actions/jobs.ts`)

| Test case | Assertion |
|-----------|-----------|
| `createJob` — valid payload | Job created, linked to client and org |
| `createJob` — client from another org | Returns error; no row created |
| `updateJobStatus` — operative (assigned) | Status updated |
| `updateJobStatus` — operative (unassigned) | Returns permission denied |
| `completeChecklist` — valid completion | Checklist marked complete; timestamp recorded |
| `completeChecklist` — already complete | Idempotent or returns appropriate error |

### 5.3 Quote & Invoice Actions

| Test case | Assertion |
|-----------|-----------|
| `createQuote` — valid line items | Quote created with correct totals |
| `createQuote` — negative line item price | Returns validation error |
| `sendQuote` — draft status | Status updated to `sent`; email triggered |
| `sendQuote` — already sent | Returns appropriate error or is idempotent |
| `createInvoice` from accepted quote | Invoice created with correct amounts |
| `markInvoicePaid` — admin role | Status updated to `paid`; audit event written |
| `markInvoicePaid` — viewer role | Returns permission denied |

### 5.4 RBAC Actions (`src/lib/actions/rbac.ts`)

| Test case | Assertion |
|-----------|-----------|
| `inviteMember` — owner inviting manager | Invitation created; email sent |
| `inviteMember` — manager inviting owner | Returns permission denied |
| `updateMemberRole` — demoting another owner | Allowed if at least one owner remains |
| `updateMemberRole` — removing last owner | Returns error; row NOT updated |
| `removeMember` — self-removal | Handled gracefully |
| `removeMember` — removing another org's member | Returns error (RLS) |

### 5.5 Data Queries (`src/lib/queries/`)

For each major query function:

| Test case | Assertion |
|-----------|-----------|
| Returns only records belonging to current org | Count matches seeded org data, not total DB records |
| Pagination — first page | Returns `limit` records + `nextCursor` |
| Pagination — last page | Returns remaining records; `nextCursor` is `null` |
| Pagination — empty result | Returns `[]` and `nextCursor: null` |
| Filtered query (status, tag, date range) | Returns only matching records |
| Sorted query | Records in correct order |

### 5.6 GDPR Actions (`src/lib/actions/gdpr.ts`)

| Test case | Assertion |
|-----------|-----------|
| `exportOrganisationData` | Returns all expected entity types; no data from other orgs |
| `deleteOrganisation` | All related rows deleted across all tables |
| `exportOrganisationData` — non-owner role | Returns permission denied |

---

## 6. End-to-End Tests

E2E tests live in `/e2e/` and use **Playwright** against a running app (local or staging).

### Auth Setup

```ts
// e2e/auth.setup.ts
import { test as setup } from '@playwright/test'

setup('authenticate as owner', async ({ page }) => {
  await page.goto('/login')
  await page.fill('[name=email]', process.env.E2E_OWNER_EMAIL!)
  await page.fill('[name=password]', process.env.E2E_OWNER_PASSWORD!)
  await page.click('[type=submit]')
  await page.waitForURL('/dashboard')
  await page.context().storageState({ path: 'e2e/.auth/owner.json' })
})
```

### 6.1 Authentication Flow

| Journey | Steps | Pass criteria |
|---------|-------|---------------|
| Sign up | Visit `/signup` → fill form → submit | Redirected to `/onboarding` |
| Sign in | Visit `/login` → fill form → submit | Redirected to `/dashboard` |
| Sign out | Click sign-out in nav | Redirected to `/login`; dashboard inaccessible |
| Invite & accept | Owner invites → new user accepts via `/invite` link | New user lands in dashboard with correct role |
| SSO (WorkOS) | Click SSO provider → complete flow | Authenticated and redirected |
| Session expiry | Expire session cookie manually | Redirected to `/login` on next request |

### 6.2 Client Management

| Journey | Pass criteria |
|---------|---------------|
| Create a new client | Client appears in client list |
| Search / filter clients | Only matching clients shown |
| Edit client details | Changes reflected immediately |
| Add a tag to a client | Tag badge visible on client card |
| Delete a client | Removed from list; not visible after page refresh |

### 6.3 Job Scheduling

| Journey | Pass criteria |
|---------|---------------|
| Create a job for a client | Job appears in jobs list and on client detail |
| Assign job to team member | Assignee shown; member sees job in their view |
| Update job status | Status badge updates; activity timeline shows change |
| Complete checklist items | Checked items persist on page refresh |

### 6.4 Quote & Invoice Lifecycle

| Journey | Pass criteria |
|---------|---------------|
| Create quote → download PDF | PDF downloads without error; contains org and client name |
| Send quote → accept quote | Status shows `accepted` |
| Convert quote to invoice | Invoice created with matching line items |
| Mark invoice as paid | Status shows `paid`; activity shows payment event |
| Download invoice PDF | PDF downloads without error |

### 6.5 Billing & Subscription

| Journey | Pass criteria |
|---------|---------------|
| Access billing page | Shows current plan and usage |
| Click "Upgrade" | Redirects to Stripe Checkout (test mode) |
| Complete Stripe checkout | Returns to app; plan reflects upgrade |
| Access Stripe portal | Portal loads; cancel/update available |

### 6.6 Settings & RBAC

| Journey | Pass criteria |
|---------|---------------|
| Owner changes a member's role | Role updated; reflected in member list |
| Viewer visits restricted page | Redirected or shown 403 |
| Owner exports data (GDPR) | Download starts within 10 seconds |
| Owner deletes organisation | Confirmation modal → all data removed |

---

## 7. Security & RBAC Tests

These are a dedicated subset of integration tests focused on **data isolation and access control**. They are P0 and must pass before any PR merges.

### 7.1 Multi-Tenancy / RLS

Create two organisations (`org_a`, `org_b`) with one member each. Authenticate as `org_a` user and verify:

| Query / action | Expected result |
|----------------|----------------|
| List clients | Only `org_a` clients returned |
| Get client by ID (org_b client ID) | 404 or empty result |
| Update org_b client | No rows affected |
| Delete org_b client | No rows affected |
| List jobs | Only `org_a` jobs |
| List invoices | Only `org_a` invoices |
| Access org_b team member | Not found |

Repeat for each major entity: clients, properties, jobs, quotes, invoices, pipeline, checklists, tags, activities.

### 7.2 Role Enforcement Matrix

For each RBAC-protected action, test all five roles:

```
Roles: owner | admin | manager | operative | viewer
```

Document the expected result (✅ allowed / ❌ denied) for each action:

| Action | owner | admin | manager | operative | viewer |
|--------|-------|-------|---------|-----------|--------|
| `clients:write` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `clients:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `invoices:send` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `invoices:delete` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `billing:manage` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `team:manage` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `reports:view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `gdpr:export` | ✅ | ❌ | ❌ | ❌ | ❌ |

> **Note:** Populate this matrix from the `PERMISSIONS` constants in `src/lib/types/index.ts`. This table must be kept in sync whenever permissions change.

### 7.3 Input Validation & Injection

| Test case | Assertion |
|-----------|-----------|
| SQL injection in search param | Input sanitised; no SQL error |
| XSS payload in client name | Stored as literal text; rendered escaped |
| Oversized file upload | Rejected before processing |
| Malformed `Content-Type` on API route | Returns 400 |
| Unexpected extra fields in form data | Extra fields ignored; no error |

---

## 8. API & Webhook Tests

### 8.1 Health Check (`/api/health`)

| Test case | Assertion |
|-----------|-----------|
| GET `/api/health` | Returns `200 { status: 'ok' }` |
| Service degraded (mocked DB down) | Returns `503` |

### 8.2 Stripe Webhook (`/api/webhooks/stripe`)

This is the highest-risk API route. Use the existing test in `__checks__/stripe-webhook.spec.ts` as a reference and extend it.

| Test case | Assertion |
|-----------|-----------|
| Valid signature, `checkout.session.completed` | Subscription activated; org record updated |
| Valid signature, `customer.subscription.deleted` | Subscription cancelled; org record updated |
| Valid signature, `invoice.payment_succeeded` | Payment recorded |
| Invalid HMAC signature | Returns `400`; no DB changes |
| Duplicate event (idempotency) | Event processed once; second call returns `200` without re-processing |
| Unknown event type | Returns `200`; logged but ignored |
| Malformed JSON body | Returns `400` |

### 8.3 PDF Generation (`/api/invoices/[id]/pdf`, `/api/quotes/[id]/pdf`)

| Test case | Assertion |
|-----------|-----------|
| Valid invoice ID, authorised user | Returns `200`, `Content-Type: application/pdf` |
| Valid invoice ID, different org user | Returns `403` |
| Non-existent invoice ID | Returns `404` |
| Invoice with all field types (discount, tax, notes) | PDF content validates (no render error) |

### 8.4 Rate Limiting

| Test case | Assertion |
|-----------|-----------|
| Exceed rate limit on auth endpoint | Returns `429` after threshold |
| Rate limit resets after window | Requests succeed after window expires |

---

## 9. Performance Tests

Use **Playwright** with `page.metrics()` and custom timing marks, or integrate **k6** for load testing.

### 9.1 Page Load Budgets

| Page | Target (p95, LCP) |
|------|------------------|
| `/dashboard` | < 2 s |
| `/dashboard/clients` | < 2 s |
| `/dashboard/jobs` | < 2 s |
| `/dashboard/invoices` | < 2 s |
| `/dashboard/reports` | < 3 s |

### 9.2 Query Performance

Run `EXPLAIN ANALYZE` on the top 10 most frequently called queries (identified from PostHog + Supabase logs). Fail if:

- Any query takes > 200ms on a 10,000-row dataset
- Any query performs a sequential scan on a table > 1,000 rows without an index

### 9.3 Pagination Stability

| Test | Assertion |
|------|-----------|
| 10,000 clients, paginate through all pages | No duplicates, no missing records |
| Concurrent pagination requests | Results consistent across concurrent requests |

---

## 10. Test Data Management

### Principles

- Tests **never share mutable state** — each test seeds and tears down its own data
- Use **factory functions** rather than raw SQL inserts for readability and maintainability
- Production data **never** used in tests

### Factory Functions

Create `src/test/factories/` with one file per entity:

```ts
// src/test/factories/organisation.ts
export function createTestOrg(overrides = {}) {
  return {
    id: crypto.randomUUID(),
    name: 'Test Org',
    plan: 'starter',
    ...overrides,
  }
}

// src/test/factories/client.ts
export function createTestClient(orgId: string, overrides = {}) {
  return {
    id: crypto.randomUUID(),
    organisation_id: orgId,
    name: 'Test Client',
    email: `test-${Date.now()}@example.com`,
    ...overrides,
  }
}
```

### Seed Data

The existing `supabase/seed_business_test_data.sql` covers basic scenarios. Extend it to include:

- Two organisations (for cross-org RLS tests)
- One member per RBAC role in org_a
- At least 5 clients with properties, jobs, quotes, and invoices
- Pipeline entries across all stages

### Cleanup Strategy

- Integration tests: wrap each test in a DB transaction; rollback after
- E2E tests: use a dedicated `e2e` Supabase schema; reset between runs via `supabase db reset`

---

## 11. CI/CD Integration

### Updated `ci.yml`

Extend the existing workflow to include test stages:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  unit-and-integration:
    name: Unit & integration tests
    runs-on: ubuntu-latest
    services:
      supabase:
        image: supabase/postgres:15
        # ... local Supabase setup

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: coverage/lcov.info

  e2e:
    name: End-to-end tests
    runs-on: ubuntu-latest
    needs: unit-and-integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps chromium firefox
      - run: npm run test:e2e
        env:
          E2E_BASE_URL: http://localhost:3000
          E2E_OWNER_EMAIL: ${{ secrets.E2E_OWNER_EMAIL }}
          E2E_OWNER_PASSWORD: ${{ secrets.E2E_OWNER_PASSWORD }}
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  build-and-audit:
    name: Build & dependency audit
    runs-on: ubuntu-latest
    needs: unit-and-integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co' }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key' }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL || 'https://placeholder.example.com' }}
          NEXT_PUBLIC_POSTHOG_KEY: 'phc_placeholder'
          NEXT_PUBLIC_POSTHOG_HOST: 'https://eu.i.posthog.com'
      - run: npm audit --audit-level=high
```

### npm Scripts to Add

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:unit": "vitest run --reporter=verbose",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

### Pre-push Hook (optional, using Husky)

```bash
npx husky init
echo "npm run test:unit" > .husky/pre-push
```

---

## 12. Coverage Targets

Coverage is a floor, not a goal. Meeting targets does not equal quality — test behaviour, not lines.

| Layer | Metric | Minimum target | Ideal target |
|-------|--------|---------------|--------------|
| Unit (lib/\*) | Line coverage | 80% | 90% |
| Unit (components) | Branch coverage | 70% | 85% |
| Integration (actions) | All P0 actions covered | 100% | 100% |
| Integration (queries) | All queries covered | 80% | 90% |
| E2E | All P0/P1 journeys | 100% | 100% |
| Security (RLS) | All entity types | 100% | 100% |

**Exclusions from coverage:**
- `src/app/**/page.tsx` (Next.js route components — covered by E2E)
- `src/app/**/layout.tsx`
- `src/lib/supabase/` (thin wrappers — covered by integration tests)
- Generated type files

---

## 13. Test Environments

| Environment | Purpose | Database | Auth | Stripe |
|-------------|---------|----------|------|--------|
| **local** | Development, unit tests | Supabase local (`supabase start`) | Real Supabase Auth (local) | Stripe test mode |
| **ci** | All automated tests in GitHub Actions | Supabase local in Docker | Real Supabase Auth (local) | Stripe test mode with fixtures |
| **staging** | Manual QA, E2E smoke tests pre-release | Dedicated Supabase project | Real auth, test users | Stripe test mode |
| **production** | Checkly synthetic monitoring only | Production Supabase | Real auth | Live Stripe |

### Environment Variables for Tests

Add to `.env.test.local` (not committed):

```bash
# Local Supabase (from `supabase start` output)
TEST_SUPABASE_URL=http://localhost:54321
TEST_SUPABASE_ANON_KEY=<local-anon-key>
TEST_SUPABASE_SERVICE_KEY=<local-service-key>

# E2E test accounts (pre-created in local/staging DB)
E2E_OWNER_EMAIL=test-owner@example.com
E2E_OWNER_PASSWORD=TestPassword123!
E2E_VIEWER_EMAIL=test-viewer@example.com
E2E_VIEWER_PASSWORD=TestPassword123!

# Stripe test keys
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## 14. Defect Management

### Severity Classification

| Severity | Definition | SLA (fix to main) |
|----------|-----------|-------------------|
| **P0 — Critical** | Data loss, security breach, billing failure, production down | Same day |
| **P1 — High** | Core workflow broken for all users | 1 business day |
| **P2 — Medium** | Feature degraded, workaround exists | 3 business days |
| **P3 — Low** | Minor UX issue, edge case | Next sprint |

### Process

1. Failing test merged to `main` → immediately escalated to P0
2. Bug found in production → write a failing test that reproduces it **before** fixing
3. Flaky test → quarantine in `test.skip` within 24 hours; fixed or deleted within 1 sprint
4. New feature PR → must include tests as part of the PR, not as a follow-up

---

## 15. Roles & Responsibilities

| Role | Responsibility |
|------|---------------|
| **Developer** | Write unit and integration tests for all code they ship |
| **Head of QE** | Own this plan; review test coverage on PRs; define test priorities per sprint |
| **Tech Lead** | Approve toolchain changes; ensure testing doesn't block velocity |
| **DevOps / Platform** | Maintain CI pipeline; manage test environment secrets |
| **All engineers** | Fix failing tests before merging; do not disable tests without sign-off |

---

## Appendix A — Test File Structure

```
lustre/
├── src/
│   ├── lib/
│   │   ├── permissions.test.ts
│   │   ├── pagination.test.ts
│   │   ├── audit.test.ts
│   │   ├── actions/
│   │   │   └── __tests__/
│   │   │       ├── clients.test.ts
│   │   │       ├── jobs.test.ts
│   │   │       ├── quotes.test.ts
│   │   │       ├── invoices.test.ts
│   │   │       ├── rbac.test.ts
│   │   │       └── gdpr.test.ts
│   │   └── queries/
│   │       └── __tests__/
│   │           ├── clients.test.ts
│   │           ├── jobs.test.ts
│   │           ├── invoices.test.ts
│   │           └── analytics.test.ts
│   ├── components/
│   │   ├── ui/
│   │   │   └── PaginationControls.test.tsx
│   │   └── dashboard/
│   │       ├── Nav.test.tsx
│   │       ├── TagPicker.test.tsx
│   │       ├── JobsList.test.tsx
│   │       └── ClientsList.test.tsx
│   └── test/
│       ├── setup.ts
│       ├── factories/
│       │   ├── organisation.ts
│       │   ├── client.ts
│       │   ├── job.ts
│       │   ├── quote.ts
│       └── mocks/
│           ├── server.ts       (MSW server)
│           ├── handlers.ts     (MSW handlers)
│           └── supabase.ts     (Supabase mock helpers)
├── e2e/
│   ├── auth.setup.ts
│   ├── auth.spec.ts
│   ├── clients.spec.ts
│   ├── jobs.spec.ts
│   ├── quotes-invoices.spec.ts
│   ├── billing.spec.ts
│   ├── settings-rbac.spec.ts
│   └── security/
│       ├── rls.spec.ts
│       └── permissions.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

## Appendix B — Phase Rollout

Given that there are currently **zero automated tests** beyond Checkly monitoring, adopt a phased approach:

### Phase 1 — Foundation (Sprint 1–2)
- [ ] Install Vitest + Testing Library + Playwright
- [ ] Add `vitest.config.ts` and `playwright.config.ts`
- [ ] Add test scripts to `package.json`
- [ ] Create `src/test/setup.ts` and MSW server skeleton
- [ ] Write unit tests for `permissions.ts` and `pagination.ts` (highest ROI, pure functions)
- [ ] Write Stripe webhook integration test (P0 coverage)
- [ ] Add unit + integration test stage to `ci.yml`

### Phase 2 — Core Business Logic (Sprint 3–5)
- [ ] Integration tests for all P0 server actions (clients, jobs, quotes, invoices)
- [ ] RLS / multi-tenancy security tests
- [ ] E2E: auth flows + client management + quote-to-invoice lifecycle
- [ ] Factory functions for all major entities

### Phase 3 — Full Coverage (Sprint 6–8)
- [ ] Integration tests for all remaining server actions
- [ ] Component unit tests for all dashboard components
- [ ] E2E: billing, settings, RBAC matrix, GDPR
- [ ] Performance test baselines

### Phase 4 — Hardening (Ongoing)
- [ ] Visual regression tests for PDF outputs
- [ ] Load tests for pagination at scale
- [ ] Mutation testing (Stryker) to validate test quality
- [ ] Coverage enforcement gates in CI (fail if coverage drops)
