# BA Report: Checklist Feature & Job Type Management
## Lustre — CRM & Operations Platform for Cleaning & Property Maintenance Services

**Document Type:** Business Analyst Requirements Report
**Prepared by:** Chief Product Officer (with BA & COO input)
**Version:** 2.0
**Date:** 7 March 2026
**Status:** Draft for Stakeholder Review

> **Version 2.0 Change Note:** Expanded to include dynamic Job Type management, replacing the hardcoded `ServiceType` enum. This was identified as a prerequisite for the checklist template association model and delivers independent value by allowing organisations to define service types relevant to their specific business.

---

## 1. Executive Summary

### 1.1 Business Context

Lustre serves cleaning and property maintenance businesses as their central operations platform. These businesses are commercially and reputationally accountable for the standard of work delivered at client properties. Without a structured, time-stamped record of what was cleaned, inspected, or completed on each job visit, they face:

- Exposure to client disputes with no evidence to counter claims
- Inability to demonstrate due diligence or quality consistency
- No systematic mechanism for maintaining service standards across a distributed field team

### 1.2 Problem Statement

Currently, Lustre's job model captures scheduling, assignment, and status, but provides no structured mechanism for:

1. Defining *what work must be performed* for a given service type
2. Enabling field operatives to confirm task-by-task completion during a job
3. Capturing photographic evidence of completed work
4. Generating a retrievable completion record for quality assurance and client dispute resolution

Cleaning companies operating at scale rely on checklists as their primary quality control tool. The absence of this capability creates a feature gap that competitors may exploit, and that progressive customers will eventually cite as a reason to seek an alternative platform.

### 1.3 Proposed Solution

Implement a two-tier checklist system:

- **Tier 1 — Template Management:** Admins define reusable checklist templates, linked to one or more job service types, containing ordered items with optional guidance notes.
- **Tier 2 — Job Checklist Completion:** When a job moves to `in_progress`, a checklist is automatically instantiated from the relevant template. Team members check off items and optionally attach photos as evidence, creating an immutable, timestamped completion record.

### 1.4 Expected Business Value

- Reduces client dispute resolution time by providing timestamped, photographic evidence per job
- Increases team accountability and consistency of service delivery
- Positions Lustre as a more complete field operations tool — supporting upsell to higher subscription tiers
- Creates a data foundation for future quality reporting (completion rates, skipped items, team performance)

---

## 2. Current State Analysis

### 2.1 System Overview

Lustre is a multi-tenant B2B SaaS application built on **Next.js 16 + React 19 + TypeScript**, with **Supabase** (PostgreSQL + Auth + Storage) as the data and authentication platform, hosted on Vercel.

### 2.2 Job Entity (Current)

The `jobs` table is the core operational entity. Current fields:

| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| organisation_id | uuid | Tenant FK (RLS enforced) |
| client_id | uuid | FK to clients |
| property_id | uuid \| null | FK to properties |
| assigned_to | uuid \| null | FK to profiles (team member) |
| service_type | enum | `regular \| deep_clean \| move_in \| move_out \| post_event \| other` |
| status | enum | `scheduled → in_progress → completed \| cancelled` |
| scheduled_date | date | |
| scheduled_time | time \| null | |
| duration_hours | numeric \| null | |
| price | integer \| null | GBP pence |
| notes | text \| null | Client-facing |
| internal_notes | text \| null | Team-only |

### 2.3 Role Model (Current)

| Role | Capabilities |
|------|-------------|
| **admin** | Full CRUD; delete (audit-logged); team management; settings |
| **team_member** | Read/create/update; cannot delete; cannot access team settings |

### 2.4 What Does Not Exist Today

- No checklist template concept (no DB table, no UI, no API)
- No job-level checklist instance or completion tracking
- No file/photo upload functionality anywhere in the application
- Supabase Storage is configured (`file_size_limit = 50MiB`) but has zero utilisation

### 2.5 Existing Patterns to Leverage

| Pattern | Location | Relevance |
|---------|----------|-----------|
| Server actions with auth guard | `src/lib/actions/` | All checklist mutations follow this pattern |
| `getOrgAndUser()` / `requireAdmin()` | `src/lib/actions/_auth.ts` | Auth context for new actions |
| `logAuditEvent()` | `src/lib/audit.ts` | Audit all template mutations |
| `revalidatePath()` | Throughout actions | Cache invalidation after mutations |
| Denormalised `organisation_id` on child rows | `quote_line_items` | Same pattern for `checklist_template_items` and `job_checklist_items` |
| Soft-delete via status field | `clients.status` | Same pattern for `checklist_templates.is_active` |
| RLS via `get_user_org_id()` | All existing tables | Apply identical policy to all new tables |

---

## 3. Requirements

### 3.1 Functional Requirements — Template Management (FR-T)

| ID | Requirement |
|----|-------------|
| FR-T1 | Admins must be able to create a checklist template with a name, optional description, and one or more associated service types |
| FR-T2 | Admins must be able to add, edit, reorder, and remove items within a template |
| FR-T3 | Each template item must have a **title** (required, max 500 chars) and an optional **guidance note** (max 2000 chars) shown as hint text to the team member |
| FR-T4 | Items must support manual ordering; sort order persists and is respected when the checklist is instantiated on a job |
| FR-T5 | A template must be **activatable/deactivatable** without deletion, to preserve historical job references |
| FR-T6 | Admins must be able to **duplicate** an existing template as a starting point |
| FR-T7 | A template with no associated job history may be **hard-deleted**; templates referenced by any job checklist may only be deactivated |
| FR-T8 | Multiple templates may be associated with the same service type; if so, admins select which template applies on the job detail page |
| FR-T9 | All template create/update/deactivate/delete operations must be captured in the audit log |

### 3.2 Functional Requirements — Job Checklist Completion (FR-J)

| ID | Requirement |
|----|-------------|
| FR-J1 | When a job transitions to `in_progress`, the system must automatically instantiate a checklist from the active template for that job's `service_type` (if exactly one active template exists for that type) |
| FR-J2 | If multiple active templates exist for a service type, the admin/team member must select which template to apply before the checklist is instantiated |
| FR-J3 | If no active template exists for a job's service type, no checklist is created and the checklist UI section is not shown |
| FR-J4 | Team members must be able to view the job checklist on the job detail page |
| FR-J5 | Team members must be able to **check** individual items as complete; each check records a UTC timestamp and the actor's profile ID |
| FR-J6 | Team members must be able to **uncheck** an item if checked in error — only while the job is `in_progress` |
| FR-J7 | Team members must be able to **attach one or more photos** to any checklist item |
| FR-J8 | Photos must be stored in Supabase Storage (private bucket) and accessible via short-lived signed URLs |
| FR-J9 | Team members must be able to **view photos** in an expanded/lightbox modal from within the checklist |
| FR-J10 | The job detail page must display **checklist progress** (e.g., "7 of 12 items complete") |
| FR-J11 | The system must display a **warning** (not a blocker) when a team member attempts to mark a job `completed` with incomplete checklist items |
| FR-J12 | Once a job reaches `completed` or `cancelled`, all checklist items and photos become **read-only** |
| FR-J13 | Admins must be able to view the full completed checklist (items, completion actors, timestamps, photos) on any job |

### 3.3 Non-Functional Requirements (NFR)

| ID | Requirement |
|----|-------------|
| NFR-1 | All new tables must have RLS enabled, scoped to `organisation_id = get_user_org_id()` |
| NFR-2 | Photos must be stored in a **private Supabase Storage bucket** — access via signed URLs only, never public URLs |
| NFR-3 | Photo storage paths must use org-level namespacing (`/{organisation_id}/checklists/{item_id}/{filename}`) as defence-in-depth |
| NFR-4 | Signed URL TTL must be appropriate for the use case (suggest 1 hour for job page views) |
| NFR-5 | Accepted photo formats: **JPEG, PNG, HEIC, WebP**; maximum **10 MB per photo** |
| NFR-6 | Checklist item check/uncheck must use **optimistic UI** — reflected immediately, confirmed server-side |
| NFR-7 | Checklist section must not degrade load time for jobs **without** a checklist |
| NFR-8 | Completion records must be effectively **immutable** once a job is `completed` (enforced at application layer and RLS) |
| NFR-9 | Photo uploads must provide progress feedback to the user |

---

## 4. User Stories

### 4.1 Admin — Template Setup & Maintenance

| ID | Story |
|----|-------|
| US-A1 | As an admin, I want to create a checklist template for a specific service type so that team members always follow the same process for that job type |
| US-A2 | As an admin, I want to add items to a template with a title and optional guidance note so that team members know exactly what each task requires |
| US-A3 | As an admin, I want to reorder checklist items so that the checklist follows a logical room-by-room or task-sequence flow |
| US-A4 | As an admin, I want to deactivate a template without deleting it so that historical job records retain accurate completion data |
| US-A5 | As an admin, I want to duplicate an existing template so that I can create a variation without rebuilding from scratch |
| US-A6 | As an admin, I want to see which service types have active templates and which do not, so that I can ensure all job types are covered |

### 4.2 Admin — Quality Review

| ID | Story |
|----|-------|
| US-A7 | As an admin, I want to see the checklist completion status on a completed job so that I can verify the team performed all required tasks |
| US-A8 | As an admin, I want to view photos attached to checklist items so that I can review photographic evidence of completed work |
| US-A9 | As an admin, I want to see who completed each checklist item and when so that I have a full audit trail for dispute resolution |

### 4.3 Team Member — Job Execution

| ID | Story |
|----|-------|
| US-TM1 | As a team member, when I mark a job "In Progress" I want to see the checklist automatically so that I know what tasks I need to complete |
| US-TM2 | As a team member, I want to check off each item as I complete it so that I can track my own progress through the job |
| US-TM3 | As a team member, I want to read the guidance note on a checklist item so that I know the standard expected for that task |
| US-TM4 | As a team member, I want to attach a photo to a checklist item as evidence of completion so that there is a record if a client raises a query |
| US-TM5 | As a team member, I want to see an overall progress indicator (e.g., "8 of 12 complete") so that I can quickly assess how much remains |
| US-TM6 | As a team member, if I accidentally check an item, I want to be able to uncheck it so that the record stays accurate |
| US-TM7 | As a team member, I want to be warned (but not blocked) if I try to complete a job with unchecked items so that I have a chance to review what was missed |

---

## 5. Data Model Design

### 5.1 New Tables

#### `checklist_templates`

Reusable template definitions, owned by an organisation, associated with one or more service types.

```sql
CREATE TABLE checklist_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description      text        CHECK (char_length(description) <= 1000),
  service_types    text[]      NOT NULL DEFAULT '{}',
  -- Array of ServiceType enum values: regular | deep_clean | move_in | move_out | post_event | other
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_templates_org_active
  ON checklist_templates (organisation_id, is_active);
```

**Design decisions:**
- `service_types text[]` array — simpler than a junction table for the common single-type case; also supports one template covering multiple types (e.g., `move_in` + `move_out`)
- `is_active` enables soft-deletion; templates with job history cannot be hard-deleted
- `created_by` set null on profile deletion to preserve template

---

#### `checklist_template_items`

Ordered line items within a template.

```sql
CREATE TABLE checklist_template_items (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid    NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  -- Denormalised for efficient RLS (matches existing quote_line_items pattern)
  template_id      uuid    NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  title            text    NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  guidance         text    CHECK (char_length(guidance) <= 2000),
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_template_items_template
  ON checklist_template_items (template_id, sort_order);
```

---

#### `job_checklists`

The instantiated checklist header for a specific job. Created once when the job first enters `in_progress`. Acts as the record linking a job to the template snapshot.

```sql
CREATE TABLE job_checklists (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_id           uuid        NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  template_id      uuid        REFERENCES checklist_templates(id) ON DELETE SET NULL,
  template_name    text        NOT NULL,  -- Snapshot at time of instantiation
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id)  -- Exactly one checklist per job
);

CREATE INDEX idx_job_checklists_org ON job_checklists (organisation_id, job_id);
```

**Design decisions:**
- `UNIQUE (job_id)` enforces exactly one checklist per job
- `template_name` is a point-in-time snapshot — template renames don't affect historical records
- `template_id` set null (not cascade) if source template is deleted, preserving the job record

---

#### `job_checklist_items`

Individual item completion records. Created in bulk when the checklist is instantiated.

```sql
CREATE TABLE job_checklist_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_checklist_id     uuid        NOT NULL REFERENCES job_checklists(id) ON DELETE CASCADE,
  template_item_id     uuid        REFERENCES checklist_template_items(id) ON DELETE SET NULL,
  -- Snapshotted fields (persisted even if source template item changes)
  title                text        NOT NULL,
  guidance             text,
  sort_order           integer     NOT NULL DEFAULT 0,
  -- Completion state
  is_completed         boolean     NOT NULL DEFAULT false,
  completed_by         uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_checklist_items_checklist
  ON job_checklist_items (job_checklist_id, sort_order);
```

**Design decisions:**
- `title` and `guidance` are snapshotted at instantiation — template edits don't affect in-flight or historical jobs
- `template_item_id` set null on template item deletion — job completion record is preserved
- `completed_by` and `completed_at` provide the audit trail per item

---

#### `job_checklist_photos`

Photos attached to individual checklist items.

```sql
CREATE TABLE job_checklist_photos (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  job_checklist_item_id uuid       NOT NULL REFERENCES job_checklist_items(id) ON DELETE CASCADE,
  storage_path         text        NOT NULL,
  -- Supabase Storage path: /{org_id}/checklists/{item_id}/{filename}
  file_name            text        NOT NULL,
  file_size_bytes      integer,
  mime_type            text,
  uploaded_by          uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_checklist_photos_item
  ON job_checklist_photos (job_checklist_item_id);
```

### 5.2 Supabase Storage

- **Bucket name:** `checklist-photos`
- **Bucket type:** Private (not public)
- **Path convention:** `/{organisation_id}/checklists/{job_checklist_item_id}/{uuid}-{original_filename}`
- **Access:** Signed URLs generated server-side (1-hour TTL); never served via public bucket URL
- **Max file size:** 10 MB (enforced at upload component level and Supabase Storage policy)

### 5.3 Entity Relationship Summary

```
organisations
  └── checklist_templates (org owns templates)
        └── checklist_template_items (ordered items per template)

jobs
  └── job_checklists (one per job, references template snapshot)
        └── job_checklist_items (one per template item, with completion state)
              └── job_checklist_photos (zero or many per item)
```

### 5.4 RLS Policies

All four new tables require:

```sql
-- Template access (all authenticated users in org)
CREATE POLICY "checklist_templates_all_own_org"
  ON checklist_templates FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- Same pattern for: checklist_template_items, job_checklists,
--                   job_checklist_items, job_checklist_photos
```

Additional write restriction for template mutations (admin-only at application layer via `requireAdmin()`; RLS does not differentiate roles but the server action does).

---

## 6. User Journey & Process Flows

### 6.1 Flow 1 — Admin Creates a Checklist Template

```
Admin navigates to Settings → Checklists
  └─ Clicks "New Template"
       └─ Enters: Name, Description, Service Type(s)
            └─ Clicks "Add Item" → enters Title + optional Guidance
                 └─ Repeats for each item (drag to reorder)
                      └─ Clicks "Save Template"
                           └─ Template stored as is_active = true
                                └─ Audit log entry: create_checklist_template
```

### 6.2 Flow 2 — Team Member Completes a Job Checklist

```
Team member views job (status: scheduled)
  └─ Clicks "Start Job" → status transitions to in_progress
       └─ System finds active template for job's service_type
            ├─ [No template] → Checklist section hidden; job proceeds normally
            └─ [Template found] → Instantiate job_checklist + job_checklist_items
                 └─ Checklist section appears on job detail page
                      └─ Team member works through items:
                           ├─ Checks item → is_completed=true, completed_by, completed_at set
                           ├─ Reads guidance note if available
                           └─ Optionally uploads photo(s) per item
                                └─ Progress indicator updates: "X of Y complete"
                                     └─ Team member clicks "Mark as Completed"
                                          ├─ [All items checked] → Job marked completed; checklist frozen
                                          └─ [Incomplete items] → Warning dialog shown
                                               ├─ "Review" → returns to checklist
                                               └─ "Complete Anyway" → job completed with partial checklist
```

### 6.3 Flow 3 — Admin Reviews Completed Job

```
Admin opens completed job
  └─ Views checklist section (read-only)
       └─ Sees all items with:
            ├─ Check/unchecked status
            ├─ Completed by (name) + timestamp
            └─ Thumbnail photos (click to expand in lightbox)
                 └─ Can use this record for client dispute resolution
```

### 6.4 Flow 4 — Admin Deactivates/Manages a Template

```
Admin navigates to Settings → Checklists → [Template]
  ├─ Edit: modify name, description, service types, add/remove/reorder items
  │    └─ Note: edits do NOT retroactively affect existing job checklists
  ├─ Deactivate: sets is_active=false (template no longer auto-applied to new jobs)
  │    └─ Audit log entry: deactivate_checklist_template
  ├─ Duplicate: creates new template as copy with "(copy)" suffix
  └─ Delete: only permitted if no job_checklists reference this template
       └─ Audit log entry: delete_checklist_template
```

---

## 7. UI/UX Considerations

### 7.1 New Screens Required

| Screen | Route | Access |
|--------|-------|--------|
| Checklist Template List | `/dashboard/settings/checklists` | Admin only |
| Create/Edit Template | `/dashboard/settings/checklists/new` and `/dashboard/settings/checklists/[id]` | Admin only |
| Job Detail — Checklist Section | Component within `/dashboard/jobs/[id]` | Admin + team_member |

### 7.2 Settings — Checklist Template List

- Table/card list of all templates: name, service types, item count, active/inactive badge
- "New Template" CTA button (admin only)
- Inline activate/deactivate toggle
- Row actions: Edit, Duplicate, Delete (delete greyed out if in use)
- Service type filter

### 7.3 Settings — Template Editor

- Name and description fields at top
- Service type multi-select (chips/badges for each type)
- Item list with drag handle for reordering
- Per item: title input, expandable guidance textarea, delete button
- "Add Item" button at bottom of list
- Save/Cancel actions
- Unsaved changes guard

### 7.4 Job Detail — Checklist Section

- Positioned after job header, before notes section
- Section header: "Checklist" with progress pill ("7 / 12 complete")
- Each item row:
  - Checkbox (disabled when job not `in_progress`)
  - Item title (bold) + guidance note (muted, expandable)
  - Completion meta: "[Name] · [relative time]" shown when checked
  - Photo attachment button (camera icon) + thumbnail strip of uploaded photos
- Read-only state (completed/cancelled jobs): checkboxes appear as checked/unchecked icons; no upload controls visible
- If no checklist: section entirely hidden

### 7.5 Photo Upload UX

- Tap camera icon on any checklist item
- Native file picker (mobile camera compatible via `accept="image/*"`)
- Upload progress indicator (percentage bar or spinner)
- Thumbnail shown immediately after upload
- Tap thumbnail → lightbox with full-size view + delete option (while job is in_progress)

---

## 8. Integration Points

### 8.1 Job Status Transitions

The existing job status flow is the trigger point for checklist instantiation:

- **`scheduled → in_progress`:** Trigger checklist creation (or template selection prompt if multiple templates exist)
- **`in_progress → completed`:** Validate checklist completion; show warning if incomplete; freeze checklist on confirmation
- **`in_progress → cancelled`:** Freeze checklist in partial state; record preserved for audit

### 8.2 Service Types

The `service_type` field on jobs is the key that maps jobs to templates. The current enum (`regular | deep_clean | move_in | move_out | post_event | other`) is used directly as values in `checklist_templates.service_types[]`.

### 8.3 Supabase Storage Integration

- **Bucket:** `checklist-photos` (private, created via Supabase CLI migration)
- **Upload:** Client-side via Supabase JS Storage client (`supabase.storage.from('checklist-photos').upload(path, file)`)
- **Access:** Server-side signed URL generation for display (`createSignedUrl()` with 3600s TTL)
- **Storage RLS:** Apply policies restricting access to the org's own path prefix

### 8.4 Audit Logging

Extend the existing `logAuditEvent()` function with new action types:

```typescript
// New audit action types to add to the existing union:
| 'create_checklist_template'
| 'update_checklist_template'
| 'deactivate_checklist_template'
| 'delete_checklist_template'
```

### 8.5 Existing Navigation

Add "Checklists" as a sub-item under the Settings navigation (admin-only). No changes needed to the main sidebar navigation items (Jobs, Clients, Quotes).

---

## 9. Technical Considerations

### 9.1 Checklist Instantiation Strategy

**Option A — Server Action on Status Change (Recommended)**
When the `updateJobStatus` server action transitions a job to `in_progress`, it calls a `createJobChecklist(jobId, templateId)` helper in the same server transaction. Atomic, consistent, follows existing patterns.

**Option B — Database Trigger**
A PostgreSQL trigger on `jobs.status` change creates the checklist automatically. More robust against direct DB access, but harder to test and debug; bypasses application-layer template selection logic.

**Recommendation:** Option A — aligns with existing server action pattern and allows template selection UI when multiple templates match.

### 9.2 Photo Upload Architecture

- Upload happens **client-side directly to Supabase Storage** (not through Next.js API route) to avoid Next.js request body size limits and unnecessary server proxying
- After successful upload, client calls a server action to record the `storage_path` in `job_checklist_photos`
- All reads use server-generated signed URLs to maintain private bucket security

### 9.3 Optimistic UI for Checkbox Updates

Checkbox state should update immediately on click (optimistic) with server confirmation via server action. On failure, revert the UI and show an error toast. Follow the existing UI feedback pattern (toast notifications used elsewhere in the app).

### 9.4 Snapshot Immutability

`job_checklist_items.title` and `.guidance` are snapshotted at instantiation time from the template. This means:
- Template edits **do not** retroactively affect any existing job checklists
- Historical job records always reflect the checklist as it was at the time of job execution
- This should be clearly communicated to admins in the template editor UI ("Changes will not affect jobs already in progress or completed")

### 9.5 Performance

- Checklist items and photos are loaded as part of the job detail page query (single combined fetch with joins)
- For jobs without a checklist (`job_checklists` row absent), no performance cost — query returns null/empty
- Signed URL generation is batched for all photos on a job in a single server call

---

## 10. Acceptance Criteria

### AC-1: Template Creation

- [ ] Admin can create a template with a name, description, and one or more service types
- [ ] Admin can add at least one item with a title to the template
- [ ] Template is visible in the Settings → Checklists list after creation
- [ ] Template creation is recorded in the audit log
- [ ] Non-admin users cannot access the template management UI

### AC-2: Template Editing

- [ ] Admin can edit template name, description, and service types
- [ ] Admin can add, edit, delete, and reorder items within a template
- [ ] Changes to a template do not affect jobs that already have an instantiated checklist
- [ ] Template edits are recorded in the audit log

### AC-3: Template Deactivation & Deletion

- [ ] Admin can deactivate an active template; it no longer applies to new jobs
- [ ] Admin can reactivate a deactivated template
- [ ] Admin can delete a template that has no associated job checklists
- [ ] Admin cannot delete a template that has associated job checklists (delete button absent/disabled with explanation)
- [ ] Deactivation and deletion are recorded in the audit log

### AC-4: Checklist Instantiation on Job Start

- [ ] When a job is moved to `in_progress` and a single active template matches its service type, the checklist is automatically created with all items from the template
- [ ] When multiple active templates match a job's service type, the user is prompted to select one before proceeding
- [ ] When no active template matches, no checklist is created and the checklist section is hidden
- [ ] Checklist items are snapshots of the template items at the time of instantiation

### AC-5: Checklist Completion

- [ ] Team member can check any item on an `in_progress` job
- [ ] Checked item shows who completed it and when
- [ ] Team member can uncheck an item on an `in_progress` job
- [ ] Checklist items on `completed` or `cancelled` jobs are read-only (no check/uncheck)
- [ ] Progress indicator correctly shows X of Y items complete

### AC-6: Photo Attachments

- [ ] Team member can upload a photo (JPEG, PNG, HEIC, WebP) to any checklist item on an `in_progress` job
- [ ] Upload progress is displayed
- [ ] Uploaded photo appears as a thumbnail on the item immediately after upload
- [ ] Multiple photos can be attached to a single item
- [ ] Clicking a thumbnail opens a lightbox with the full-size image
- [ ] Photos on a completed/cancelled job are viewable but cannot be added or deleted

### AC-7: Completion Warning

- [ ] Attempting to mark a job `completed` with one or more unchecked items displays a warning dialog listing the incomplete items
- [ ] User can dismiss the warning and return to the checklist
- [ ] User can choose to complete the job anyway despite incomplete items
- [ ] No warning is shown if all items are checked

### AC-8: Admin Quality Review

- [ ] Admin can open a completed job and see the full checklist in read-only mode
- [ ] Admin can see all photos attached to each item
- [ ] Admin can see who completed each item and the exact timestamp

---

## 11. Job Type Management (New Feature — Architectural Prerequisite)

### 11.1 Problem Statement

The current `service_type` field on jobs is a **hardcoded PostgreSQL/TypeScript enum** with six fixed values: `regular | deep_clean | move_in | move_out | post_event | other`. This creates two significant problems:

1. **Inflexibility:** Organisations have different and diverse service offerings. A domestic cleaning company has very different needs from a commercial maintenance firm or an end-of-tenancy specialist. The current hardcoded list either doesn't fit or forces users to work around it with the catch-all "other" type.

2. **Checklist template coupling:** The checklist template system (Tier 1 above) needs to associate templates with job types. If job types are hardcoded, organisations cannot align their checklist templates to their actual service offering without a code deployment.

**The solution is to replace the hardcoded enum with a dynamic `job_types` table, managed per organisation, with a seed set of sensible defaults created at onboarding.**

### 11.2 Current State — What Needs to Change

The following files currently reference `ServiceType` or `service_type` and will require updates:

| File | Current Usage | Change Required |
|------|--------------|-----------------|
| `src/lib/types/index.ts` | `type ServiceType = 'regular' \| ...` | Add `JobType` interface; deprecate `ServiceType` enum |
| `src/app/dashboard/jobs/new/page.tsx` | `<select name="service_type">` with hardcoded options | Dynamic options from `job_types` table |
| `src/app/dashboard/jobs/[id]/edit/page.tsx` | `service_type` in form | Dynamic `job_type_id` FK select |
| `src/app/dashboard/jobs/page.tsx` | `serviceLabels` record mapping enum to display names | Display `job_type.name` directly from join |
| `src/app/dashboard/jobs/[id]/page.tsx` | Display of service type label | Fetch and display `job_type.name` |
| `src/app/dashboard/page.tsx` | Service type display | Fetch via join |
| `src/app/dashboard/clients/[id]/page.tsx` | Service type display | Fetch via join |
| `src/components/dashboard/ActivityTimeline.tsx` | Service type in activity display | Resolve from `job_type.name` |
| `src/app/onboarding/_steps/StepServices.tsx` | Checkbox list of hardcoded service types | Replace with editable job type setup |
| `src/lib/actions/quotes.ts` | `service_type: 'other'` hardcoded on job creation from quote | Accept `job_type_id` parameter or use org default |
| `supabase/migrations/...quote_functions.sql` | `service_type = 'other'` in SQL RPC | Updated to pass `job_type_id` |

### 11.3 Functional Requirements — Job Type Management (FR-JT)

| ID | Requirement |
|----|-------------|
| FR-JT1 | Admins must be able to view a list of their organisation's job types from the Jobs settings screen |
| FR-JT2 | Admins must be able to **create** a new job type with a name (required, max 100 chars) and optional description |
| FR-JT3 | Admins must be able to **edit** an existing job type's name and description |
| FR-JT4 | Admins must be able to **deactivate** a job type — deactivated types no longer appear in job creation or quote forms, but historical jobs referencing them are preserved |
| FR-JT5 | Admins must be able to **reactivate** a deactivated job type |
| FR-JT6 | Admins must be able to **delete** a job type that has **never been used** on any job or quote; types with usage history may only be deactivated |
| FR-JT7 | Each organisation must have a set of **default job types seeded** at account creation (mapping from the current `ServiceType` enum values: Regular Clean, Deep Clean, Move In, Move Out, Post Event, Other) |
| FR-JT8 | Job type names must be **unique within an organisation** |
| FR-JT9 | All job type mutations must be captured in the audit log |
| FR-JT10 | At least one active job type must always exist per organisation (prevent deletion/deactivation of the last active type) |

### 11.4 User Stories — Job Type Management

| ID | Story |
|----|-------|
| US-JT1 | As an admin, I want to create job types specific to my business so that my team selects the right category when scheduling jobs, rather than using a generic list |
| US-JT2 | As an admin, I want to rename existing job types to match the terminology my team uses so that the system feels like it belongs to my business |
| US-JT3 | As an admin, I want to deactivate a job type that my business no longer offers so that it stops appearing in job creation forms without losing the history of past jobs |
| US-JT4 | As an admin, I want my job types to be automatically associated with relevant checklist templates so that the right quality checklist always follows the right job |
| US-TM8 | As a team member, when I create or view a job I want to see my organisation's actual service names (not generic system labels) so that I can identify the job type immediately |

### 11.5 Data Model — `job_types` Table

```sql
CREATE TABLE job_types (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description      text        CHECK (char_length(description) <= 500),
  is_active        boolean     NOT NULL DEFAULT true,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)  -- Names must be unique per org
);

CREATE INDEX idx_job_types_org_active ON job_types (organisation_id, is_active, sort_order);
```

**RLS Policy:**
```sql
CREATE POLICY "job_types_all_own_org"
  ON job_types FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
```

**Seed data (applied via migration for existing organisations and at onboarding for new ones):**
```sql
INSERT INTO job_types (organisation_id, name, sort_order) VALUES
  ($org_id, 'Regular Clean',   0),
  ($org_id, 'Deep Clean',      1),
  ($org_id, 'Move In',         2),
  ($org_id, 'Move Out',        3),
  ($org_id, 'Post Event',      4),
  ($org_id, 'Other',           5);
```

### 11.6 Migration Strategy — Replacing the Hardcoded Enum

This is a **breaking schema change** requiring a carefully sequenced migration:

**Step 1 — Add `job_types` table and seed per-org records**
```sql
-- Create job_types table (as above)
-- Seed one row per existing org per legacy service_type value
INSERT INTO job_types (organisation_id, name, sort_order)
SELECT DISTINCT
  organisation_id,
  CASE service_type
    WHEN 'regular'     THEN 'Regular Clean'
    WHEN 'deep_clean'  THEN 'Deep Clean'
    WHEN 'move_in'     THEN 'Move In'
    WHEN 'move_out'    THEN 'Move Out'
    WHEN 'post_event'  THEN 'Post Event'
    WHEN 'other'       THEN 'Other'
  END AS name,
  CASE service_type
    WHEN 'regular'    THEN 0
    WHEN 'deep_clean' THEN 1
    WHEN 'move_in'    THEN 2
    WHEN 'move_out'   THEN 3
    WHEN 'post_event' THEN 4
    WHEN 'other'      THEN 5
  END AS sort_order
FROM jobs;
```

**Step 2 — Add `job_type_id` FK column to `jobs` (nullable initially)**
```sql
ALTER TABLE jobs ADD COLUMN job_type_id uuid REFERENCES job_types(id) ON DELETE SET NULL;
```

**Step 3 — Backfill `job_type_id` from existing `service_type` values**
```sql
UPDATE jobs j
SET job_type_id = jt.id
FROM job_types jt
WHERE jt.organisation_id = j.organisation_id
  AND jt.name = CASE j.service_type
    WHEN 'regular'    THEN 'Regular Clean'
    WHEN 'deep_clean' THEN 'Deep Clean'
    WHEN 'move_in'    THEN 'Move In'
    WHEN 'move_out'   THEN 'Move Out'
    WHEN 'post_event' THEN 'Post Event'
    WHEN 'other'      THEN 'Other'
  END;
```

**Step 4 — Add NOT NULL constraint and create index**
```sql
ALTER TABLE jobs ALTER COLUMN job_type_id SET NOT NULL;
CREATE INDEX idx_jobs_job_type ON jobs (job_type_id);
```

**Step 5 — Retain `service_type` column during transition period**

> **Decision required:** The `service_type` column can be retained as a shadow column for the first release, allowing a rollback path, then removed in a subsequent migration once the release is stable. Recommend retaining for 2 sprints post-release.

### 11.7 Impact on `checklist_templates`

The `service_types text[]` array column in the `checklist_templates` design (Section 5.1) must be updated to reference `job_types` by foreign key instead of using the hardcoded enum string values.

**Revised approach — junction table:**

```sql
CREATE TABLE checklist_template_job_types (
  checklist_template_id  uuid  NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  job_type_id            uuid  NOT NULL REFERENCES job_types(id) ON DELETE CASCADE,
  PRIMARY KEY (checklist_template_id, job_type_id)
);
```

This replaces the `service_types text[]` array column in `checklist_templates`. A junction table is appropriate here because `job_types` is now a proper entity with referential integrity, rather than a loose string enum.

**Update Section 5.1 accordingly:** Remove `service_types text[]` from `checklist_templates` and replace with the junction table above.

### 11.8 Impact on the Onboarding Flow

The current Step 2 of onboarding (`StepServices.tsx`) shows a checkbox list of hardcoded service types. This step should be rethought:

**Option A (Recommended):** Remove the service type selection step from onboarding entirely. All six default job types are seeded automatically for every new org. Admins can manage their job types post-signup from Settings → Job Types. This reduces onboarding friction.

**Option B:** Keep the onboarding step but replace hardcoded checkboxes with editable fields, allowing admins to customise their initial job types during setup. More flexible but adds complexity to onboarding.

**Recommendation:** Option A — simplify onboarding, empower post-signup configuration.

### 11.9 UI/UX — Job Type Management Screen

**Location:** `/dashboard/settings/job-types` (Admin only)

**Layout:**
- Header: "Job Types" with "Add Job Type" button
- Ordered list of job types (drag handle for sort order)
- Per row: name, description (truncated), active/inactive badge, Edit and deactivate/delete actions
- Inactive types shown in muted state, with "Reactivate" action
- Inline edit on click (or edit modal) — name and description fields
- Delete button only shown for unused types (greyed with tooltip for types in use)
- Warning if fewer than 2 active types remain

**Job creation / edit form update:**
- Replace `<select name="service_type">` with `<select name="job_type_id">` populated dynamically from the organisation's active job types

### 11.10 Acceptance Criteria — Job Type Management

| AC | Criterion |
|----|-----------|
| AC-JT1 | Six default job types are present for all new organisations created after this feature ships |
| AC-JT2 | All existing organisations have their historical service_type values migrated to matching job_type rows with no data loss |
| AC-JT3 | Admin can create a new job type; it immediately appears in the job creation form |
| AC-JT4 | Admin can rename a job type; existing jobs referencing that type display the new name |
| AC-JT5 | Admin can deactivate a job type; it no longer appears in job creation/edit forms |
| AC-JT6 | Admin cannot delete a job type referenced by any job; tooltip explains why |
| AC-JT7 | Admin cannot deactivate the last remaining active job type |
| AC-JT8 | Job type mutations appear in the audit log |
| AC-JT9 | Jobs list and job detail pages display the job type name from the organisation's `job_types` table, not a hardcoded label |
| AC-JT10 | Quote-to-job creation correctly assigns a `job_type_id` (via a configurable org default or admin selection) |

---

## 12. Dependencies & Risks

### 12.1 Dependencies

| Dependency | Detail |
|------------|--------|
| **Phase 1 must complete before Phase 2** | `checklist_template_job_types` junction table references `job_types`; checklist templates cannot be built until `job_types` is a first-class entity |
| **Phase 1 must complete before quote-to-job flow changes** | `public_respond_to_quote()` SQL RPC hardcodes `service_type = 'other'`; must be updated alongside the job types migration |
| Supabase Storage bucket creation | `checklist-photos` private bucket must be created via migration before Phase 4 ships |
| HEIC/WebP browser support | HEIC requires server-side conversion for cross-browser support; descope to Phase 4 follow-up if complex |
| Mobile-optimised upload | Use `<input type="file" accept="image/*" capture="environment">` for native camera access on iOS/Android |
| Audit log action type extension | New action types for job types AND checklists must be added to the TypeScript union in `src/lib/audit.ts` |

### 12.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Data loss during `service_type` → `job_type_id` migration** | Low | High | Retain `service_type` shadow column for 2 sprints post-release; run migration in staging first with full data verification |
| **Existing RPC function broken by migration** | Low | High | Update `public_respond_to_quote()` in same migration; test quote acceptance flow end-to-end in staging |
| Orgs with zero jobs getting incomplete job type seed | Low | Low | Seed all six defaults based on org creation, not job history |
| Template not yet created when admin starts a job | Medium | Low | Show info prompt on job detail page suggesting template setup in Settings |
| Large photo files degrading page load | Medium | Medium | Enforce 10 MB cap at upload; serve thumbnails inline, full-res only in lightbox |
| Team member forgets to attach photos | High | Low | Guidance notes can prompt; system does not enforce photo requirement |
| Multiple templates matching one job type creating UX friction | Low | Medium | Provide clear template selection UI; recommend one active template per job type |
| Checklist instantiation race condition (double-click on status button) | Low | Medium | `UNIQUE (job_id)` on `job_checklists` prevents duplicates; handle DB constraint error gracefully in UI |

---

## 13. Implementation Phases

### Phase 1 — Dynamic Job Types (Architectural Prerequisite)

**Scope:** Replace hardcoded `ServiceType` enum with admin-managed `job_types` per organisation
- Database: Create `job_types` table with RLS; backfill migration seeding one row per distinct `service_type` per org; add `job_type_id` FK to `jobs`; backfill FK values; add NOT NULL constraint; retain `service_type` shadow column for rollback safety
- Server actions: `src/lib/actions/job-types.ts` — create, update, deactivate, reactivate, delete
- UI: `src/app/dashboard/settings/job-types/page.tsx` — list with drag-to-sort, inline edit, deactivate/delete
- Update job creation form (`jobs/new`), edit form (`jobs/[id]/edit`), and all display locations to use `job_type_id` + join
- Update `public_respond_to_quote()` SQL RPC to accept/assign `job_type_id`
- Update onboarding to auto-seed default job types; remove or simplify the service types selection step
- Audit logging: `create_job_type | update_job_type | deactivate_job_type | delete_job_type`

**Value delivered:** Organisations can define their own service types; foundation for checklist template association is in place; decouples system from hardcoded enum

---

### Phase 2 — Checklist Template Management

**Scope:** Build the admin-facing checklist template setup experience
- Database: Create `checklist_templates`, `checklist_template_items`, and `checklist_template_job_types` tables with RLS; remove `service_type` shadow column from `jobs`
- Server actions: `src/lib/actions/checklists.ts` — create, update, deactivate, delete, duplicate template; manage items
- UI: `src/app/dashboard/settings/checklists/` — template list and editor (item ordering, job type multi-select association)
- Audit logging: `create_checklist_template | update_checklist_template | deactivate_checklist_template | delete_checklist_template`

**Value delivered:** Admins can define quality checklists per job type before field rollout

---

### Phase 3 — Job Checklist Instantiation & Completion

**Scope:** Attach checklists to jobs and enable field completion
- Database: Create `job_checklists` and `job_checklist_items` tables with RLS
- Logic in `src/lib/actions/jobs.ts`: instantiate checklist on `in_progress` status transition (auto-select if one template; prompt if multiple)
- UI: `ChecklistSection` component within `jobs/[id]/page.tsx` — check/uncheck items, completion metadata, progress indicator
- Warning: Incomplete checklist guard dialog on job completion

**Value delivered:** Team members can complete structured checklists during jobs

---

### Phase 4 — Photo Attachments

**Scope:** Add photographic evidence capability
- Supabase Storage: Create `checklist-photos` private bucket and Storage RLS policies via migration
- Database: Create `job_checklist_photos` table with RLS
- Server actions: signed upload URL generation, photo metadata recording, photo deletion
- UI: Camera/upload button per checklist item, thumbnail strip, lightbox modal viewer (`PhotoUpload`, `PhotoLightbox` components)

**Value delivered:** Full photographic evidence trail per job checklist item

---

### Phase 5 — Reporting & Analytics (Future)

**Scope:** Insights from checklist data (out of scope for initial implementation)
- Checklist completion rates by job type
- Most frequently skipped items
- Team member completion performance
- Export checklist record as PDF (client-facing quality report)

---

## 14. Key Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/lib/actions/job-types.ts` | Server actions for job type create/update/deactivate/delete |
| `src/lib/queries/job-types.ts` | Query functions for fetching org job types |
| `src/app/dashboard/settings/job-types/page.tsx` | Job type management page |
| `src/lib/actions/checklists.ts` | Server actions for template and job checklist mutations |
| `src/lib/queries/checklists.ts` | Query functions for templates and job checklists |
| `src/app/dashboard/settings/checklists/page.tsx` | Template list page |
| `src/app/dashboard/settings/checklists/new/page.tsx` | Create template page |
| `src/app/dashboard/settings/checklists/[id]/page.tsx` | Edit template page |
| `src/components/checklists/ChecklistSection.tsx` | Job detail checklist UI component |
| `src/components/checklists/ChecklistItem.tsx` | Individual item with check + photo upload |
| `src/components/checklists/PhotoUpload.tsx` | Photo upload + thumbnail component |
| `src/components/checklists/PhotoLightbox.tsx` | Full-screen photo viewer |
| `supabase/migrations/YYYYMMDD_job_types.sql` | DB migration: job_types table, backfill, jobs FK |
| `supabase/migrations/YYYYMMDD_checklist_tables.sql` | DB migration: checklist tables + RLS |
| `supabase/migrations/YYYYMMDD_checklist_storage.sql` | Storage bucket + Storage RLS policies |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/types/index.ts` | Add `JobType` interface; add interfaces for all new checklist entities; retain `ServiceType` type temporarily for backwards compat during shadow column period |
| `src/lib/audit.ts` | Extend audit action union with job type and checklist action types |
| `src/lib/actions/jobs.ts` | Replace `service_type` with `job_type_id` in create/update; trigger checklist instantiation on `in_progress` transition |
| `src/lib/queries/jobs.ts` | Join `job_types` in `getJobs()` and `getJob()` |
| `src/app/dashboard/jobs/new/page.tsx` | Replace hardcoded `<select>` with dynamic `job_type_id` select |
| `src/app/dashboard/jobs/[id]/edit/page.tsx` | Same as above |
| `src/app/dashboard/jobs/[id]/page.tsx` | Display `job_type.name` from join; add `<ChecklistSection>` component |
| `src/app/dashboard/jobs/page.tsx` | Remove `serviceLabels` record; display from join |
| `src/app/dashboard/page.tsx` | Update dashboard job type display |
| `src/app/dashboard/clients/[id]/page.tsx` | Update job type display |
| `src/components/dashboard/ActivityTimeline.tsx` | Update job type display in activity feed |
| `src/app/onboarding/_steps/StepServices.tsx` | Remove or simplify; auto-seed defaults instead |
| `src/app/dashboard/settings/layout.tsx` | Add "Job Types" and "Checklists" links to settings navigation |
| `supabase/migrations/..._public_quote_functions.sql` | Update `public_respond_to_quote()` RPC to use `job_type_id` |

---

## 15. Verification Plan

### Phase 1 — Job Types

1. **Migration integrity:** All existing jobs have a non-null `job_type_id` pointing to a matching `job_types` row after migration; no `service_type` values lost
2. **Job creation:** Create new job from dashboard using dynamic job type select → verify `job_type_id` stored; job list shows correct type name
3. **Job type creation:** Admin creates new "Biohazard Clean" job type → appears in job creation form immediately
4. **Job type deactivation:** Admin deactivates a type → no longer in job creation form; existing jobs still show that type name
5. **Job type delete guard:** Admin tries to delete a type with jobs → delete button absent or disabled with explanation
6. **Quote-to-job:** Client accepts a quote via public link → job created with correct `job_type_id` (not broken by migration)

### Phase 2 — Checklist Templates

7. **Template creation:** Admin creates a "Regular Clean" template with 5 items including guidance notes, associated with "Regular Clean" job type → saved correctly, visible in Settings → Checklists
8. **Template edit:** Admin adds a 6th item → existing in-progress jobs retain 5 items; new jobs of that type get 6 items
9. **Template deactivation:** Admin deactivates template → new job of matching type → no checklist instantiated

### Phase 3 — Checklist Completion

10. **Checklist auto-creation:** Start a job of a type with one active template → `job_checklists` and `job_checklist_items` rows created with snapshotted data
11. **Multi-template prompt:** Two active templates for same job type → starting job shows template selection prompt
12. **Item completion:** Check 3 of 5 items → `is_completed`, `completed_by`, `completed_at` set; progress shows "3 / 5"
13. **Uncheck:** Uncheck an item → reverts to `is_completed = false`
14. **Completion warning:** Attempt to complete job with 2 unchecked items → warning dialog; "Complete Anyway" proceeds; "Review" returns to checklist
15. **Read-only after completion:** Complete job → checkboxes and upload controls disabled; all data visible

### Phase 4 — Photos

16. **Photo upload:** Upload a JPEG to a checklist item → storage path recorded in `job_checklist_photos`; thumbnail visible; signed URL opens full image in lightbox
17. **Multiple photos:** Upload 3 photos to one item → all thumbnails shown; lightbox navigates between them
18. **Photo read-only:** Complete job → upload button absent; existing photos still viewable
19. **Admin review:** Admin opens completed job → full checklist with completion metadata and all photos visible

---

*End of Report*
