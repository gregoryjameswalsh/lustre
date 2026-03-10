-- =============================================================================
-- Cursor-based pagination indices
-- CRM-ENT-001 / Performance
-- =============================================================================
-- Composite indices to support efficient keyset (cursor) pagination on all
-- primary list queries.  Each index covers (organisation_id, primary_sort, id)
-- so Postgres can satisfy the full WHERE + ORDER BY from the index alone.
-- =============================================================================

-- Clients: sorted by last_name ASC, id ASC
CREATE INDEX IF NOT EXISTS idx_clients_org_last_name_id
  ON clients (organisation_id, last_name ASC, id ASC);

-- Jobs: sorted by scheduled_date DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_jobs_org_scheduled_date_id
  ON jobs (organisation_id, scheduled_date DESC, id DESC);

-- Quotes: sorted by created_at DESC, id DESC
CREATE INDEX IF NOT EXISTS idx_quotes_org_created_at_id
  ON quotes (organisation_id, created_at DESC, id DESC);

-- Activities: sorted by created_at DESC, id DESC (scoped per client)
CREATE INDEX IF NOT EXISTS idx_activities_org_client_created_at_id
  ON activities (organisation_id, client_id, created_at DESC, id DESC);

-- Follow-ups: sorted by due_date ASC, id ASC
CREATE INDEX IF NOT EXISTS idx_follow_ups_org_due_date_id
  ON follow_ups (organisation_id, due_date ASC, id ASC);
