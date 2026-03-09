-- supabase/migrations/20260309000000_property_photos_main.sql
-- =============================================================================
-- LUSTRE — Main photo flag for property_photos
--
-- Adds an `is_main` boolean to mark one photo per property as the primary
-- thumbnail/hero image. A partial unique index ensures at most one row per
-- property can have is_main = true (enforced at the DB level).
-- =============================================================================

ALTER TABLE property_photos
  ADD COLUMN IF NOT EXISTS is_main boolean NOT NULL DEFAULT false;

-- Partial unique index: enforce at most one main photo per property
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_photos_main_unique
  ON property_photos (property_id)
  WHERE is_main = true;
