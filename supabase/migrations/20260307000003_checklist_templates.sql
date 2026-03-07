-- =============================================================================
-- LUSTRE Migration: Checklist Templates (Phase 2)
-- Creates checklist_templates, checklist_template_items, and the
-- checklist_template_job_types junction table linking templates to job types.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. checklist_templates — master template definitions per organisation
-- ---------------------------------------------------------------------------

CREATE TABLE checklist_templates (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  description      text        CHECK (char_length(description) <= 1000),
  is_active        boolean     NOT NULL DEFAULT true,
  created_by       uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_templates_org_active
  ON checklist_templates (organisation_id, is_active);

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_templates_all_own_org"
  ON checklist_templates FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 2. checklist_template_items — ordered items within a template
-- ---------------------------------------------------------------------------

CREATE TABLE checklist_template_items (
  id               uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid    NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  template_id      uuid    NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  title            text    NOT NULL CHECK (char_length(title) BETWEEN 1 AND 500),
  guidance         text    CHECK (char_length(guidance) <= 2000),
  sort_order       integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_template_items_template
  ON checklist_template_items (template_id, sort_order);

ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_template_items_all_own_org"
  ON checklist_template_items FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 3. checklist_template_job_types — junction: which job types use a template
-- ---------------------------------------------------------------------------

CREATE TABLE checklist_template_job_types (
  checklist_template_id  uuid  NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  job_type_id            uuid  NOT NULL REFERENCES job_types(id) ON DELETE CASCADE,
  organisation_id        uuid  NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  PRIMARY KEY (checklist_template_id, job_type_id)
);

CREATE INDEX idx_checklist_template_job_types_job_type
  ON checklist_template_job_types (job_type_id, organisation_id);

ALTER TABLE checklist_template_job_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "checklist_template_job_types_all_own_org"
  ON checklist_template_job_types FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
