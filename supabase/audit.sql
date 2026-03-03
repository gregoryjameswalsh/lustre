-- =============================================================================
-- LUSTRE — Audit Log
-- =============================================================================
-- Run in the Supabase SQL Editor after rls.sql.
--
-- Creates an append-only audit_logs table that records every destructive or
-- sensitive admin action (deletes, settings changes).  Team members can read
-- their own org's audit log; nobody may update or delete rows via the client.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  actor_id        uuid        NOT NULL,   -- profiles.id of the user who acted
  action          text        NOT NULL,   -- e.g. 'delete_client', 'update_vat_settings'
  resource_type   text        NOT NULL,   -- e.g. 'client', 'job', 'property', 'quote'
  resource_id     uuid,                   -- id of the affected row (may be null after deletion)
  metadata        jsonb,                  -- optional snapshot data (name, title, etc.)
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Index for the most common query: "show me my org's audit log, newest first"
CREATE INDEX IF NOT EXISTS audit_logs_org_created
  ON audit_logs (organisation_id, created_at DESC);


-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Org members can read their own audit log
DROP POLICY IF EXISTS "audit_logs_select_own_org" ON audit_logs;
CREATE POLICY "audit_logs_select_own_org"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (organisation_id = get_user_org_id());

-- Authenticated users may insert audit rows for their own org (server actions)
DROP POLICY IF EXISTS "audit_logs_insert_own_org" ON audit_logs;
CREATE POLICY "audit_logs_insert_own_org"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (organisation_id = get_user_org_id());

-- No UPDATE or DELETE policies — audit rows are immutable
