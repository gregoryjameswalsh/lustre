-- supabase/migrations/20260308000002_property_photos.sql
-- =============================================================================
-- LUSTRE — Property Photo Attachments
-- Creates the property_photos table, a private Supabase Storage bucket, and
-- Storage RLS policies so users can only access their own org's photos.
--
-- Compression is handled client-side (browser-image-compression, 1 MB target).
-- The bucket enforces a 5 MiB backstop per file.
-- Path convention: {org_id}/properties/{property_id}/{uuid}-{filename}
-- =============================================================================

-- ---------------------------------------------------------------------------
-- property_photos
-- Metadata record for each uploaded photo, linked to a property.
-- The actual binary lives in Supabase Storage (bucket: property-photos).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS property_photos (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid        NOT NULL REFERENCES organisations(id)  ON DELETE CASCADE,
  property_id      uuid        NOT NULL REFERENCES properties(id)     ON DELETE CASCADE,
  storage_path     text        NOT NULL,
  file_name        text        NOT NULL,
  file_size_bytes  integer,
  mime_type        text,
  caption          text,                          -- optional label e.g. "Kitchen", "Alarm panel"
  display_order    integer     NOT NULL DEFAULT 0, -- reserved for future drag-to-reorder
  uploaded_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  uploaded_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_photos_property
  ON property_photos (property_id);

ALTER TABLE property_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "property_photos_all_own_org"
  ON property_photos FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- ---------------------------------------------------------------------------
-- Supabase Storage — private bucket
-- 5 MiB limit is a server-side backstop; client compresses to ~1 MiB target.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-photos',
  'property-photos',
  false,    -- private: never served by public URL
  5242880,  -- 5 MiB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage RLS policies
-- Paths are structured as: {org_id}/properties/{property_id}/{filename}
-- storage.foldername(name) returns ARRAY[org_id, 'properties', property_id]
-- We check that the first segment matches the authenticated user's org.
-- ---------------------------------------------------------------------------

-- Upload (INSERT)
CREATE POLICY "property_photos_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );

-- View / download (SELECT)
CREATE POLICY "property_photos_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );

-- Delete
CREATE POLICY "property_photos_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-photos'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );
