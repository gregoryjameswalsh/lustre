-- =============================================================================
-- Migration: Add completed_at timestamp to jobs
-- Provides a canonical completion date for revenue analytics, replacing the
-- use of scheduled_date as a proxy for when revenue was earned.
-- =============================================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill: for already-completed jobs, use created_at as the best available proxy
-- (jobs has no updated_at column)
UPDATE jobs
SET completed_at = created_at
WHERE status = 'completed'
  AND completed_at IS NULL;

-- Trigger function: auto-set completed_at when a job transitions to 'completed',
-- and clear it if a job is un-completed (e.g. reverted to scheduled/in_progress).
CREATE OR REPLACE FUNCTION set_job_completed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = NOW();
  END IF;

  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_completed_at ON jobs;
CREATE TRIGGER trg_job_completed_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION set_job_completed_at();

-- Index to make completed_at range queries fast for analytics
CREATE INDEX IF NOT EXISTS idx_jobs_completed_at
  ON jobs (organisation_id, completed_at)
  WHERE completed_at IS NOT NULL;
