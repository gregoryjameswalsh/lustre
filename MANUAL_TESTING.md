# Lustre — Manual Test Scripts

**For:** Physical tester at a PC or iPhone
**App URL:** https://app.simplylustre.com
**Updated:** 2026-03-12

---

## How to Use These Scripts

- Work through scripts top to bottom within each section.
- Mark each step: **✅ Pass** | **❌ Fail** | **⚠️ Partial** | **➖ Skipped**
- On failure, note: what you did, what you saw, which browser/device.
- Scripts marked **📱** are mobile-specific (test on iPhone in Safari).
- Scripts marked **🖥** are desktop-specific.
- Scripts with no marker apply to both.

### Test Accounts to Prepare

| Account | Role | Email |
|---------|------|-------|
| Owner | Full access | owner@test.com |
| Admin | Full access minus billing | admin@test.com |
| Manager | Can create/edit jobs, quotes | manager@test.com |
| Operative | Can view and complete jobs | operative@test.com |
| Viewer | Read-only | viewer@test.com |

Create these accounts before testing. The Owner account is required for most scripts.

---

## Module Index

| # | Module | Approximate time |
|---|--------|-----------------|
| 1 | [Authentication](#1-authentication) | 15 min |
| 2 | [Onboarding](#2-onboarding) | 10 min |
| 3 | [Clients](#3-clients) | 20 min |
| 4 | [Properties](#4-properties) | 10 min |
| 5 | [Jobs](#5-jobs) | 20 min |
| 6 | [Quotes](#6-quotes) | 20 min |
| 7 | [Invoices](#7-invoices) | 20 min |
| 8 | [Pipeline](#8-pipeline) | 15 min |
| 9 | [Reports](#9-reports) | 10 min |
| 10 | [Settings — Team & Roles](#10-settings--team--roles) | 20 min |
| 11 | [Settings — Checklists & Tags](#11-settings--checklists--tags) | 15 min |
| 12 | [Settings — Billing](#12-settings--billing) | 10 min |
| 13 | [GDPR](#13-gdpr) | 10 min |
| 14 | [RBAC Access Control](#14-rbac-access-control) | 20 min |
| 15 | [Mobile Responsive](#15-mobile-responsive) | 20 min |
| 16 | [Edge Cases & Validation](#16-edge-cases--validation) | 15 min |

---

## 1. Authentication

### 1-A: Sign In — Happy Path

**Account:** Owner

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/login` | Page shows "Welcome back" heading, email field, password field | |
| 2 | Enter valid email and password, click **Sign in** | Spinner shows while loading | |
| 3 | Wait for redirect | Lands on `/dashboard` with nav visible | |
| 4 | Check browser tab | Title shows "Lustre" or similar (not an error page) | |

### 1-B: Sign In — Wrong Password

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/login` | Page loads | |
| 2 | Enter valid email, wrong password, click **Sign in** | Error message appears, stays on `/login` | |
| 3 | Inspect error message | Message does not reveal whether email exists | |

### 1-C: Sign In — Empty Fields

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/login`, leave both fields blank, click **Sign in** | Browser or inline validation prevents submit | |
| 2 | Enter email only, click **Sign in** | Validation error shown; not signed in | |

### 1-D: Forgot Password

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/login`, click **Forgot password** link | Lands on `/forgot-password` | |
| 2 | Enter the Owner email, submit | Success message shown (do not confirm email exists to attacker) | |
| 3 | Check email inbox | Reset email arrives within 2 min | |
| 4 | Click reset link | Lands on `/reset-password` | |
| 5 | Enter and confirm new password, submit | Redirected to `/login` or `/dashboard` | |
| 6 | Sign in with the new password | Success | |

### 1-E: Sign Out

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Owner, go to `/dashboard` | Signed in | |
| 2 | Click sign-out option in the nav | Redirected to `/login` | |
| 3 | Try to navigate to `/dashboard` directly | Redirected back to `/login` | |

### 1-F: Invite Flow

**Requires:** Owner account and a fresh email address to invite.

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Owner, go to `/dashboard/settings/team` | Team page loads | |
| 2 | Enter a new email in the Invite form, select role **Manager**, click **Invite** | Success message; invite appears in Pending Invitations list | |
| 3 | Open the invited email account and find the invitation email | Email arrived | |
| 4 | Click the invite link | Lands on `/invite/[token]` page | |
| 5 | Complete sign-up (name + password if prompted) | Redirected to `/dashboard` | |
| 6 | Check the new account's nav | Shows Manager-level access only | |
| 7 | Back in Owner account, go to `/dashboard/settings/team` | New member listed, invite removed from Pending | |

### 1-G: Expired Invite Link

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Use an invite link that is more than 7 days old (or manually edit the token) | Error page or "Link expired" message shown | |
| 2 | Check URL | Does not land on `/dashboard` | |

---

## 2. Onboarding

**Account:** Use a brand-new sign-up (not an existing org).

### 2-A: Complete Onboarding Wizard

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign up at `/signup` | Redirected to `/onboarding` | |
| 2 | **Step 1 — Business Profile:** progress bar shows step 1 active | Step 1 visible | |
| 3 | Fill in business name and any other required fields, click Next | Progress bar advances to Step 2 | |
| 4 | **Step 2 — Services:** configure services or skip | Advances to Step 3 | |
| 5 | **Step 3 — Your Team:** invite or skip | Advances to Step 4 | |
| 6 | **Step 4 — First Client:** fill in client details or skip | Redirected to `/dashboard` | |
| 7 | Check dashboard | Nav shows all main sections: Clients, Jobs, Quotes, Invoices, Pipeline, Reports | |

### 2-B: Resume Onboarding

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | During onboarding, close the tab at Step 2 | Session preserved | |
| 2 | Sign back in | Redirected back to onboarding at Step 2 (not Step 1) | |

---

## 3. Clients

### 3-A: Create a Client

**Account:** Owner or Manager

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/clients/new` | "New Client" form loads | |
| 2 | Leave First Name blank, click **Save Client** | Validation error; form not submitted | |
| 3 | Fill in: First Name = `Test`, Last Name = `User`, Email = valid email, Phone = 01234 567890, Source = `Google`, Status = `Active` | Form fills without error | |
| 4 | Add a note in the Notes field | Text appears | |
| 5 | Click **Save Client** | Redirected to client detail page or clients list | |
| 6 | Find the new client in `/dashboard/clients` | `Test User` listed | |

### 3-B: View Client Detail

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Click on `Test User` in the clients list | Lands on `/dashboard/clients/[id]` | |
| 2 | Verify sections visible | Personal details, Properties, Jobs, Quotes, Invoices, Activity timeline all visible | |
| 3 | Activity timeline | Shows "Client created" event with timestamp | |

### 3-C: Edit a Client

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | From client detail, click **Edit** | Lands on `/dashboard/clients/[id]/edit` | |
| 2 | Change Last Name to `Person`, click **Save** | Redirected back to detail page | |
| 3 | Verify change | Name now shows `Test Person` | |
| 4 | Check activity timeline | "Client updated" event visible | |

### 3-D: Search and Filter Clients

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/clients` | List of clients shown | |
| 2 | Type `Test` in the search box | List filters to clients whose name or email contains "Test" | |
| 3 | Clear search, filter by Status = `Lead` | Only lead clients shown | |
| 4 | Clear all filters | Full list restored | |

### 3-E: Client Pagination

*Skip if fewer than ~20 clients exist in the account.*

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/clients` with 20+ clients | First page loads | |
| 2 | Click **Next** (pagination control) | Next page loads; different clients shown | |
| 3 | Click **Previous** | Returns to first page; same clients as before | |
| 4 | Check no duplicate clients appear across pages | No repeats visible | |

### 3-F: Tag a Client

**Requires:** At least one tag created in Settings → Tags (see Module 11).

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open client detail for `Test Person` | Detail page visible | |
| 2 | Open the tag picker, select a tag | Tag appears on client card | |
| 3 | Reload the page | Tag still shown | |
| 4 | Remove the tag | Tag disappears | |

### 3-G: Delete a Client

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open a client who has no linked jobs or invoices | Client detail visible | |
| 2 | Locate the delete/remove action | Confirmation prompt shown | |
| 3 | Confirm deletion | Redirected to `/dashboard/clients` | |
| 4 | Search for the deleted client | Not found | |

---

## 4. Properties

### 4-A: Add a Property to a Client

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open `Test Person` client detail, click **Add Property** | Lands on `/dashboard/clients/[id]/properties/new` | |
| 2 | Fill in Address Line 1 = `10 Test Street`, Town = `Testville`, Postcode = `TE1 1ST` | Fields fill without error | |
| 3 | Click **Save** | Redirected to client detail or property detail | |
| 4 | Property listed on client detail | `10 Test Street` shown | |

### 4-B: Edit a Property

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Click on the property, then **Edit** | Lands on `/dashboard/clients/[id]/properties/[id]/edit` | |
| 2 | Change Town to `Newtown`, save | Change reflected on property detail | |

---

## 5. Jobs

### 5-A: Schedule a Job

**Requires:** At least one active client with a property.

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/jobs/new` | "Schedule Job" form loads | |
| 2 | Select Client = `Test Person` | Property dropdown populates with that client's properties | |
| 3 | Select property `10 Test Street` | Property selected | |
| 4 | Select Job Type (if any configured) | Field fills | |
| 5 | Set Date = tomorrow, Time = 09:00, Duration = 3 hours, Price = 120.00 | Fields fill | |
| 6 | Add Notes = `Bring extra supplies`, Internal Notes = `Key code: 1234` | Fields fill | |
| 7 | Click **Schedule Job** | Redirected to job detail page | |
| 8 | Verify job detail | Shows client, property, date, time, price, notes | |

### 5-B: Create a Job Without a Property

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/jobs/new`, select a client but no property | Property field shows "— Select property —" | |
| 2 | Click **Schedule Job** | Validation error: "Please select a client and property." shown; no redirect | |

### 5-C: Update Job Status

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open the job created in 5-A | Status shows `Scheduled` | |
| 2 | Change status to `In Progress` | Status updates immediately | |
| 3 | Change status to `Completed` | Status updates | |
| 4 | Check activity timeline | Status change events visible with timestamps | |

### 5-D: Checklist on a Job

**Requires:** A checklist template attached to the job type (see Module 11).

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open a job with a linked checklist | Checklist section visible with items listed | |
| 2 | Tick a checklist item | Checkbox ticks; item visually marked done | |
| 3 | Reload the page | Ticked item remains ticked | |
| 4 | Tick all items | All items complete; section shows completion state | |

### 5-E: Edit a Job

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | From job detail, click **Edit** | Lands on `/dashboard/jobs/[id]/edit` | |
| 2 | Change Price to 150.00, save | Price updated on job detail | |
| 3 | Activity timeline | Shows edit event | |

### 5-F: Jobs List — Filter and Pagination

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/jobs` | Jobs list loads | |
| 2 | Filter by Status = `Scheduled` | Only scheduled jobs shown | |
| 3 | Filter by Date range (last 7 days) | Only jobs in range shown | |
| 4 | Clear filters | Full list restored | |

---

## 6. Quotes

### 6-A: Create a Quote

**Account:** Owner or Manager

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/quotes/new` | "New Quote" form loads with client selector | |
| 2 | Select Client = `Test Person` | Client selected | |
| 3 | Add a line item: Description = `Deep Clean`, Quantity = 1, Unit Price = 200.00 | Line item row appears with subtotal | |
| 4 | Add a second line item: Description = `Oven Clean`, Quantity = 1, Unit Price = 50.00 | Second row appears | |
| 5 | Verify subtotal | Shows £250.00 | |
| 6 | If VAT is enabled, verify VAT row | VAT calculated correctly | |
| 7 | Add notes if available | Notes fill | |
| 8 | Click **Save Quote** | Redirected to quote detail page | |
| 9 | Verify quote detail | Shows client name, both line items, correct total | |

### 6-B: Download Quote PDF

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open quote detail | Quote visible | |
| 2 | Click **Download PDF** | File download begins within 5 seconds | |
| 3 | Open the PDF | Contains: business name, client name, line items, total, quote number | |
| 4 | Check PDF is not blank or corrupt | All sections readable | |

### 6-C: Send a Quote

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open the quote from 6-A | Status shows `Draft` | |
| 2 | Click **Send** | Confirmation prompt or immediate status change | |
| 3 | Status updates | Shows `Sent` | |
| 4 | Check email inbox of client (`Test Person`'s email) | Quote email arrives with PDF attached or link | |
| 5 | Activity timeline | "Quote sent" event shown | |

### 6-D: Accept a Quote (Simulate Client)

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Find the public quote URL from the sent email or quote detail | `/q/[token]` page | |
| 2 | Open that URL in an incognito window (no login required) | Quote rendered cleanly for client | |
| 3 | Click **Accept** | Confirmation shown to client | |
| 4 | Back in the dashboard, open the quote | Status shows `Accepted` | |

### 6-E: Convert Quote to Invoice

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open an `Accepted` quote | Quote detail visible | |
| 2 | Click **Create Invoice** | Redirected to `/dashboard/invoices/new?quote_id=[id]` | |
| 3 | Line items and client pre-populated | Matches quote | |
| 4 | Confirm totals match the quote | Same amounts | |
| 5 | Click **Save Invoice** | Redirected to invoice detail | |

---

## 7. Invoices

### 7-A: Create an Invoice Manually

**Account:** Owner or Manager

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/invoices/new` | "New Invoice" form loads | |
| 2 | Select Client = `Test Person` | Client selected | |
| 3 | Add line item: `Window Cleaning`, Qty 2, Unit Price 40.00 | Subtotal = £80.00 | |
| 4 | Set a due date 30 days from today | Date field fills | |
| 5 | Click **Save Invoice** | Redirected to invoice detail | |
| 6 | Verify status | Shows `Draft` | |

### 7-B: Download Invoice PDF

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open invoice detail | Invoice visible | |
| 2 | Click **Download PDF** | PDF downloads within 5 seconds | |
| 3 | Open PDF | Contains: invoice number, business name, client name, line items, total, due date | |
| 4 | PDF not blank | All text readable | |

### 7-C: Send an Invoice

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open a `Draft` invoice | Status = `Draft` | |
| 2 | Click **Send** | Status updates to `Sent` | |
| 3 | Client email receives invoice | Email with PDF or link arrived | |

### 7-D: Mark Invoice as Paid

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open a `Sent` invoice | Status = `Sent` | |
| 2 | Click **Mark as Paid** | Confirmation or immediate update | |
| 3 | Status updates | Shows `Paid` | |
| 4 | Activity timeline | "Invoice paid" event shown | |

### 7-E: Invoice List and Filters

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/invoices` | Invoice list loads | |
| 2 | Filter by Status = `Paid` | Only paid invoices shown | |
| 3 | Filter by client = `Test Person` | Only that client's invoices | |
| 4 | Clear filters | Full list restored | |

---

## 8. Pipeline

### 8-A: View Kanban Board

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/pipeline` | Kanban board loads with columns (pipeline stages) | |
| 2 | Header shows lead count | Number displayed above board | |

### 8-B: Add a Lead from Pipeline

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Click **Add Lead** (or **+** button on first stage) | Redirected to `/dashboard/clients/new?status=lead&stage_id=[id]&from=pipeline` | |
| 2 | Fill in name and details, set Status = `Lead` | Form fills | |
| 3 | Click **Save Client** | Redirected back to Pipeline | |
| 4 | New card visible in the first pipeline stage | Lead card shown | |

### 8-C: Move a Lead Between Stages 🖥

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | On the Kanban board, drag a lead card to the next stage | Card moves to new column | |
| 2 | Reload the page | Card remains in the new stage | |

### 8-D: Convert Lead to Active Client

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open a lead card on the pipeline | Lead detail or edit view | |
| 2 | Change Status from `Lead` to `Active` | Saves successfully | |
| 3 | Return to pipeline | Card no longer appears on pipeline | |
| 4 | Go to `/dashboard/clients` | Client appears with Active status | |

---

## 9. Reports

### 9-A: Reports Page Loads

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/reports` | Page loads without error | |
| 2 | Check key metrics visible | Revenue, jobs, clients — at least some data visible if account has records | |
| 3 | Check for any "NaN", "undefined", or blank values in currency fields | None found | |

### 9-B: Date Range Filtering

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Change report date range to "Last 30 days" | Metrics update | |
| 2 | Change to "Last 12 months" | Metrics update | |
| 3 | Set a custom date range to a period with no data | Shows zeros or empty state, no error | |

---

## 10. Settings — Team & Roles

### 10-A: View Team Members

**Account:** Owner or Admin

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/settings/team` | Team members listed with name, email, and role | |
| 2 | Check seat limit display | Current seat count vs plan limit shown | |

### 10-B: Change a Member's Role

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Find the Manager account in the team list | Row visible | |
| 2 | Change their role to `Operative` using the role dropdown | Dropdown updates; change saves | |
| 3 | Reload the page | Member still shows `Operative` | |
| 4 | Change back to `Manager` | Restored | |

### 10-C: Suspend a Member

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Find the Operative account, click **Suspend** | Confirmation prompt | |
| 2 | Confirm | Member marked as suspended in list | |
| 3 | Try to sign in as that account | Sign in blocked or session revoked | |
| 4 | Unsuspend the member | Member active again; can sign in | |

### 10-D: Create a Custom Role

**Account:** Admin only

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/settings/roles/new` | "New role" form loads | |
| 2 | Enter Role Name = `Supervisor` | Field fills | |
| 3 | Enable specific permissions (e.g., `clients:read`, `jobs:write`) | Checkboxes toggle | |
| 4 | Click **Save** | Redirected to roles list or role detail | |
| 5 | `Supervisor` role appears in roles list | Role visible | |
| 6 | Go to team settings, assign `Supervisor` to a member | Role applied | |

### 10-E: Revoke Pending Invitation

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Send an invite from team settings (don't accept it) | Appears in Pending Invitations | |
| 2 | Click **Revoke** next to the pending invite | Invite removed from list | |
| 3 | Try the original invite link | Error page — link no longer valid | |

---

## 11. Settings — Checklists & Tags

### 11-A: Create a Checklist Template

**Account:** Owner or Admin

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/settings/checklists/new` | Checklist creation form loads | |
| 2 | Enter Template Name = `Standard Clean` | Field fills | |
| 3 | Select applicable job types (if any) | Job type(s) highlighted | |
| 4 | In the items section, fill Item 1: Title = `Hoover all floors`, Guidance = `Use HEPA filter` | Fields fill | |
| 5 | Click **Add Item** | New blank item row appears | |
| 6 | Fill Item 2: Title = `Clean kitchen surfaces` | Field fills | |
| 7 | Click **Save** | Redirected to checklists list | |
| 8 | `Standard Clean` appears in list | Template visible | |

### 11-B: Reorder Checklist Items

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open `Standard Clean` template | Items listed in order | |
| 2 | Drag Item 2 above Item 1 (drag handle visible) | Order swaps | |
| 3 | Save | New order persists on reload | |

### 11-C: Create a Tag

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/settings/tags` | Tags list loads | |
| 2 | Enter Tag Name = `VIP`, optionally pick a colour | Fields fill | |
| 3 | Click **Add Tag** | Tag appears in list | |
| 4 | Go to a client, use the tag picker | `VIP` tag available to select | |

### 11-D: Job Types

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/settings/job-types` | Job types list loads | |
| 2 | Add a new type: `Deep Clean` | Type appears in list | |
| 3 | Go to `/dashboard/jobs/new` | `Deep Clean` available in Job Type dropdown | |

---

## 12. Settings — Billing

**Account:** Owner only (Admin and below cannot access billing)

### 12-A: Billing Page Access

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Owner, go to `/dashboard/settings/billing` | Billing page loads | |
| 2 | Current plan displayed | Plan name and seat usage visible | |
| 3 | Sign in as Admin, navigate to `/dashboard/settings/billing` | Redirected away or permission denied | |

### 12-B: Upgrade Plan (Stripe Test Mode)

*Only run this if the account is in Stripe test mode.*

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Click **Upgrade** on billing page | Redirected to Stripe Checkout | |
| 2 | Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVC | Checkout form accepts card | |
| 3 | Complete checkout | Redirected back to app | |
| 4 | Return to billing page | Plan reflects upgrade | |

### 12-C: Stripe Customer Portal

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Click **Manage Billing** or **Customer Portal** | Redirected to Stripe portal page | |
| 2 | Portal loads | Can see subscription details, payment method | |
| 3 | Close / return to app | Returns to Lustre billing page | |

---

## 13. GDPR

**Account:** Owner only

### 13-A: Export Organisation Data

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/settings/gdpr` | GDPR page loads with Export and Delete options | |
| 2 | Click **Export Data** | Download starts within 10 seconds | |
| 3 | Open downloaded file | Contains data for clients, jobs, invoices — all from current org only | |
| 4 | Confirm no data from other organisations in the file | Cross-org data absent | |

### 13-B: Delete Organisation

**WARNING: Only run this on a test account you are willing to permanently delete.**

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Click **Delete Organisation** | Multi-step confirmation shown | |
| 2 | Type the confirmation phrase if required | Field accepts input | |
| 3 | Confirm deletion | Logged out; redirected to login or landing page | |
| 4 | Try to sign in with that account | Account no longer accessible or shows deleted state | |

---

## 14. RBAC Access Control

Run each sub-test logged in as the specified role.

### 14-A: Viewer — Read-Only Enforcement

**Account:** Viewer

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Viewer, go to `/dashboard/clients` | Can see client list | |
| 2 | Try to go to `/dashboard/clients/new` | Redirected or shown 403/permission error | |
| 3 | Try to go to `/dashboard/jobs/new` | Redirected or blocked | |
| 4 | Try to go to `/dashboard/settings/team` | Redirected or blocked | |
| 5 | Try to go to `/dashboard/settings/billing` | Redirected or blocked | |
| 6 | Open an existing client | Can view detail but no Edit or Delete buttons visible | |

### 14-B: Operative — Limited Write Access

**Account:** Operative

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Operative | Dashboard loads | |
| 2 | View assigned jobs | Jobs visible | |
| 3 | Update a job status on an assigned job | Status updates successfully | |
| 4 | Try to go to `/dashboard/clients/new` | Blocked or redirect | |
| 5 | Try to go to `/dashboard/invoices/new` | Blocked or redirect | |
| 6 | Try to go to `/dashboard/settings/billing` | Blocked | |

### 14-C: Manager — Moderate Access

**Account:** Manager

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Manager | Dashboard loads | |
| 2 | Create a new client | Succeeds | |
| 3 | Create a quote | Succeeds | |
| 4 | Try to access billing settings | Blocked | |
| 5 | Try to invite a new team member | Blocked (team management reserved for Owner/Admin) | |
| 6 | Try to delete a client | Blocked | |

### 14-D: Cross-Organisation Data Isolation

*This requires two separate test organisations, each with an owner.*

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in as Owner of Org A | Dashboard shows Org A data | |
| 2 | Note a client ID from Org B (from URL if you know it) | ID noted | |
| 3 | Try to navigate to `/dashboard/clients/[org-b-client-id]` | 404 or empty result — Org B client NOT shown | |
| 4 | Client list | Only Org A clients shown | |
| 5 | Invoice list | Only Org A invoices shown | |

---

## 15. Mobile Responsive 📱

Run all steps on iPhone Safari unless otherwise noted.

### 15-A: Login and Navigation

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open `/login` on iPhone Safari | Page fits screen, no horizontal scroll | |
| 2 | Tap email field | Keyboard appears; field accepts input | |
| 3 | Sign in | Redirected to `/dashboard` | |
| 4 | Check navigation | Mobile nav / hamburger menu accessible | |
| 5 | Tap through: Clients, Jobs, Quotes, Invoices, Pipeline | Each page loads without layout breakage | |

### 15-B: Create Client on Mobile

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Navigate to `/dashboard/clients/new` on iPhone | Form loads, fields stack vertically | |
| 2 | Fill in all fields using mobile keyboard | All fields accessible and tappable | |
| 3 | Tap **Save Client** | Saves and redirects correctly | |

### 15-C: Schedule Job on Mobile

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Navigate to `/dashboard/jobs/new` | Form loads correctly | |
| 2 | Select client from dropdown | Dropdown works on touch | |
| 3 | Set date using native date picker | Picker opens; date selectable | |
| 4 | Tap **Schedule Job** | Job created | |

### 15-D: PDF Download on Mobile

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open an invoice, tap **Download PDF** | PDF opens in Safari or Files app | |
| 2 | Check PDF content | Readable, not corrupted | |

### 15-E: Pipeline Kanban on Mobile

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Go to `/dashboard/pipeline` | Kanban columns visible (may scroll horizontally) | |
| 2 | Scroll left/right | Columns scroll smoothly | |
| 3 | Attempt to drag a card | Drag works or a fallback tap-to-move option exists | |

### 15-F: Viewport and Readability

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | On any dashboard page, rotate iPhone to landscape | Layout adapts; no cut-off text | |
| 2 | Check font sizes | All text readable without zooming | |
| 3 | Check buttons and tap targets | All buttons tappable without mis-tapping adjacent elements | |

---

## 16. Edge Cases & Validation

### 16-A: Empty States

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign into a brand-new org with no data | Dashboard shows empty state messages (not blank white areas or errors) | |
| 2 | Go to `/dashboard/jobs` with no jobs | "No jobs yet" or similar message | |
| 3 | Go to `/dashboard/invoices` with no invoices | Empty state message | |
| 4 | Reports page with no data | Shows zeros or "no data" — not NaN or blank | |

### 16-B: Long Text / Large Inputs

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Create a client with a 100-character first name | Either saved and displayed truncated, or input length validation shown | |
| 2 | Add 500-character notes to a client | Text saved; no layout overflow | |
| 3 | Create a quote line item with a 200-character description | Saved; PDF renders without truncation error | |

### 16-C: Concurrent Browser Tabs

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Open the same client in two browser tabs | Both tabs show the same data | |
| 2 | Edit and save in Tab A | Tab A shows updated data | |
| 3 | Reload Tab B | Tab B shows updated data | |

### 16-D: Network / Slow Connection 🖥

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | In Chrome DevTools, throttle network to "Slow 3G" | Settings: F12 → Network → Throttling | |
| 2 | Submit a "Create Job" form | Button shows loading/disabled state; no double-submit possible | |
| 3 | Wait for success | Job created once (not duplicated) | |
| 4 | Remove throttle | App returns to normal speed | |

### 16-E: Session Expiry

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Sign in, then clear cookies in DevTools | Session gone | |
| 2 | Try to navigate to `/dashboard/clients` | Redirected to `/login` | |
| 3 | Sign in again | Returns to `/dashboard` | |

### 16-F: Back Button After Actions

| Step | Action | Expected result | ✅/❌ |
|------|--------|----------------|-------|
| 1 | Create a new client, get redirected to client list | Client list visible | |
| 2 | Press browser Back button | Returns to new client form or previous page — does not re-submit the form | |
| 3 | Check client list | No duplicate client created | |

---

## Sign-Off Sheet

| Tester | Device | Browser | Date | Modules passed | Failures |
|--------|--------|---------|------|---------------|---------|
| | PC | Chrome | | | |
| | PC | Firefox | | | |
| | PC | Safari | | | |
| | iPhone | Safari | | | |

### Release Gate

A release to production is **blocked** if any of the following fail:

- [ ] Any test in Module 1 (Authentication)
- [ ] Any test in Module 14 (RBAC Access Control)
- [ ] Module 6-B or 7-B (PDF downloads)
- [ ] Module 12-B (Stripe checkout)
- [ ] Any test marked P0 in the automated plan (TESTING.md)

All other failures must be logged as issues and triaged before closing the test cycle.
