-- Add due_date to jobs table
-- Allows a separate deadline to be tracked independently of the scheduled_date

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS due_date DATE;

COMMENT ON COLUMN jobs.due_date IS 'Optional deadline by which the job must be completed. Drives "Due Today" and "Overdue" flags in the UI.';
