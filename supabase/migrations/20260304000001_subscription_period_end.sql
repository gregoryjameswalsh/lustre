-- =============================================================================
-- LUSTRE Migration: Add subscription period tracking
-- Stores current_period_end and cancel_at_period_end from Stripe so the app
-- can show renewal dates and "cancels on" notices without hitting the Stripe API.
-- =============================================================================

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS subscription_current_period_end   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end BOOLEAN NOT NULL DEFAULT false;

-- stripe_update_org_subscription signature has changed — drop and recreate.
-- (PostgreSQL does not allow CREATE OR REPLACE to change a function's parameter list.)
DROP FUNCTION IF EXISTS stripe_update_org_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

CREATE FUNCTION stripe_update_org_subscription(
  p_org_id                  UUID,
  p_subscription_id         TEXT,
  p_price_id                TEXT,
  p_plan                    TEXT,
  p_status                  TEXT,
  p_trial_ends_at           TIMESTAMPTZ,
  p_current_period_end      TIMESTAMPTZ,
  p_cancel_at_period_end    BOOLEAN
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organisations
  SET
    stripe_subscription_id              = p_subscription_id,
    stripe_price_id                     = p_price_id,
    plan                                = p_plan,
    subscription_status                 = p_status,
    trial_ends_at                       = p_trial_ends_at,
    subscription_current_period_end     = p_current_period_end,
    subscription_cancel_at_period_end   = p_cancel_at_period_end
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION stripe_update_org_subscription(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN) TO anon;

-- Also clear period fields on cancellation
CREATE OR REPLACE FUNCTION stripe_cancel_org_subscription(p_org_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE organisations
  SET
    plan                                = 'free',
    subscription_status                 = 'cancelled',
    stripe_subscription_id              = NULL,
    stripe_price_id                     = NULL,
    subscription_current_period_end     = NULL,
    subscription_cancel_at_period_end   = false
  WHERE id = p_org_id;
END;
$$;

GRANT EXECUTE ON FUNCTION stripe_cancel_org_subscription(UUID) TO anon;
