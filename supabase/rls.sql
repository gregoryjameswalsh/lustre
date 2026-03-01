-- =============================================================================
-- LUSTRE — Row Level Security
-- =============================================================================
-- Run this entire script in the Supabase SQL Editor (Dashboard → SQL Editor).
-- It is safe to run multiple times — policies use CREATE POLICY IF NOT EXISTS
-- is not available in older Postgres, so we DROP before CREATE.
--
-- Tables covered (9 total):
--   profiles, organisations, clients, properties, jobs,
--   quotes, quote_line_items, activities, follow_ups
--
-- Security model:
--   • All authenticated users may only access rows belonging to their org.
--   • Admins additionally control organisation settings.
--   • NO anon (public) access to any table — the public quote page (/q/[token])
--     now fetches server-side via the service role, so anon DB access is
--     not required.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Step 1 — Enable RLS on every table
-- ---------------------------------------------------------------------------

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients            ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties         ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_line_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups         ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------------
-- Step 2 — Helper: current user's organisation_id
-- Declared SECURITY DEFINER so it runs as the function owner (postgres),
-- avoiding a recursive RLS check on profiles.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organisation_id FROM profiles WHERE id = auth.uid()
$$;


-- ---------------------------------------------------------------------------
-- Step 3 — Drop existing policies (idempotent re-run support)
-- ---------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "profiles_select_own_org"    ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"         ON profiles;

-- organisations
DROP POLICY IF EXISTS "organisations_select_own"   ON organisations;
DROP POLICY IF EXISTS "organisations_update_admin" ON organisations;

-- clients
DROP POLICY IF EXISTS "clients_all_own_org"        ON clients;

-- properties
DROP POLICY IF EXISTS "properties_all_own_org"     ON properties;

-- jobs
DROP POLICY IF EXISTS "jobs_all_own_org"           ON jobs;

-- quotes
DROP POLICY IF EXISTS "quotes_all_own_org"         ON quotes;

-- quote_line_items
DROP POLICY IF EXISTS "line_items_all_own_org"     ON quote_line_items;

-- activities
DROP POLICY IF EXISTS "activities_all_own_org"     ON activities;

-- follow_ups
DROP POLICY IF EXISTS "follow_ups_all_own_org"     ON follow_ups;


-- ---------------------------------------------------------------------------
-- Step 4 — profiles
-- ---------------------------------------------------------------------------

-- Any authenticated user can read profiles that belong to their own org
-- (needed for showing teammate names in the UI).
CREATE POLICY "profiles_select_own_org"
  ON profiles FOR SELECT
  TO authenticated
  USING (organisation_id = get_user_org_id());

-- Users may only update their own profile.
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());


-- ---------------------------------------------------------------------------
-- Step 5 — organisations
-- ---------------------------------------------------------------------------

-- All team members can read their org's settings.
CREATE POLICY "organisations_select_own"
  ON organisations FOR SELECT
  TO authenticated
  USING (id = get_user_org_id());

-- Only admins can update org settings (name, VAT, branding, etc.).
CREATE POLICY "organisations_update_admin"
  ON organisations FOR UPDATE
  TO authenticated
  USING (
    id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ---------------------------------------------------------------------------
-- Step 6 — clients
-- ---------------------------------------------------------------------------

CREATE POLICY "clients_all_own_org"
  ON clients FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Step 7 — properties
-- ---------------------------------------------------------------------------

CREATE POLICY "properties_all_own_org"
  ON properties FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Step 8 — jobs
-- ---------------------------------------------------------------------------

CREATE POLICY "jobs_all_own_org"
  ON jobs FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Step 9 — quotes
-- ---------------------------------------------------------------------------

CREATE POLICY "quotes_all_own_org"
  ON quotes FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Step 10 — quote_line_items
-- quote_line_items has its own organisation_id column — use it directly
-- rather than joining through quotes to keep the policy fast.
-- ---------------------------------------------------------------------------

CREATE POLICY "line_items_all_own_org"
  ON quote_line_items FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Step 11 — activities
-- ---------------------------------------------------------------------------

CREATE POLICY "activities_all_own_org"
  ON activities FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Step 12 — follow_ups
-- ---------------------------------------------------------------------------

CREATE POLICY "follow_ups_all_own_org"
  ON follow_ups FOR ALL
  TO authenticated
  USING (organisation_id = get_user_org_id());


-- =============================================================================
-- Verification queries — run these after applying the script to confirm RLS
-- is active. All should return rows with rls_enabled = true.
-- =============================================================================
--
-- SELECT tablename, rowsecurity AS rls_enabled
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN (
--     'profiles','organisations','clients','properties','jobs',
--     'quotes','quote_line_items','activities','follow_ups'
--   )
-- ORDER BY tablename;
--
-- Test from the browser using your anon key — should return 0 rows:
--   curl -H "apikey: <ANON_KEY>" \
--        -H "Authorization: Bearer <ANON_KEY>" \
--        "https://<PROJECT>.supabase.co/rest/v1/clients?select=*"
-- =============================================================================
