-- supabase/migrations/20260307000005_checklist_photos.sql
-- =============================================================================
-- LUSTRE — Phase 4: Checklist Photo Attachments
-- Creates the job_checklist_photos table, the private Supabase Storage bucket,
-- and Storage RLS policies so users can only access their own org's photos.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- job_checklist_photos
-- Metadata record for each uploaded photo, linked to a checklist item.
-- The actual binary lives in Supabase Storage (bucket: checklist-photos).
-- Path convention: {org_id}/checklists/{job_checklist_item_id}/{uuid}-{filename}
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS job_checklist_photos (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid        NOT NULL REFERENCES organisations(id)        ON DELETE CASCADE,
  job_checklist_item_id uuid        NOT NULL REFERENCES job_checklist_items(id)  ON DELETE CASCADE,
  storage_path          text        NOT NULL,
  file_name             text        NOT NULL,
  file_size_bytes       integer,
  mime_type             text,
  uploaded_by           uuid                REFERENCES profiles(id)              ON DELETE SET NULL,
  uploaded_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_checklist_photos_item
  ON job_checklist_photos (job_checklist_item_id);

ALTER TABLE job_checklist_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "job_checklist_photos_all_own_org"
  ON job_checklist_photos FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- ---------------------------------------------------------------------------
-- Supabase Storage — private bucket
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'checklist-photos',
  'checklist-photos',
  false,   -- private: never served by public URL
  10485760, -- 10 MiB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Storage RLS policies
-- Paths are structured as: {org_id}/checklists/{item_id}/{filename}
-- storage.foldername(name) returns ARRAY[org_id, 'checklists', item_id]
-- We check that the first segment matches the authenticated user's org.
-- ---------------------------------------------------------------------------

-- Upload (INSERT)
CREATE POLICY "checklist_photos_storage_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'checklist-photos'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );

-- View / download (SELECT)
CREATE POLICY "checklist_photos_storage_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'checklist-photos'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );

-- Delete
CREATE POLICY "checklist_photos_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'checklist-photos'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );
