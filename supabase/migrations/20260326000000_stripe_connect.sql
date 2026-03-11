-- supabase/migrations/20260326000000_stripe_connect.sql
-- =============================================================================
-- LUSTRE — Stripe Connect: platform OAuth fields + payment reconciliation RPC
-- =============================================================================

-- ── Connect fields on organisations ─────────────────────────────────────────
-- stripe_account_id      : the connected Stripe account ID (acct_...)
-- stripe_connect_status  : 'not_connected' | 'connected'

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS stripe_account_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_status TEXT NOT NULL DEFAULT 'not_connected';

-- ── Platform fee config ──────────────────────────────────────────────────────
-- Stored in basis points (150 = 1.5%). Defaults to 200 (2%).
-- Can be overridden per org for enterprise deals.
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS platform_fee_bps INTEGER NOT NULL DEFAULT 200;

-- ── RPC: mark_invoice_paid_by_stripe ────────────────────────────────────────
-- Called from the Stripe webhook (anon client, SECURITY DEFINER for safety).
-- Correlates a PaymentIntent to a Lustre invoice via metadata, then marks paid.

CREATE OR REPLACE FUNCTION public.mark_invoice_paid_by_stripe(
  p_invoice_id        UUID,
  p_org_id            UUID,
  p_payment_intent_id TEXT,
  p_amount_received   NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice invoices%ROWTYPE;
  v_new_amount_paid NUMERIC;
BEGIN
  SELECT * INTO v_invoice
  FROM   invoices
  WHERE  id = p_invoice_id
    AND  organisation_id = p_org_id;

  -- Nothing to do if not found, already paid, or voided
  IF NOT FOUND                    THEN RETURN; END IF;
  IF v_invoice.status = 'paid'   THEN RETURN; END IF;
  IF v_invoice.status = 'void'   THEN RETURN; END IF;

  -- Accumulate payment, capped at invoice total
  v_new_amount_paid := LEAST(
    ROUND((COALESCE(v_invoice.amount_paid, 0) + p_amount_received)::NUMERIC, 2),
    v_invoice.total
  );

  UPDATE invoices
  SET
    amount_paid              = v_new_amount_paid,
    stripe_payment_intent_id = p_payment_intent_id,
    status = CASE
               WHEN v_new_amount_paid >= v_invoice.total THEN 'paid'
               ELSE status
             END,
    paid_at = CASE
                WHEN v_new_amount_paid >= v_invoice.total THEN NOW()
                ELSE paid_at
              END
  WHERE id = p_invoice_id
    AND organisation_id = p_org_id;
END;
$$;

-- Allow the anon role (used by the webhook) to call this function
GRANT EXECUTE ON FUNCTION public.mark_invoice_paid_by_stripe TO anon;
