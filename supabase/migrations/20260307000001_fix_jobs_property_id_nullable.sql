-- =============================================================================
-- LUSTRE Migration: Allow NULL property_id on jobs
-- =============================================================================
-- Quotes do not require a property, so jobs created from accepted quotes may
-- have no linked property. The NOT NULL constraint on jobs.property_id was
-- preventing any such quote from being accepted.
-- =============================================================================

ALTER TABLE jobs ALTER COLUMN property_id DROP NOT NULL;
