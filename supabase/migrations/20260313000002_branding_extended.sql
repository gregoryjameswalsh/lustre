-- =============================================================================
-- LUSTRE — Extended Branding Fields
-- Adds brand_color_secondary and tagline to organisations.
-- Updates cron_invoice_dunning to return logo_url + brand_color for branded
-- dunning emails.
-- =============================================================================

-- 1. Secondary brand colour — used for alternating table rows, info boxes, etc.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS brand_color_secondary TEXT DEFAULT NULL;

-- 2. Business tagline — short motto shown in PDF header and email footer
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT NULL;

-- 3. Update cron_invoice_dunning to include branding fields so the cron job
-- can send fully branded overdue reminder emails.
-- DROP first because CREATE OR REPLACE cannot change a function's return type.
DROP FUNCTION IF EXISTS public.cron_invoice_dunning();
CREATE OR REPLACE FUNCTION public.cron_invoice_dunning()
RETURNS TABLE (
  invoice_id        UUID,
  invoice_number    TEXT,
  total             NUMERIC,
  amount_paid       NUMERIC,
  due_date          DATE,
  view_token        UUID,
  dunning_step      INTEGER,
  client_email      TEXT,
  client_first      TEXT,
  client_last       TEXT,
  org_id            UUID,
  org_name          TEXT,
  org_email         TEXT,
  custom_from_email TEXT,
  org_logo_url      TEXT,
  org_brand_color   TEXT
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
        i.dunning_step = 0
        OR
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
    u.dunning_step,
    c.email,
    c.first_name,
    c.last_name,
    o.id,
    o.name,
    o.email,
    o.custom_from_email,
    o.logo_url,
    o.brand_color
  FROM   updated u
  JOIN   invoices i ON i.id = u.id
  JOIN   clients  c ON c.id = i.client_id
  JOIN   organisations o ON o.id = i.organisation_id
  WHERE  c.email IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cron_invoice_dunning TO anon;
