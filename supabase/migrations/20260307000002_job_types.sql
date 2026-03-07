-- =============================================================================
-- LUSTRE Migration: Dynamic Job Types
-- Replaces the hardcoded service_type enum with a per-org job_types table.
-- Existing jobs are migrated via job_type_id FK; service_type is retained as
-- a shadow column for one sprint to allow safe rollback.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. Create job_types table
-- ---------------------------------------------------------------------------

CREATE TABLE job_types (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name             text        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  description      text        CHECK (char_length(description) <= 500),
  is_active        boolean     NOT NULL DEFAULT true,
  sort_order       integer     NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

CREATE INDEX idx_job_types_org_active ON job_types (organisation_id, is_active, sort_order);

ALTER TABLE job_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_types_all_own_org"
  ON job_types FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 2. Seed all six default job types for every existing organisation.
--    We seed all six for every org (not just types they've used) so that
--    all orgs start with a consistent, complete baseline.
-- ---------------------------------------------------------------------------

INSERT INTO job_types (organisation_id, name, sort_order)
SELECT
  o.id,
  defaults.name,
  defaults.sort_order
FROM organisations o
CROSS JOIN (
  VALUES
    ('Regular Clean',  0),
    ('Deep Clean',     1),
    ('Move In',        2),
    ('Move Out',       3),
    ('Post Event',     4),
    ('Other',          5)
) AS defaults(name, sort_order)
ON CONFLICT (organisation_id, name) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 3. Add job_type_id FK to jobs (nullable while backfilling)
-- ---------------------------------------------------------------------------

ALTER TABLE jobs ADD COLUMN job_type_id uuid REFERENCES job_types(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 4. Backfill job_type_id from existing service_type values
-- ---------------------------------------------------------------------------

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
    ELSE 'Other'
  END;

-- Catch any remaining nulls (e.g. jobs with a non-standard service_type value)
-- and assign them to 'Other' for their org.
UPDATE jobs j
SET job_type_id = jt.id
FROM job_types jt
WHERE j.job_type_id IS NULL
  AND jt.organisation_id = j.organisation_id
  AND jt.name = 'Other';


-- ---------------------------------------------------------------------------
-- 5. Enforce NOT NULL on job_type_id and add index
-- ---------------------------------------------------------------------------

ALTER TABLE jobs ALTER COLUMN job_type_id SET NOT NULL;

CREATE INDEX idx_jobs_job_type ON jobs (job_type_id);


-- ---------------------------------------------------------------------------
-- 6. Update public_respond_to_quote() to use job_type_id
--    Looks up the org's "Other" job type and assigns it to the created job,
--    exactly mirroring the previous behaviour of hardcoding service_type='other'.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_respond_to_quote(p_token TEXT, p_response TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote          quotes%ROWTYPE;
  v_job_id         uuid;
  v_quote_num      text;
  v_other_type_id  uuid;
BEGIN
  -- Validate response value up front
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN '{"error":"Invalid response value."}'::jsonb;
  END IF;

  -- Lock the quote row to prevent concurrent responses
  SELECT * INTO v_quote
  FROM   quotes
  WHERE  accept_token = p_token
  FOR    UPDATE;

  IF NOT FOUND THEN
    RETURN '{"error":"Quote not found."}'::jsonb;
  END IF;

  IF v_quote.status NOT IN ('sent', 'viewed') THEN
    RETURN '{"error":"This quote is no longer open for responses."}'::jsonb;
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < NOW() THEN
    RETURN '{"error":"This quote has expired. Please contact us for an updated quote."}'::jsonb;
  END IF;

  -- Record the response
  UPDATE quotes
  SET    status       = p_response,
         responded_at = NOW()
  WHERE  id = v_quote.id;

  -- If accepted: create a linked job atomically in the same transaction
  IF p_response = 'accepted' THEN
    SELECT quote_number INTO v_quote_num
    FROM   quotes
    WHERE  id = v_quote.id;

    -- Resolve the org's "Other" job type (created by the migration seed)
    SELECT id INTO v_other_type_id
    FROM   job_types
    WHERE  organisation_id = v_quote.organisation_id
      AND  name            = 'Other'
      AND  is_active       = true
    LIMIT 1;

    -- Fallback: pick any active job type if "Other" was deleted
    IF v_other_type_id IS NULL THEN
      SELECT id INTO v_other_type_id
      FROM   job_types
      WHERE  organisation_id = v_quote.organisation_id
        AND  is_active       = true
      ORDER  BY sort_order
      LIMIT  1;
    END IF;

    INSERT INTO jobs (
      organisation_id, client_id, property_id,
      job_type_id, service_type, status, scheduled_date, price, notes
    )
    VALUES (
      v_quote.organisation_id,
      v_quote.client_id,
      v_quote.property_id,
      v_other_type_id,
      'other',
      'scheduled',
      CURRENT_DATE,
      v_quote.total,
      'From quote ' || v_quote_num || ': ' || v_quote.title
    )
    RETURNING id INTO v_job_id;

    UPDATE quotes
    SET    job_id = v_job_id
    WHERE  id     = v_quote.id;
  END IF;

  RETURN '{"success":true}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public_respond_to_quote(TEXT, TEXT) TO anon;


-- ---------------------------------------------------------------------------
-- 7. Seed job types for new orgs via a trigger on organisations INSERT
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION seed_default_job_types()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO job_types (organisation_id, name, sort_order)
  VALUES
    (NEW.id, 'Regular Clean',  0),
    (NEW.id, 'Deep Clean',     1),
    (NEW.id, 'Move In',        2),
    (NEW.id, 'Move Out',       3),
    (NEW.id, 'Post Event',     4),
    (NEW.id, 'Other',          5)
  ON CONFLICT (organisation_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seed_default_job_types
  AFTER INSERT ON organisations
  FOR EACH ROW EXECUTE FUNCTION seed_default_job_types();
