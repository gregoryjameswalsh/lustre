-- =============================================================================
-- LUSTRE — Pipeline: client-centric model
-- Replaces the deal-based pipeline with pipeline fields on the clients table.
-- The deals table is left in place (inert) for potential Phase 3 enterprise use.
-- =============================================================================

-- 1. Extend activity_type enum
--    (ALTER TYPE ADD VALUE cannot run inside a transaction in PG < 12;
--     Supabase runs on PG 15 so this is safe in-transaction.)
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'pipeline_stage_changed';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'pipeline_won';
ALTER TYPE activity_type ADD VALUE IF NOT EXISTS 'pipeline_lost';

-- 2. Add pipeline columns to clients
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS pipeline_stage_id        uuid        REFERENCES pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pipeline_assigned_to     uuid        REFERENCES profiles(id)        ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estimated_monthly_value  numeric(10,2),
  ADD COLUMN IF NOT EXISTS pipeline_notes           text,
  ADD COLUMN IF NOT EXISTS pipeline_entered_at      timestamptz,
  ADD COLUMN IF NOT EXISTS won_at                   timestamptz,
  ADD COLUMN IF NOT EXISTS lost_at                  timestamptz,
  ADD COLUMN IF NOT EXISTS lost_reason              text;

-- 3. Index — fast lookup of all pipeline clients per org
CREATE INDEX IF NOT EXISTS clients_org_pipeline_stage
  ON clients (organisation_id, pipeline_stage_id)
  WHERE pipeline_stage_id IS NOT NULL;
