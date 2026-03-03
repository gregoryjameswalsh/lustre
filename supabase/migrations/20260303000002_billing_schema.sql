-- =============================================================================
-- LUSTRE Migration: Billing schema additions
-- Adds fields needed for the Stripe subscription integration.
-- =============================================================================

-- stripe_subscription_id: the active Stripe Subscription ID (sub_xxx)
-- stripe_price_id:         the Stripe Price ID the org is currently on
--                          Used in webhooks to map price → plan key.
-- Both are nullable — set once an org starts a paid subscription.

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id         TEXT;

-- Update the plan constraint to reflect the full tier set.
-- The column type is TEXT so any value is accepted by the DB;
-- the application enforces the allowed values via the Plan type.
-- This comment documents the intended set:
--   'free'           — trial or no subscription (default at signup)
--   'starter'        — £39/mo annual / £49/mo monthly
--   'professional'   — £119/mo annual / £149/mo monthly
--   'business'       — £319/mo annual / £399/mo monthly
--   'enterprise'     — custom pricing, managed manually
COMMENT ON COLUMN organisations.plan IS
  'Billing plan: free | starter | professional | business | enterprise';

-- Index for webhook lookups by Stripe IDs
CREATE INDEX IF NOT EXISTS organisations_stripe_customer_id_idx
  ON organisations (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS organisations_stripe_subscription_id_idx
  ON organisations (stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;
