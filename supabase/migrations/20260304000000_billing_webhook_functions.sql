-- =============================================================================
-- LUSTRE Migration: Billing webhook SECURITY DEFINER functions
-- Purpose: Allow the Stripe webhook handler to update organisation billing state
--          without requiring SUPABASE_SERVICE_ROLE_KEY in the application.
--          Called by the anon Supabase client in /api/webhooks/stripe after
--          Stripe signature verification has already been performed.
--
-- Functions:
--   stripe_update_org_subscription  — subscription created/updated, payment succeeded
--   stripe_cancel_org_subscription  — subscription deleted
--   stripe_set_org_past_due         — invoice payment failed
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. stripe_update_org_subscription
--    Updates all billing fields for an active or changing subscription.
--    Called on: customer.subscription.created, customer.subscription.updated,
--               invoice.payment_succeeded
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION stripe_update_org_subscription(
  p_org_id              UUID,
  p_subscription_id     TEXT,
  p_price_id            TEXT,
  p_plan                TEXT,
  p_status              TEXT,
  p_trial_ends_at       TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organisations
  SET
    stripe_subscription_id = p_subscription_id,
    stripe_price_id        = p_price_id,
    plan                   = p_plan,
    subscription_status    = p_status,
    trial_ends_at          = p_trial_ends_at
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION stripe_update_org_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO anon;


-- ---------------------------------------------------------------------------
-- 2. stripe_cancel_org_subscription
--    Resets org to free plan on cancellation.
--    Called on: customer.subscription.deleted
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION stripe_cancel_org_subscription(
  p_org_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organisations
  SET
    plan                   = 'free',
    subscription_status    = 'cancelled',
    stripe_subscription_id = NULL,
    stripe_price_id        = NULL
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION stripe_cancel_org_subscription(UUID) TO anon;


-- ---------------------------------------------------------------------------
-- 3. stripe_set_org_past_due
--    Marks an org's subscription as past_due on payment failure.
--    Called on: invoice.payment_failed
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION stripe_set_org_past_due(
  p_org_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organisations
  SET subscription_status = 'past_due'
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION stripe_set_org_past_due(UUID) TO anon;
