-- =============================================================================
-- LUSTRE Migration: Initial schema — RLS policies + audit log
-- Consolidated from supabase/rls.sql and supabase/audit.sql.
-- Run this first; all subsequent migrations depend on these tables existing.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- RLS — Row Level Security
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


-- Helper: returns the current user's organisation_id.
-- SECURITY DEFINER avoids a recursive RLS check on the profiles table.
CREATE OR REPLACE FUNCTION get_user_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organisation_id FROM profiles WHERE id = auth.uid()
$$;


-- profiles
DROP POLICY IF EXISTS "profiles_select_own_org" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"      ON profiles;

CREATE POLICY "profiles_select_own_org"
  ON profiles FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());


-- organisations
DROP POLICY IF EXISTS "organisations_select_own"   ON organisations;
DROP POLICY IF EXISTS "organisations_update_admin" ON organisations;

CREATE POLICY "organisations_select_own"
  ON organisations FOR SELECT TO authenticated
  USING (id = get_user_org_id());

CREATE POLICY "organisations_update_admin"
  ON organisations FOR UPDATE TO authenticated
  USING (
    id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- clients
DROP POLICY IF EXISTS "clients_all_own_org" ON clients;
CREATE POLICY "clients_all_own_org"
  ON clients FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- properties
DROP POLICY IF EXISTS "properties_all_own_org" ON properties;
CREATE POLICY "properties_all_own_org"
  ON properties FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- jobs
DROP POLICY IF EXISTS "jobs_all_own_org" ON jobs;
CREATE POLICY "jobs_all_own_org"
  ON jobs FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- quotes
DROP POLICY IF EXISTS "quotes_all_own_org" ON quotes;
CREATE POLICY "quotes_all_own_org"
  ON quotes FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- quote_line_items (own organisation_id column — avoids join through quotes)
DROP POLICY IF EXISTS "line_items_all_own_org" ON quote_line_items;
CREATE POLICY "line_items_all_own_org"
  ON quote_line_items FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- activities
DROP POLICY IF EXISTS "activities_all_own_org" ON activities;
CREATE POLICY "activities_all_own_org"
  ON activities FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- follow_ups
DROP POLICY IF EXISTS "follow_ups_all_own_org" ON follow_ups;
CREATE POLICY "follow_ups_all_own_org"
  ON follow_ups FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());


-- ---------------------------------------------------------------------------
-- Audit Log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  actor_id        uuid        NOT NULL,
  action          text        NOT NULL,
  resource_type   text        NOT NULL,
  resource_id     uuid,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_org_created
  ON audit_logs (organisation_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Org members can read their own audit log
DROP POLICY IF EXISTS "audit_logs_select_own_org" ON audit_logs;
CREATE POLICY "audit_logs_select_own_org"
  ON audit_logs FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

-- Authenticated users may insert audit rows for their own org
DROP POLICY IF EXISTS "audit_logs_insert_own_org" ON audit_logs;
CREATE POLICY "audit_logs_insert_own_org"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());

-- No UPDATE or DELETE policies — audit rows are immutable
