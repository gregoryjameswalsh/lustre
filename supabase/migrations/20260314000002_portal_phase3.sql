-- =============================================================================
-- LUSTRE Migration: Client Portal Phase 3 — Enhanced Portal
-- Purpose:
--   1. client_portal_settings — add allow_invoice_access, job_reminder_days
--   2. jobs — add client_reminder_sent_at (tracks per-job reminder dispatch)
--   3. clients — add calendar_token (for iCal subscription URLs)
--   4. SECURITY DEFINER RPCs:
--       portal_get_invoices            — client views their invoices
--       portal_get_calendar_token      — get/create calendar token
--       cron_get_portal_job_reminders  — daily cron: upcoming-job reminders
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. client_portal_settings — Phase 3 columns
-- ---------------------------------------------------------------------------

ALTER TABLE client_portal_settings
  ADD COLUMN IF NOT EXISTS allow_invoice_access boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS job_reminder_days    integer;    -- NULL = disabled, 1 = 1 day before, etc.

COMMENT ON COLUMN client_portal_settings.job_reminder_days IS
  'Days before a scheduled job to send a reminder email to the portal client. NULL = disabled.';


-- ---------------------------------------------------------------------------
-- 2. jobs — client reminder tracking
-- ---------------------------------------------------------------------------

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_reminder_sent_at timestamptz;


-- ---------------------------------------------------------------------------
-- 3. clients — calendar token (for iCal subscription URLs)
-- ---------------------------------------------------------------------------

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS calendar_token text
    DEFAULT encode(gen_random_bytes(24), 'hex');

CREATE UNIQUE INDEX IF NOT EXISTS clients_calendar_token_unique
  ON clients (calendar_token)
  WHERE calendar_token IS NOT NULL;

-- Back-fill existing clients that don't have a token yet
UPDATE clients
SET    calendar_token = encode(gen_random_bytes(24), 'hex')
WHERE  calendar_token IS NULL;

ALTER TABLE clients
  ALTER COLUMN calendar_token SET NOT NULL,
  ALTER COLUMN calendar_token SET DEFAULT encode(gen_random_bytes(24), 'hex');


-- ---------------------------------------------------------------------------
-- 4a. portal_get_invoices
--     Portal client: list their invoices (non-draft, non-void) newest first.
--     Requires allow_invoice_access = true on the org's portal settings.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_invoices(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id          uuid;
  v_org_id             uuid;
  v_allow_invoices     boolean;
  v_result             jsonb;
BEGIN
  SELECT c.id, c.organisation_id, ps.allow_invoice_access
  INTO   v_client_id, v_org_id, v_allow_invoices
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised');
  END IF;

  IF NOT v_allow_invoices THEN
    RETURN jsonb_build_object('error', 'Invoice access is not enabled for this portal.');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',             i.id,
      'invoice_number', i.invoice_number,
      'status',         i.status,
      'total',          i.total,
      'amount_paid',    i.amount_paid,
      'due_date',       i.due_date,
      'issued_at',      i.created_at,
      'view_token',     i.view_token
    )
    ORDER BY i.created_at DESC
  )
  INTO v_result
  FROM   invoices i
  WHERE  i.organisation_id = v_org_id
    AND  i.client_id       = v_client_id
    AND  i.status NOT IN ('draft', 'void');

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_invoices(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 4b. portal_get_calendar_token
--     Returns the portal client's calendar_token for iCal subscription.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_calendar_token(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id     uuid;
  v_cal_token     text;
BEGIN
  SELECT c.id, c.calendar_token
  INTO   v_client_id, v_cal_token
  FROM   clients              c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Unauthorised');
  END IF;

  RETURN jsonb_build_object('calendar_token', v_cal_token);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_calendar_token(TEXT) TO authenticated;


-- ---------------------------------------------------------------------------
-- 4c. cron_get_portal_job_reminders
--     Called daily by the cron job.
--     Returns upcoming jobs where:
--       - the client has an active portal account
--       - the org has job_reminder_days set
--       - the job is scheduled exactly N days from today
--       - client_reminder_sent_at IS NULL (not yet reminded)
--     Atomically marks client_reminder_sent_at = now() on returned rows.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cron_get_portal_job_reminders()
RETURNS TABLE (
  job_id           uuid,
  org_id           uuid,
  org_name         text,
  org_brand_color  text,
  org_logo_url     text,
  client_email     text,
  client_first     text,
  job_type_name    text,
  scheduled_date   date,
  scheduled_time   text,
  property_address text,
  portal_slug      text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH reminded AS (
    UPDATE jobs j
    SET    client_reminder_sent_at = now()
    FROM   clients              c
    JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
    WHERE  c.id                       = j.client_id
      AND  c.portal_status             = 'active'
      AND  c.portal_user_id           IS NOT NULL
      AND  ps.job_reminder_days        IS NOT NULL
      AND  j.status                    = 'scheduled'
      AND  j.scheduled_date            = CURRENT_DATE + (ps.job_reminder_days || ' days')::interval
      AND  j.client_reminder_sent_at   IS NULL
      AND  j.organisation_id           = c.organisation_id
    RETURNING j.*, c.email AS c_email, c.first_name AS c_first, ps.portal_slug AS p_slug,
              ps.job_reminder_days AS reminder_days
  )
  SELECT
    r.id,
    r.organisation_id,
    o.name,
    o.brand_color,
    o.logo_url,
    r.c_email,
    r.c_first,
    jt.name,
    r.scheduled_date,
    r.scheduled_time::text,
    p.address_line1,
    r.p_slug
  FROM   reminded         r
  JOIN   organisations    o   ON o.id  = r.organisation_id
  LEFT JOIN job_types     jt  ON jt.id = r.job_type_id
  LEFT JOIN properties    p   ON p.id  = r.property_id;
END;
$$;

GRANT EXECUTE ON FUNCTION cron_get_portal_job_reminders() TO anon;


-- ---------------------------------------------------------------------------
-- 4d. portal_get_upcoming_jobs_by_calendar_token
--     Public (anon) endpoint for iCal subscription feed.
--     Accepts the client's calendar_token, returns upcoming jobs.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_upcoming_jobs_by_calendar_token(p_token TEXT)
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
  FROM   clients c
  WHERE  c.calendar_token = p_token
    AND  c.portal_status  = 'active';

  IF v_client_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid token');
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',             j.id,
      'scheduled_date', j.scheduled_date,
      'scheduled_time', j.scheduled_time,
      'duration_hours', j.duration_hours,
      'job_type_name',  jt.name,
      'property_address', p.address_line1,
      'property_town',  p.town,
      'status',         j.status
    )
    ORDER BY j.scheduled_date, j.scheduled_time
  )
  INTO v_result
  FROM   jobs j
  LEFT JOIN job_types  jt ON jt.id = j.job_type_id
  LEFT JOIN properties p  ON p.id  = j.property_id
  WHERE  j.organisation_id = v_org_id
    AND  j.client_id       = v_client_id
    AND  j.status          IN ('scheduled', 'in_progress')
    AND  j.scheduled_date  >= CURRENT_DATE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_upcoming_jobs_by_calendar_token(TEXT) TO anon;


-- ---------------------------------------------------------------------------
-- 5. Update portal_get_client_context to include Phase 3 fields
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_client_context(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client   clients%ROWTYPE;
  v_org      organisations%ROWTYPE;
  v_settings client_portal_settings%ROWTYPE;
BEGIN
  SELECT ps.* INTO v_settings
  FROM   client_portal_settings ps
  WHERE  ps.portal_slug = p_org_slug;

  IF NOT FOUND OR NOT v_settings.portal_enabled THEN
    RETURN NULL;
  END IF;

  SELECT c.* INTO v_client
  FROM   clients c
  WHERE  c.portal_user_id   = auth.uid()
    AND  c.organisation_id  = v_settings.organisation_id
    AND  c.portal_status    = 'active';

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_org FROM organisations WHERE id = v_settings.organisation_id;

  RETURN jsonb_build_object(
    'client_id',              v_client.id,
    'client_first_name',      v_client.first_name,
    'client_last_name',       v_client.last_name,
    'client_email',           v_client.email,
    'org_id',                 v_org.id,
    'org_name',               v_org.name,
    'org_brand_color',        v_org.brand_color,
    'org_logo_url',           v_org.logo_url,
    'show_team_member_name',  v_settings.show_team_member_name,
    'show_job_pricing',       v_settings.show_job_pricing,
    'share_completed_notes',  v_settings.share_completed_notes,
    'instruction_cutoff_hours', v_settings.instruction_cutoff_hours,
    'welcome_message',        v_settings.welcome_message,
    -- Phase 3 additions
    'allow_invoice_access',   COALESCE(v_settings.allow_invoice_access, false),
    'calendar_token',         v_client.calendar_token
  );
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_client_context(TEXT) TO authenticated;
