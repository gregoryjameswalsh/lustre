-- =============================================================================
-- LUSTRE Migration: Sales Pipeline (M01)
-- =============================================================================

CREATE TABLE pipeline_stages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  position        int         NOT NULL DEFAULT 0,
  colour          text,          -- hex, e.g. '#4a5c4e'
  is_won          boolean     NOT NULL DEFAULT false,
  is_lost         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pipeline_stages_won_or_lost CHECK (NOT (is_won AND is_lost))
);

CREATE INDEX pipeline_stages_org_position ON pipeline_stages (organisation_id, position);

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_stages_own_org" ON pipeline_stages FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


CREATE TABLE deals (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  stage_id        uuid        NOT NULL REFERENCES pipeline_stages(id) ON DELETE RESTRICT,
  title           text        NOT NULL,
  value           numeric(12,2),
  currency        text        NOT NULL DEFAULT 'GBP',
  expected_close  date,
  assigned_to     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  notes           text,
  won_at          timestamptz,
  lost_at         timestamptz,
  lost_reason     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deals_won_or_lost CHECK (NOT (won_at IS NOT NULL AND lost_at IS NOT NULL))
);

CREATE INDEX deals_org_stage ON deals (organisation_id, stage_id);
CREATE INDEX deals_org_client ON deals (organisation_id, client_id);
CREATE INDEX deals_org_assigned ON deals (organisation_id, assigned_to);
CREATE INDEX deals_org_created ON deals (organisation_id, created_at DESC);

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deals_own_org" ON deals FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Auto-update deals.updated_at
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_deals_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER deals_updated_at
  BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION touch_deals_updated_at();


-- ---------------------------------------------------------------------------
-- Seed default pipeline stages for all existing organisations
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  org_rec RECORD;
  default_stages text[][] := ARRAY[
    ARRAY['Lead',           '#a1b5a3', 'false', 'false'],
    ARRAY['Qualified',      '#8fa891', 'false', 'false'],
    ARRAY['Proposal Sent',  '#6d8f70', 'false', 'false'],
    ARRAY['Negotiation',    '#5a7c5d', 'false', 'false'],
    ARRAY['Won',            '#3d6040', 'true',  'false'],
    ARRAY['Lost',           '#b0b0b0', 'false', 'true']
  ];
  i int;
BEGIN
  FOR org_rec IN SELECT id FROM organisations LOOP
    -- Only seed if the org has no stages yet
    IF NOT EXISTS (SELECT 1 FROM pipeline_stages WHERE organisation_id = org_rec.id) THEN
      FOR i IN 1..array_length(default_stages, 1) LOOP
        INSERT INTO pipeline_stages (organisation_id, name, colour, position, is_won, is_lost)
        VALUES (
          org_rec.id,
          default_stages[i][1],
          default_stages[i][2],
          i - 1,
          default_stages[i][3]::boolean,
          default_stages[i][4]::boolean
        );
      END LOOP;
    END IF;
  END LOOP;
END;
$$;


-- ---------------------------------------------------------------------------
-- Trigger: seed default stages for new organisations
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION seed_default_pipeline_stages()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_stages text[][] := ARRAY[
    ARRAY['Lead',           '#a1b5a3', 'false', 'false'],
    ARRAY['Qualified',      '#8fa891', 'false', 'false'],
    ARRAY['Proposal Sent',  '#6d8f70', 'false', 'false'],
    ARRAY['Negotiation',    '#5a7c5d', 'false', 'false'],
    ARRAY['Won',            '#3d6040', 'true',  'false'],
    ARRAY['Lost',           '#b0b0b0', 'false', 'true']
  ];
  i int;
BEGIN
  FOR i IN 1..array_length(default_stages, 1) LOOP
    INSERT INTO pipeline_stages (organisation_id, name, colour, position, is_won, is_lost)
    VALUES (
      NEW.id,
      default_stages[i][1],
      default_stages[i][2],
      i - 1,
      default_stages[i][3]::boolean,
      default_stages[i][4]::boolean
    );
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organisation_created_seed_pipeline ON organisations;
CREATE TRIGGER on_organisation_created_seed_pipeline
  AFTER INSERT ON organisations
  FOR EACH ROW EXECUTE FUNCTION seed_default_pipeline_stages();
