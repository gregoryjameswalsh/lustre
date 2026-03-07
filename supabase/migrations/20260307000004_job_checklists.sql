-- supabase/migrations/20260307000004_job_checklists.sql
-- =============================================================================
-- LUSTRE — Phase 3: Job Checklist Instantiation
-- Creates job_checklists (header) and job_checklist_items (completion records).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- job_checklists
-- One row per job that has an active checklist. Created when the job first
-- moves to in_progress. UNIQUE (job_id) ensures exactly one checklist per job.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_checklists (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id)       ON DELETE CASCADE,
  job_id           uuid        NOT NULL REFERENCES jobs(id)                ON DELETE CASCADE,
  template_id      uuid                REFERENCES checklist_templates(id)  ON DELETE SET NULL,
  template_name    text        NOT NULL,  -- point-in-time snapshot of template name
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_checklists_org
  ON job_checklists (organisation_id, job_id);

ALTER TABLE job_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_checklists_all_own_org"
  ON job_checklists FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- ---------------------------------------------------------------------------
-- job_checklist_items
-- One row per template item, created in bulk when the checklist is instantiated.
-- title and guidance are snapshotted at instantiation — template edits do not
-- retroactively affect in-progress or completed jobs.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_checklist_items (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id      uuid        NOT NULL REFERENCES organisations(id)              ON DELETE CASCADE,
  job_checklist_id     uuid        NOT NULL REFERENCES job_checklists(id)             ON DELETE CASCADE,
  template_item_id     uuid                REFERENCES checklist_template_items(id)    ON DELETE SET NULL,
  -- Snapshotted from template at instantiation time
  title                text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  guidance             text        CHECK (char_length(guidance) <= 2000),
  sort_order           integer     NOT NULL DEFAULT 0,
  -- Completion state
  is_completed         boolean     NOT NULL DEFAULT false,
  completed_by         uuid                REFERENCES profiles(id)                    ON DELETE SET NULL,
  completed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_checklist_items_checklist
  ON job_checklist_items (job_checklist_id, sort_order);

ALTER TABLE job_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_checklist_items_all_own_org"
  ON job_checklist_items FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
