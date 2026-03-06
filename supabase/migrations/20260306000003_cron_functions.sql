-- =============================================================================
-- LUSTRE Migration: SECURITY DEFINER functions for the daily cron job
-- =============================================================================
-- These functions are called by the anon Supabase client from the Next.js
-- cron route (/api/cron/daily). They execute as the function owner (postgres),
-- bypassing RLS so they can read and write across all organisations.
--
-- Both functions are atomic: they UPDATE the relevant rows and RETURN the
-- data needed for notification emails in a single CTE, so there is no window
-- where records are marked but emails have not yet been prepared.
--
-- Granting to anon is safe here for the same reason it is safe for the other
-- public_ functions: the operations are idempotent and the HTTP route is
-- protected by the Vercel CRON_SECRET before these are ever called.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. cron_expire_quotes
--    Marks all 'sent' or 'viewed' quotes whose valid_until is in the past
--    as 'expired', and returns a row for each one so the caller can group
--    them by org and send digest emails.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cron_expire_quotes()
RETURNS TABLE (
  quote_id     uuid,
  quote_number text,
  title        text,
  total        numeric,
  valid_until  timestamptz,
  org_id       uuid,
  org_name     text,
  org_email    text,
  client_first text,
  client_last  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE quotes
    SET    status = 'expired'
    WHERE  status      IN ('sent', 'viewed')
      AND  valid_until <  NOW()
    RETURNING id, quote_number, title, total, valid_until, organisation_id, client_id
  )
  SELECT
    e.id,
    e.quote_number,
    e.title,
    e.total,
    e.valid_until,
    o.id,
    o.name,
    o.email,
    c.first_name,
    c.last_name
  FROM  expired        e
  JOIN  organisations  o ON o.id = e.organisation_id
  JOIN  clients        c ON c.id = e.client_id
  WHERE o.email IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION cron_expire_quotes() TO anon;


-- ---------------------------------------------------------------------------
-- 2. cron_get_due_follow_ups
--    Marks all open follow-ups with due_date <= today and no prior reminder
--    as reminded (sets reminder_sent_at = NOW()), and returns a row for each
--    so the caller can group them by org and send digest emails.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cron_get_due_follow_ups()
RETURNS TABLE (
  follow_up_id uuid,
  title        text,
  notes        text,
  due_date     date,
  priority     text,
  org_id       uuid,
  org_name     text,
  org_email    text,
  client_first text,
  client_last  text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH reminded AS (
    UPDATE follow_ups
    SET    reminder_sent_at = NOW()
    WHERE  status           = 'open'
      AND  reminder_sent_at IS NULL
      AND  due_date         <= CURRENT_DATE
    RETURNING id, title, notes, due_date, priority, organisation_id, client_id
  )
  SELECT
    r.id,
    r.title,
    r.notes,
    r.due_date,
    r.priority,
    o.id,
    o.name,
    o.email,
    c.first_name,
    c.last_name
  FROM  reminded       r
  JOIN  organisations  o ON o.id = r.organisation_id
  JOIN  clients        c ON c.id = r.client_id
  WHERE o.email IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION cron_get_due_follow_ups() TO anon;
