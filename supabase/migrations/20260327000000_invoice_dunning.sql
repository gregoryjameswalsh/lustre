-- supabase/migrations/20260327000000_invoice_dunning.sql
-- =============================================================================
-- LUSTRE — Invoice dunning: track reminder steps + atomic cron RPC
-- =============================================================================

-- Dunning state on each invoice
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS dunning_step     INTEGER   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dunning_sent_at  TIMESTAMPTZ;

-- Step schedule:
--   0 → 1: immediately when overdue (day 0)
--   1 → 2: 7 days after step 1 was sent
--   2 → 3: 7 days after step 2 was sent (final notice)
--   3: no further emails

-- ── cron_invoice_dunning ─────────────────────────────────────────────────────
-- Called by the daily cron. Atomically finds overdue invoices needing a
-- reminder, increments their dunning_step, and returns the data needed to
-- send emails (client email, org name, etc.).

CREATE OR REPLACE FUNCTION public.cron_invoice_dunning()
RETURNS TABLE (
  invoice_id       UUID,
  invoice_number   TEXT,
  total            NUMERIC,
  amount_paid      NUMERIC,
  due_date         DATE,
  view_token       UUID,
  dunning_step     INTEGER,   -- the NEW step (after increment)
  client_email     TEXT,
  client_first     TEXT,
  client_last      TEXT,
  org_id           UUID,
  org_name         TEXT,
  org_email        TEXT,
  custom_from_email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH eligible AS (
    SELECT i.id
    FROM   invoices i
    WHERE  i.status = 'overdue'
      AND  i.dunning_step < 3
      AND (
        -- Step 0 → 1: send immediately
        i.dunning_step = 0
        OR
        -- Step 1 → 2 / 2 → 3: send 7 days after the previous reminder
        (i.dunning_step IN (1, 2) AND i.dunning_sent_at <= NOW() - INTERVAL '7 days')
      )
  ),
  updated AS (
    UPDATE invoices
    SET
      dunning_step    = invoices.dunning_step + 1,
      dunning_sent_at = NOW()
    FROM eligible
    WHERE invoices.id = eligible.id
    RETURNING invoices.id, invoices.dunning_step
  )
  SELECT
    i.id,
    i.invoice_number,
    i.total,
    i.amount_paid,
    i.due_date,
    i.view_token,
    u.dunning_step,          -- already incremented
    c.email,
    c.first_name,
    c.last_name,
    o.id,
    o.name,
    o.email,
    o.custom_from_email
  FROM   updated u
  JOIN   invoices i ON i.id = u.id
  JOIN   clients  c ON c.id = i.client_id
  JOIN   organisations o ON o.id = i.organisation_id
  WHERE  c.email IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cron_invoice_dunning TO anon;
