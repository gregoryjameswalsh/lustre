-- =============================================================================
-- LUSTRE — Operator Branding
-- Adds brand_color to organisations and creates the operator-logos storage
-- bucket so operators can upload a logo for use on quotes, invoices, and emails.
--
-- logo_url already exists on organisations (from initial schema).
-- This migration adds brand_color and the storage infrastructure.
-- =============================================================================

-- 1. Brand colour — stored as a CSS hex string e.g. '#4a5c4e'
ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT NULL;

-- 2. Public storage bucket for operator logos
-- Public = all objects are readable without auth (needed for PDF rendering,
-- email <img> tags, and the unauthenticated public quote/invoice pages).
-- Writes are restricted by the RLS policies below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'operator-logos',
  'operator-logos',
  TRUE,
  2097152, -- 2 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS — only authenticated org members may write to their own path.
-- Path convention: {org_id}/{filename}
-- Public bucket handles reads without a policy.

CREATE POLICY "operator_logos_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'operator-logos'
  AND (storage.foldername(name))[1] = get_user_org_id()::text
);

CREATE POLICY "operator_logos_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'operator-logos'
  AND (storage.foldername(name))[1] = get_user_org_id()::text
);

CREATE POLICY "operator_logos_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'operator-logos'
  AND (storage.foldername(name))[1] = get_user_org_id()::text
);
