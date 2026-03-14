-- =============================================================================
-- LUSTRE Migration: Booking Requests (Client Portal Phase 2)
-- Purpose: Allow portal clients to self-serve job requests.  Operators can
--          approve, decline, or propose an alternative date.
--
-- Changes:
--   1. booking_requests table
--   2. RLS policies (operator + portal SECURITY DEFINER)
--   3. SECURITY DEFINER RPCs for portal client access
--   4. SECURITY DEFINER RPC for cron stale-request detection
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. booking_requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS booking_requests (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id        uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  property_id      uuid        REFERENCES properties(id)             ON DELETE SET NULL,
  job_type_id      uuid        REFERENCES job_types(id)              ON DELETE SET NULL,
  requested_date   date,
  preferred_time   text        CHECK (preferred_time IN ('morning','afternoon','evening','flexible')),
  notes            text,
  -- Lifecycle
  status           text        NOT NULL DEFAULT 'pending'
    CONSTRAINT booking_requests_status_check
      CHECK (status IN (
        'pending',
        'approved',
        'declined',
        'alternative_proposed',
        'client_accepted_alternative',
        'client_declined_alternative',
        'cancelled'
      )),
  -- Operator response
  operator_notes   text,
  proposed_date    date,
  proposed_time    text        CHECK (proposed_time IN ('morning','afternoon','evening','flexible')),
  actioned_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  actioned_at      timestamptz,
  -- Stale reminder tracking
  stale_reminder_sent_at timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS booking_requests_org
  ON booking_requests (organisation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_requests_client
  ON booking_requests (client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS booking_requests_status
  ON booking_requests (organisation_id, status, created_at DESC);

ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- Operators can read and manage all booking requests for their org
DROP POLICY IF EXISTS "booking_requests_own_org" ON booking_requests;
CREATE POLICY "booking_requests_own_org"
  ON booking_requests FOR ALL TO authenticated
  USING  (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 2. updated_at trigger
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION booking_requests_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS booking_requests_updated_at ON booking_requests;
CREATE TRIGGER booking_requests_updated_at
  BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION booking_requests_set_updated_at();


-- ---------------------------------------------------------------------------
-- 3a. portal_get_booking_requests
--     Portal client: list all their booking requests newest-first.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_booking_requests(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_org_id    uuid;
  v_result    jsonb;
BEGIN
  -- Resolve portal client
  SELECT c.id, c.organisation_id
  INTO   v_client_id, v_org_id
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',             br.id,
      'status',         br.status,
      'requested_date', br.requested_date,
      'preferred_time', br.preferred_time,
      'notes',          br.notes,
      'job_type_name',  jt.name,
      'property_address', p.address_line1,
      'property_town',    p.town,
      'proposed_date',  br.proposed_date,
      'proposed_time',  br.proposed_time,
      'operator_notes', br.operator_notes,
      'created_at',     br.created_at
    )
    ORDER BY br.created_at DESC
  )
  INTO v_result
  FROM   booking_requests br
  LEFT JOIN job_types   jt ON jt.id = br.job_type_id
  LEFT JOIN properties  p  ON p.id  = br.property_id
  WHERE  br.client_id       = v_client_id
    AND  br.organisation_id = v_org_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_booking_requests(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3b. portal_get_booking_request_detail
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_booking_request_detail(p_org_slug TEXT, p_request_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_org_id    uuid;
  v_result    jsonb;
BEGIN
  SELECT c.id, c.organisation_id
  INTO   v_client_id, v_org_id
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised');
  END IF;

  SELECT jsonb_build_object(
    'id',              br.id,
    'status',          br.status,
    'requested_date',  br.requested_date,
    'preferred_time',  br.preferred_time,
    'notes',           br.notes,
    'operator_notes',  br.operator_notes,
    'proposed_date',   br.proposed_date,
    'proposed_time',   br.proposed_time,
    'job_type_id',     br.job_type_id,
    'job_type_name',   jt.name,
    'property_id',     br.property_id,
    'property_address', p.address_line1,
    'property_address2', p.address_line2,
    'property_town',   p.town,
    'property_postcode', p.postcode,
    'created_at',      br.created_at,
    'updated_at',      br.updated_at
  )
  INTO v_result
  FROM   booking_requests br
  LEFT JOIN job_types  jt ON jt.id = br.job_type_id
  LEFT JOIN properties p  ON p.id  = br.property_id
  WHERE  br.id            = p_request_id
    AND  br.client_id     = v_client_id
    AND  br.organisation_id = v_org_id;

  IF v_result IS NULL THEN
    RETURN jsonb_build_object('error', 'Not found');
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_booking_request_detail(TEXT, UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3c. portal_submit_booking_request
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_submit_booking_request(
  p_org_slug      TEXT,
  p_property_id   UUID,
  p_job_type_id   UUID,
  p_requested_date DATE,
  p_preferred_time TEXT,
  p_notes         TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_org_id    uuid;
  v_new_id    uuid;
BEGIN
  SELECT c.id, c.organisation_id
  INTO   v_client_id, v_org_id
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised or portal not enabled.');
  END IF;

  -- Validate property belongs to this client's org
  IF p_property_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM properties
      WHERE id = p_property_id AND organisation_id = v_org_id AND client_id = v_client_id
    ) THEN
      RETURN jsonb_build_object('error', 'Property not found.');
    END IF;
  END IF;

  -- Validate job type belongs to this org
  IF p_job_type_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM job_types
      WHERE id = p_job_type_id AND organisation_id = v_org_id AND is_active = true
    ) THEN
      RETURN jsonb_build_object('error', 'Service type not found.');
    END IF;
  END IF;

  -- Rate-limit: max 5 pending requests per client
  IF (
    SELECT COUNT(*) FROM booking_requests
    WHERE client_id = v_client_id AND status = 'pending'
  ) >= 5 THEN
    RETURN jsonb_build_object('error', 'You have too many open requests. Please wait for a response before submitting another.');
  END IF;

  INSERT INTO booking_requests (
    organisation_id, client_id, property_id, job_type_id,
    requested_date, preferred_time, notes
  )
  VALUES (
    v_org_id, v_client_id, p_property_id, p_job_type_id,
    p_requested_date, COALESCE(p_preferred_time, 'flexible'), p_notes
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('id', v_new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_submit_booking_request(TEXT, UUID, UUID, DATE, TEXT, TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3d. portal_cancel_booking_request
--     Client may cancel requests that are still pending or alternative_proposed.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_cancel_booking_request(p_org_slug TEXT, p_request_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_org_id    uuid;
  v_status    text;
BEGIN
  SELECT c.id, c.organisation_id
  INTO   v_client_id, v_org_id
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised');
  END IF;

  SELECT status INTO v_status
  FROM   booking_requests
  WHERE  id = p_request_id AND client_id = v_client_id AND organisation_id = v_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found.');
  END IF;

  IF v_status NOT IN ('pending', 'alternative_proposed') THEN
    RETURN jsonb_build_object('error', 'This request cannot be cancelled at this stage.');
  END IF;

  UPDATE booking_requests
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_cancel_booking_request(TEXT, UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 3e. portal_respond_to_alternative
--     Client accepts or declines the operator's proposed alternative date.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_respond_to_alternative(
  p_org_slug   TEXT,
  p_request_id UUID,
  p_accept     BOOLEAN
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_org_id    uuid;
  v_status    text;
BEGIN
  SELECT c.id, c.organisation_id
  INTO   v_client_id, v_org_id
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised');
  END IF;

  SELECT status INTO v_status
  FROM   booking_requests
  WHERE  id = p_request_id AND client_id = v_client_id AND organisation_id = v_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found.');
  END IF;

  IF v_status != 'alternative_proposed' THEN
    RETURN jsonb_build_object('error', 'No pending alternative to respond to.');
  END IF;

  UPDATE booking_requests
  SET
    status     = CASE WHEN p_accept THEN 'client_accepted_alternative' ELSE 'client_declined_alternative' END,
    updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_respond_to_alternative(TEXT, UUID, BOOLEAN) TO authenticated;


-- ---------------------------------------------------------------------------
-- 4. portal_get_job_types_for_org
--    Portal client: fetch active job types to populate the request form.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_job_types_for_org(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_org_id    uuid;
  v_result    jsonb;
BEGIN
  SELECT c.id, c.organisation_id
  INTO   v_client_id, v_org_id
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object('id', id, 'name', name)
    ORDER BY sort_order, name
  )
  INTO v_result
  FROM job_types
  WHERE organisation_id = v_org_id AND is_active = true;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_job_types_for_org(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 5. cron_flag_stale_booking_requests
--    Returns pending requests older than 7 days that haven't had a reminder
--    sent.  Also marks stale_reminder_sent_at = now() atomically.
--    Called by the daily cron job.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cron_flag_stale_booking_requests()
RETURNS TABLE (
  request_id        uuid,
  org_id            uuid,
  org_name          text,
  org_email         text,
  client_first      text,
  client_last       text,
  requested_date    date,
  job_type_name     text,
  dashboard_url_key text   -- just the request id, caller builds full URL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH stale AS (
    UPDATE booking_requests br
    SET    stale_reminder_sent_at = now()
    WHERE  br.status  = 'pending'
      AND  br.created_at < now() - INTERVAL '7 days'
      AND  br.stale_reminder_sent_at IS NULL
    RETURNING br.*
  )
  SELECT
    s.id,
    s.organisation_id,
    o.name,
    o.email,
    c.first_name,
    c.last_name,
    s.requested_date,
    jt.name,
    s.id::text
  FROM   stale            s
  JOIN   organisations    o  ON o.id  = s.organisation_id
  JOIN   clients          c  ON c.id  = s.client_id
  LEFT JOIN job_types     jt ON jt.id = s.job_type_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cron_flag_stale_booking_requests() TO anon;
