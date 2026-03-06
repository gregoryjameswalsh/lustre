-- =============================================================================
-- LUSTRE Migration: Trial email tracking
-- Tracks which trial nurture emails have been sent to each org so the daily
-- cron job can send each email exactly once.
-- =============================================================================

CREATE TABLE IF NOT EXISTS trial_emails (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email_key       text        NOT NULL,   -- 'day1' | 'day7' | 'day10' | 'day13' | 'day14'
  sent_at         timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organisation_id, email_key)     -- each email sent at most once per org
);

CREATE INDEX IF NOT EXISTS trial_emails_org_idx
  ON trial_emails (organisation_id);

ALTER TABLE trial_emails ENABLE ROW LEVEL SECURITY;

-- Org admins can read which emails have been sent (useful for debugging)
DROP POLICY IF EXISTS "trial_emails_select_own_org" ON trial_emails;
CREATE POLICY "trial_emails_select_own_org"
  ON trial_emails FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

-- Only service functions insert rows — no direct client insert permitted.
-- The cron API route uses the anon key with a SECURITY DEFINER function.


-- ---------------------------------------------------------------------------
-- SECURITY DEFINER function: record_trial_email_sent
-- Called by the cron route (anon client) after a trial email is sent
-- successfully. The UNIQUE constraint ensures idempotency.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION record_trial_email_sent(
  p_org_id   UUID,
  p_email_key TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO trial_emails (organisation_id, email_key)
  VALUES (p_org_id, p_email_key)
  ON CONFLICT (organisation_id, email_key) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION record_trial_email_sent(UUID, TEXT) TO anon;


-- ---------------------------------------------------------------------------
-- SECURITY DEFINER function: get_orgs_needing_trial_email
-- Returns orgs that need a specific trial email sent today.
-- Called by the cron route with the anon key.
--
-- Returns rows: (org_id, org_name, admin_email)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_orgs_needing_trial_email(p_email_key TEXT)
RETURNS TABLE (
  org_id      uuid,
  org_name    text,
  admin_email text
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_day_offset integer;
BEGIN
  -- Map email key to the number of days after trial start
  v_day_offset := CASE p_email_key
    WHEN 'day1'  THEN 1
    WHEN 'day7'  THEN 7
    WHEN 'day10' THEN 10
    WHEN 'day13' THEN 13
    WHEN 'day14' THEN 14
    ELSE NULL
  END;

  IF v_day_offset IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id                        AS org_id,
    o.name                      AS org_name,
    p.email                     AS admin_email
  FROM   organisations o
  JOIN   profiles p ON p.organisation_id = o.id AND p.role = 'admin'
  WHERE  o.plan               = 'free'
    AND  o.trial_ends_at      IS NOT NULL
    -- The email is due on this specific day (within a 24-hour window)
    AND  now() >= (o.trial_ends_at - INTERVAL '14 days' + (v_day_offset || ' days')::INTERVAL)
    AND  now() <  (o.trial_ends_at - INTERVAL '14 days' + (v_day_offset || ' days')::INTERVAL + INTERVAL '1 day')
    -- Not already sent
    AND  NOT EXISTS (
      SELECT 1 FROM trial_emails te
      WHERE te.organisation_id = o.id
        AND te.email_key       = p_email_key
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_orgs_needing_trial_email(TEXT) TO anon;
