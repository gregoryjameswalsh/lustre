-- =============================================================================
-- LUSTRE Migration: Org-level MFA enforcement flag (M08)
-- Pairs with the WorkOS SDK installed in src/lib/workos.ts.
-- When mfa_required = true, the middleware redirects members who have not
-- completed a TOTP challenge to /auth/mfa-setup or /auth/mfa-challenge.
-- =============================================================================

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS mfa_required boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN organisations.mfa_required IS
  'When true, all org members must complete MFA before accessing the dashboard.';
