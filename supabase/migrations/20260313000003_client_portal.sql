-- =============================================================================
-- LUSTRE Migration: Client Portal (Phase 1)
-- Purpose: Allow operators to invite end-clients to a self-service portal where
--          they can view their upcoming/historical jobs, submit special
--          instructions, and see their registered properties.
--
-- Changes:
--   1. clients table — portal_status, portal_invited_at, portal_activated_at,
--                      portal_user_id
--   2. jobs table    — client_instruction, client_instruction_at,
--                      client_instruction_seen
--   3. client_portal_settings table  (per-org portal configuration)
--   4. client_portal_invitations table
--   5. SECURITY DEFINER helper functions (anon + authenticated RPCs)
--
-- Security model:
--   All portal client reads/writes go through SECURITY DEFINER functions that
--   verify auth.uid() maps to an active portal client for the requested org.
--   No RLS changes are made to existing tables — existing operator policies
--   remain untouched.  Portal clients have no profiles row and are therefore
--   excluded from all existing operator policies automatically.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. clients — portal columns
-- ---------------------------------------------------------------------------

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS portal_status       text NOT NULL DEFAULT 'not_invited'
    CONSTRAINT clients_portal_status_check
      CHECK (portal_status IN ('not_invited', 'invited', 'active', 'suspended')),
  ADD COLUMN IF NOT EXISTS portal_invited_at   timestamptz,
  ADD COLUMN IF NOT EXISTS portal_activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS portal_user_id      uuid
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS clients_portal_user_id_unique
  ON clients (portal_user_id)
  WHERE portal_user_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 2. jobs — client instruction columns
-- ---------------------------------------------------------------------------

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS client_instruction      text,
  ADD COLUMN IF NOT EXISTS client_instruction_at   timestamptz,
  ADD COLUMN IF NOT EXISTS client_instruction_seen boolean NOT NULL DEFAULT false;


-- ---------------------------------------------------------------------------
-- 3. client_portal_settings — per-org portal configuration
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_portal_settings (
  organisation_id           uuid        PRIMARY KEY
    REFERENCES organisations(id) ON DELETE CASCADE,
  portal_enabled            boolean     NOT NULL DEFAULT false,
  portal_slug               text        UNIQUE,          -- URL-safe slug, e.g. 'sparkle-clean'
  show_team_member_name     boolean     NOT NULL DEFAULT true,
  show_job_pricing          boolean     NOT NULL DEFAULT false,
  share_completed_notes     boolean     NOT NULL DEFAULT false,
  instruction_cutoff_hours  integer     NOT NULL DEFAULT 24,
  welcome_message           text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_portal_settings ENABLE ROW LEVEL SECURITY;

-- Operators can manage their own portal settings
DROP POLICY IF EXISTS "portal_settings_own_org" ON client_portal_settings;
CREATE POLICY "portal_settings_own_org"
  ON client_portal_settings FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 4. client_portal_invitations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS client_portal_invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  email           text        NOT NULL,
  token           text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  expires_at      timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at         timestamptz,
  created_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portal_invitations_token
  ON client_portal_invitations (token);

CREATE INDEX IF NOT EXISTS portal_invitations_client
  ON client_portal_invitations (client_id, created_at DESC);

ALTER TABLE client_portal_invitations ENABLE ROW LEVEL SECURITY;

-- Operators can manage portal invitations for their org
DROP POLICY IF EXISTS "portal_invitations_own_org" ON client_portal_invitations;
CREATE POLICY "portal_invitations_own_org"
  ON client_portal_invitations FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id())
  WITH CHECK (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 5. SECURITY DEFINER functions
-- ---------------------------------------------------------------------------

-- 5a. public_get_portal_invite_by_token
--     Anon-callable — used on the public /portal/[slug]/invite/[token] page.
--     Returns only safe fields (org branding, client first name, expiry).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_get_portal_invite_by_token(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',               i.id,
    'email',            i.email,
    'expires_at',       i.expires_at,
    'used_at',          i.used_at,
    'org_name',         o.name,
    'org_slug',         ps.portal_slug,
    'org_brand_color',  o.brand_color,
    'org_logo_url',     o.logo_url,
    'client_first_name', c.first_name
  )
  INTO v_result
  FROM   client_portal_invitations i
  JOIN   organisations              o  ON o.id  = i.organisation_id
  JOIN   clients                    c  ON c.id  = i.client_id
  LEFT JOIN client_portal_settings  ps ON ps.organisation_id = i.organisation_id
  WHERE  i.token = p_token;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public_get_portal_invite_by_token(TEXT) TO anon;


-- 5b. portal_activate_client_account
--     Authenticated — called after the client clicks a magic link from their
--     invitation email.  Links auth.uid() → clients.portal_user_id.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_activate_client_account(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    uuid;
  v_user_email text;
  v_invite     client_portal_invitations%ROWTYPE;
  v_org_slug   text;
BEGIN
  v_user_id    := auth.uid();
  v_user_email := auth.jwt() ->> 'email';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  SELECT * INTO v_invite
  FROM   client_portal_invitations
  WHERE  token     = p_token
    AND  used_at   IS NULL
    AND  expires_at > now()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found or expired.');
  END IF;

  IF lower(v_invite.email) != lower(v_user_email) THEN
    RETURN jsonb_build_object('error', 'Email does not match the invitation.');
  END IF;

  -- Link the auth user to the client record
  UPDATE clients
  SET    portal_user_id      = v_user_id,
         portal_status       = 'active',
         portal_activated_at = now()
  WHERE  id              = v_invite.client_id
    AND  organisation_id = v_invite.organisation_id;

  -- Mark the invitation as used
  UPDATE client_portal_invitations
  SET    used_at = now()
  WHERE  id = v_invite.id;

  -- Return the org slug so the caller can redirect to the dashboard
  SELECT portal_slug INTO v_org_slug
  FROM   client_portal_settings
  WHERE  organisation_id = v_invite.organisation_id;

  RETURN jsonb_build_object('success', true, 'org_slug', v_org_slug);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_activate_client_account(TEXT) TO authenticated;


-- 5c. portal_get_client_context
--     Authenticated — validates the current user is an active portal client
--     for the org identified by p_org_slug.  Returns client info + org branding
--     + portal settings.  Returns NULL if access is denied.
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
    'welcome_message',        v_settings.welcome_message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_client_context(TEXT) TO authenticated;


-- 5d. portal_get_upcoming_jobs
--     Returns upcoming (scheduled / in_progress) jobs for the portal client.
--     Respects show_team_member_name and show_job_pricing operator settings.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_upcoming_jobs(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id      uuid;
  v_org_id         uuid;
  v_cutoff_hours   integer;
  v_show_name      boolean;
  v_show_pricing   boolean;
  v_result         jsonb;
BEGIN
  SELECT c.id, c.organisation_id,
         ps.instruction_cutoff_hours, ps.show_team_member_name, ps.show_job_pricing
  INTO   v_client_id, v_org_id, v_cutoff_hours, v_show_name, v_show_pricing
  FROM   clients c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id  = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',                  j.id,
      'status',              j.status,
      'scheduled_date',      j.scheduled_date,
      'scheduled_time',      j.scheduled_time,
      'duration_hours',      j.duration_hours,
      'job_type_name',       jt.name,
      'property_id',         j.property_id,
      'property_address',    p.address_line1,
      'property_town',       p.town,
      'property_postcode',   p.postcode,
      'client_instruction',  j.client_instruction,
      'client_instruction_at', j.client_instruction_at,
      'instruction_cutoff_at', CASE
          WHEN j.scheduled_date IS NOT NULL AND j.scheduled_time IS NOT NULL
          THEN (j.scheduled_date::text || ' ' || j.scheduled_time::text)::timestamptz
               - (v_cutoff_hours || ' hours')::interval
          ELSE NULL
        END,
      'assigned_name',  CASE WHEN v_show_name  THEN pr.full_name      ELSE NULL END,
      'price',          CASE WHEN v_show_pricing THEN j.price          ELSE NULL END
    )
    ORDER BY j.scheduled_date ASC NULLS LAST, j.scheduled_time ASC NULLS LAST
  ) INTO v_result
  FROM   jobs       j
  LEFT JOIN job_types jt ON jt.id = j.job_type_id
  LEFT JOIN properties p  ON p.id  = j.property_id
  LEFT JOIN profiles   pr ON pr.id = j.assigned_to
  WHERE  j.client_id       = v_client_id
    AND  j.organisation_id = v_org_id
    AND  j.status          IN ('scheduled', 'in_progress')
    AND  j.scheduled_date  >= CURRENT_DATE;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_upcoming_jobs(TEXT) TO authenticated;


-- 5e. portal_get_job_history
--     Returns completed / cancelled jobs for the portal client (last 50).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_job_history(p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id    uuid;
  v_org_id       uuid;
  v_show_notes   boolean;
  v_show_pricing boolean;
  v_result       jsonb;
BEGIN
  SELECT c.id, c.organisation_id,
         ps.share_completed_notes, ps.show_job_pricing
  INTO   v_client_id, v_org_id, v_show_notes, v_show_pricing
  FROM   clients c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id  = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',              j.id,
      'status',          j.status,
      'scheduled_date',  j.scheduled_date,
      'completed_at',    j.completed_at,
      'job_type_name',   jt.name,
      'property_address', p.address_line1,
      'property_town',   p.town,
      'property_postcode', p.postcode,
      'notes',  CASE WHEN v_show_notes AND j.status = 'completed' THEN j.notes ELSE NULL END,
      'price',  CASE WHEN v_show_pricing THEN j.price ELSE NULL END
    )
    ORDER BY j.scheduled_date DESC NULLS LAST
  ) INTO v_result
  FROM   jobs      j
  LEFT JOIN job_types jt ON jt.id = j.job_type_id
  LEFT JOIN properties p  ON p.id  = j.property_id
  WHERE  j.client_id       = v_client_id
    AND  j.organisation_id = v_org_id
    AND  j.status          IN ('completed', 'cancelled')
  LIMIT 50;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_job_history(TEXT) TO authenticated;


-- 5f. portal_get_job_detail
--     Returns full job detail for a single job — validates ownership.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_job_detail(p_job_id UUID, p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_client_id    uuid;
  v_org_id       uuid;
  v_cutoff_hours integer;
  v_show_name    boolean;
  v_show_pricing boolean;
  v_show_notes   boolean;
  v_result       jsonb;
BEGIN
  SELECT c.id, c.organisation_id,
         ps.instruction_cutoff_hours, ps.show_team_member_name,
         ps.show_job_pricing, ps.share_completed_notes
  INTO   v_client_id, v_org_id, v_cutoff_hours, v_show_name, v_show_pricing, v_show_notes
  FROM   clients c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id  = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id',                    j.id,
    'status',                j.status,
    'scheduled_date',        j.scheduled_date,
    'scheduled_time',        j.scheduled_time,
    'duration_hours',        j.duration_hours,
    'job_type_name',         jt.name,
    'property_id',           j.property_id,
    'property_address',      p.address_line1,
    'property_address_line2', p.address_line2,
    'property_town',         p.town,
    'property_county',       p.county,
    'property_postcode',     p.postcode,
    'client_instruction',    j.client_instruction,
    'client_instruction_at', j.client_instruction_at,
    'instruction_cutoff_at', CASE
        WHEN j.scheduled_date IS NOT NULL AND j.scheduled_time IS NOT NULL
        THEN (j.scheduled_date::text || ' ' || j.scheduled_time::text)::timestamptz
             - (v_cutoff_hours || ' hours')::interval
        ELSE NULL
      END,
    'assigned_name', CASE WHEN v_show_name   THEN pr.full_name ELSE NULL END,
    'price',         CASE WHEN v_show_pricing THEN j.price      ELSE NULL END,
    'notes',         CASE WHEN v_show_notes AND j.status = 'completed' THEN j.notes ELSE NULL END
  ) INTO v_result
  FROM   jobs      j
  LEFT JOIN job_types jt ON jt.id = j.job_type_id
  LEFT JOIN properties p  ON p.id  = j.property_id
  LEFT JOIN profiles   pr ON pr.id = j.assigned_to
  WHERE  j.id             = p_job_id
    AND  j.client_id      = v_client_id
    AND  j.organisation_id = v_org_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_job_detail(UUID, TEXT) TO authenticated;


-- 5g. portal_submit_job_instruction
--     Allows a portal client to submit or update a special instruction for an
--     upcoming job.  Enforces: ownership, scheduled status, cut-off window,
--     500-char limit.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_submit_job_instruction(
  p_job_id     UUID,
  p_org_slug   TEXT,
  p_instruction TEXT
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id    uuid;
  v_org_id       uuid;
  v_cutoff_hours integer;
  v_job          jobs%ROWTYPE;
  v_cutoff_at    timestamptz;
BEGIN
  -- Validate length
  IF length(trim(p_instruction)) = 0 THEN
    RETURN jsonb_build_object('error', 'Instruction cannot be empty.');
  END IF;
  IF length(p_instruction) > 500 THEN
    RETURN jsonb_build_object('error', 'Instruction must be 500 characters or fewer.');
  END IF;

  -- Identify the portal client
  SELECT c.id, c.organisation_id, ps.instruction_cutoff_hours
  INTO   v_client_id, v_org_id, v_cutoff_hours
  FROM   clients c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id  = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Portal access denied.');
  END IF;

  -- Fetch the job (with lock)
  SELECT * INTO v_job
  FROM   jobs
  WHERE  id              = p_job_id
    AND  client_id       = v_client_id
    AND  organisation_id = v_org_id
    AND  status          = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found or no longer scheduled.');
  END IF;

  -- Enforce cut-off
  IF v_job.scheduled_date IS NOT NULL AND v_job.scheduled_time IS NOT NULL THEN
    v_cutoff_at := (v_job.scheduled_date::text || ' ' || v_job.scheduled_time::text)::timestamptz
                   - (v_cutoff_hours || ' hours')::interval;
    IF now() >= v_cutoff_at THEN
      RETURN jsonb_build_object(
        'error',
        'Instructions for this visit are now locked in. Please contact us directly for urgent changes.'
      );
    END IF;
  END IF;

  UPDATE jobs
  SET    client_instruction      = p_instruction,
         client_instruction_at   = now(),
         client_instruction_seen = false
  WHERE  id = p_job_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_submit_job_instruction(UUID, TEXT, TEXT) TO authenticated;


-- 5h. portal_clear_job_instruction
--     Allows a portal client to remove their instruction before the cut-off.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_clear_job_instruction(p_job_id UUID, p_org_slug TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id    uuid;
  v_org_id       uuid;
  v_cutoff_hours integer;
  v_job          jobs%ROWTYPE;
  v_cutoff_at    timestamptz;
BEGIN
  SELECT c.id, c.organisation_id, ps.instruction_cutoff_hours
  INTO   v_client_id, v_org_id, v_cutoff_hours
  FROM   clients c
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id  = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Portal access denied.');
  END IF;

  SELECT * INTO v_job
  FROM   jobs
  WHERE  id              = p_job_id
    AND  client_id       = v_client_id
    AND  organisation_id = v_org_id
    AND  status          = 'scheduled'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found.');
  END IF;

  IF v_job.scheduled_date IS NOT NULL AND v_job.scheduled_time IS NOT NULL THEN
    v_cutoff_at := (v_job.scheduled_date::text || ' ' || v_job.scheduled_time::text)::timestamptz
                   - (v_cutoff_hours || ' hours')::interval;
    IF now() >= v_cutoff_at THEN
      RETURN jsonb_build_object('error', 'Cut-off has passed. Please contact us directly.');
    END IF;
  END IF;

  UPDATE jobs
  SET    client_instruction     = NULL,
         client_instruction_at  = NULL
  WHERE  id = p_job_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_clear_job_instruction(UUID, TEXT) TO authenticated;


-- 5i. operator_acknowledge_client_instruction
--     Lets an authenticated operator/team member mark a client instruction as
--     seen on the job detail page.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION operator_acknowledge_client_instruction(p_job_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
BEGIN
  v_org_id := get_user_org_id();

  IF v_org_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated.');
  END IF;

  UPDATE jobs
  SET    client_instruction_seen = true
  WHERE  id              = p_job_id
    AND  organisation_id = v_org_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job not found.');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION operator_acknowledge_client_instruction(UUID) TO authenticated;


-- 5j. portal_get_properties
--     Returns the portal client's registered properties (address-only fields,
--     no security-sensitive data).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION portal_get_properties(p_org_slug TEXT)
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
  JOIN   client_portal_settings ps ON ps.organisation_id = c.organisation_id
  WHERE  c.portal_user_id  = auth.uid()
    AND  ps.portal_slug    = p_org_slug
    AND  c.portal_status   = 'active'
    AND  ps.portal_enabled = true;

  IF NOT FOUND THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id',             p.id,
      'address_line1',  p.address_line1,
      'address_line2',  p.address_line2,
      'town',           p.town,
      'county',         p.county,
      'postcode',       p.postcode,
      'property_type',  p.property_type,
      'bedrooms',       p.bedrooms,
      'bathrooms',      p.bathrooms
    )
    ORDER BY p.created_at ASC
  ) INTO v_result
  FROM   properties p
  WHERE  p.client_id       = v_client_id
    AND  p.organisation_id = v_org_id;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION portal_get_properties(TEXT) TO authenticated;
