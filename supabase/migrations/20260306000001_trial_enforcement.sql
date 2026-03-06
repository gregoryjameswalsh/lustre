-- =============================================================================
-- LUSTRE Migration: Trial enforcement — handle_new_user trigger + backfill
--
-- Problem: trial_ends_at was not being set at org creation, so the proxy gate
-- (proxy.ts lines 103–123) never fired — trials never expired.
--
-- Fix:
--   1. Replace handle_new_user() to set trial_ends_at = now() + 14 days
--      and subscription_status = 'trialing' on every new signup.
--   2. Drop and recreate the auth trigger to pick up the updated function.
--   3. Backfill existing free-plan orgs with null trial_ends_at.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. handle_new_user — creates org + profile on every new Supabase auth user.
--    CREATE OR REPLACE is idempotent — safe to rerun.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id   uuid;
  v_org_name text;
  v_slug     text;
BEGIN
  -- Prefer the organisation_name from signup metadata; fall back to email prefix
  v_org_name := COALESCE(
    NULLIF(TRIM(NEW.raw_user_meta_data->>'organisation_name'), ''),
    split_part(NEW.email, '@', 1)
  );

  -- Build a URL-safe slug: lowercase, replace non-alphanumeric runs with '-',
  -- strip leading/trailing dashes, then append 6 chars of the user UUID for uniqueness.
  v_slug := lower(regexp_replace(v_org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  v_slug := v_slug || '-' || substr(replace(NEW.id::text, '-', ''), 1, 6);

  INSERT INTO public.organisations (
    name,
    slug,
    email,
    plan,
    subscription_status,
    trial_ends_at,
    onboarding_step
  )
  VALUES (
    v_org_name,
    v_slug,
    NEW.email,
    'free',
    'trialing',
    now() + INTERVAL '14 days',
    0
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (
    id,
    organisation_id,
    full_name,
    email,
    role
  )
  VALUES (
    NEW.id,
    v_org_id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    'admin'
  );

  RETURN NEW;
END;
$$;


-- ---------------------------------------------------------------------------
-- 2. Ensure the trigger is attached to auth.users.
--    DROP IF EXISTS + CREATE is the idempotent pattern for triggers.
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ---------------------------------------------------------------------------
-- 3. Backfill existing free-plan orgs that have null trial_ends_at.
--    Sets trial_ends_at = created_at + 14 days (preserves original start date).
--    Also sets subscription_status = 'trialing' if it is still null/unknown.
-- ---------------------------------------------------------------------------

UPDATE public.organisations
SET
  trial_ends_at      = created_at + INTERVAL '14 days',
  subscription_status = COALESCE(NULLIF(subscription_status, ''), 'trialing')
WHERE plan = 'free'
  AND trial_ends_at IS NULL;
