-- =============================================================================
-- LUSTRE Migration: follow_ups — add reminder_sent_at
-- =============================================================================
-- Tracks when a due-date reminder was last sent for a follow-up.
-- The daily cron only emails follow-ups where this is NULL, so operators
-- receive exactly one notification per follow-up regardless of how many
-- days it stays overdue.
-- =============================================================================

ALTER TABLE follow_ups
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;
