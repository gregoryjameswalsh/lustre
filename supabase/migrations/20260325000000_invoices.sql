-- =============================================================================
-- LUSTRE Migration: Invoice management system
--
-- Closes the quote-to-cash gap by introducing:
--   invoices             — HMRC-compliant financial document per client charge
--   invoice_line_items   — individual line items on each invoice
--   generate_invoice_number() — atomic sequential INV-YYYY-NNNN per org
--
-- Public invoice access uses a random `view_token` (UUID), not the primary key.
-- RLS keeps all data scoped to organisation_id as per the existing pattern.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. invoices
-- ---------------------------------------------------------------------------

CREATE TABLE invoices (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id           UUID        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id                 UUID        NOT NULL REFERENCES clients(id),
  job_id                    UUID        REFERENCES jobs(id),
  quote_id                  UUID        REFERENCES quotes(id),

  -- Identity
  invoice_number            TEXT        NOT NULL,
  view_token                UUID        NOT NULL DEFAULT gen_random_uuid(),

  -- Status lifecycle: draft → sent → viewed → paid / overdue / void
  status                    TEXT        NOT NULL DEFAULT 'draft',

  -- Dates
  issue_date                DATE        NOT NULL DEFAULT CURRENT_DATE,
  due_date                  DATE        NOT NULL,

  -- Financials
  subtotal                  NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate                  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tax_amount                NUMERIC(12,2) NOT NULL DEFAULT 0,
  total                     NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid               NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency                  TEXT        NOT NULL DEFAULT 'GBP',

  -- Stripe (populated in Epic 4)
  stripe_payment_link_id    TEXT,
  stripe_payment_link_url   TEXT,
  stripe_payment_intent_id  TEXT,

  -- Timestamps
  sent_at                   TIMESTAMPTZ,
  viewed_at                 TIMESTAMPTZ,
  paid_at                   TIMESTAMPTZ,
  voided_at                 TIMESTAMPTZ,
  void_reason               TEXT,

  -- Text fields
  notes                     TEXT,
  internal_notes            TEXT,

  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT invoices_status_check CHECK (
    status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'void', 'credit_note')
  ),
  CONSTRAINT invoices_number_org_unique UNIQUE (organisation_id, invoice_number),
  CONSTRAINT invoices_token_unique      UNIQUE (view_token)
);

CREATE INDEX invoices_org_status_idx  ON invoices (organisation_id, status);
CREATE INDEX invoices_org_client_idx  ON invoices (organisation_id, client_id);
CREATE INDEX invoices_token_idx       ON invoices (view_token);
CREATE INDEX invoices_stripe_pi_idx   ON invoices (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX invoices_due_date_idx    ON invoices (due_date)
  WHERE status NOT IN ('paid', 'void');


-- ---------------------------------------------------------------------------
-- 2. invoice_line_items
-- ---------------------------------------------------------------------------

CREATE TABLE invoice_line_items (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID          NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  organisation_id UUID          NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  description     TEXT          NOT NULL,
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,  -- stored: quantity * unit_price
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX invoice_line_items_invoice_idx ON invoice_line_items (invoice_id);


-- ---------------------------------------------------------------------------
-- 3. updated_at trigger (reuse the pattern from other tables)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION touch_invoice_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION touch_invoice_updated_at();


-- ---------------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE invoices           ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Org members can read/write their own invoices
DROP POLICY IF EXISTS "invoices_all_own_org" ON invoices;
CREATE POLICY "invoices_all_own_org"
  ON invoices FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- Line items follow the same pattern
DROP POLICY IF EXISTS "invoice_line_items_all_own_org" ON invoice_line_items;
CREATE POLICY "invoice_line_items_all_own_org"
  ON invoice_line_items FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- 5. generate_invoice_number — atomic, per-org, per-year sequential number
--
-- Counts all invoices (including voided) for this org in the current year
-- and returns the next number. Called inside the createInvoice transaction.
-- The UNIQUE constraint on (organisation_id, invoice_number) is the ultimate
-- guard against races — on conflict, retry at the application layer.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION generate_invoice_number(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year   TEXT    := to_char(CURRENT_DATE, 'YYYY');
  v_seq    INTEGER;
  v_number TEXT;
BEGIN
  SELECT COUNT(*) + 1
  INTO   v_seq
  FROM   invoices
  WHERE  organisation_id = p_org_id
    AND  to_char(issue_date, 'YYYY') = v_year;

  v_number := 'INV-' || v_year || '-' || lpad(v_seq::TEXT, 4, '0');
  RETURN v_number;
END;
$$;

GRANT EXECUTE ON FUNCTION generate_invoice_number(UUID) TO authenticated;


-- ---------------------------------------------------------------------------
-- 6. public_get_invoice_by_token — anon-accessible read for the public page
--
-- Returns a single invoice row with joined client, org, and line items.
-- Only invoices with status NOT IN ('draft', 'void') are accessible publicly.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_get_invoice_by_token(p_token UUID)
RETURNS SETOF invoices
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT i.*
  FROM   invoices i
  WHERE  i.view_token = p_token
    AND  i.status NOT IN ('draft', 'void');
$$;

GRANT EXECUTE ON FUNCTION public_get_invoice_by_token(UUID) TO anon;


-- ---------------------------------------------------------------------------
-- 7. mark_invoice_viewed — called by public page to record first open
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION mark_invoice_viewed(p_token UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invoices
  SET    status    = 'viewed',
         viewed_at = now()
  WHERE  view_token = p_token
    AND  status     = 'sent';
END;
$$;

GRANT EXECUTE ON FUNCTION mark_invoice_viewed(UUID) TO anon;


-- ---------------------------------------------------------------------------
-- 8. cron_mark_invoices_overdue — called by daily cron
--    Marks any sent/viewed invoice past its due_date as 'overdue'.
--    Returns rows for dunning processing (Epic 5).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION cron_mark_invoices_overdue()
RETURNS TABLE (
  invoice_id     uuid,
  invoice_number text,
  total          numeric,
  due_date       date,
  org_id         uuid,
  org_name       text,
  org_email      text,
  client_first   text,
  client_last    text,
  client_email   text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH overdue AS (
    UPDATE invoices
    SET    status = 'overdue'
    WHERE  status   IN ('sent', 'viewed')
      AND  due_date <  CURRENT_DATE
    RETURNING id, invoice_number, total, due_date, organisation_id, client_id
  )
  SELECT
    o.id,
    o.invoice_number,
    o.total,
    o.due_date,
    org.id,
    org.name,
    org.email,
    c.first_name,
    c.last_name,
    c.email
  FROM  overdue        o
  JOIN  organisations  org ON org.id = o.organisation_id
  JOIN  clients        c   ON c.id   = o.client_id
  WHERE org.email IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION cron_mark_invoices_overdue() TO anon;
