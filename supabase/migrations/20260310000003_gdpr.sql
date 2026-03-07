-- =============================================================================
-- LUSTRE — M09 GDPR Tooling
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Storage bucket for GDPR exports
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gdpr-exports', 'gdpr-exports', false, 52428800, ARRAY['application/json'])
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users in the same org may read/write their exports.
-- Path convention: {organisation_id}/{filename}
CREATE POLICY "gdpr_exports_org_access"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'gdpr-exports'
    AND (storage.foldername(name))[1] = (get_user_org_id())::text
  );

-- ---------------------------------------------------------------------------
-- consent_records — per-client marketing / processing consent
-- ---------------------------------------------------------------------------

CREATE TABLE consent_records (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  consent_type    text        NOT NULL CHECK (consent_type IN ('marketing_email', 'sms', 'data_processing')),
  granted         boolean     NOT NULL,
  granted_at      timestamptz,
  withdrawn_at    timestamptz,
  source          text        CHECK (source IN ('manual', 'import', 'form')),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- one row per client × consent_type
  UNIQUE (client_id, consent_type)
);

CREATE INDEX consent_records_client_id_idx ON consent_records(client_id);
CREATE INDEX consent_records_org_id_idx    ON consent_records(organisation_id);

ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_records_own_org" ON consent_records
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- ---------------------------------------------------------------------------
-- gdpr_requests — DSAR / erasure / rectification request log
-- ---------------------------------------------------------------------------

CREATE TABLE gdpr_requests (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  client_id       uuid        REFERENCES clients(id) ON DELETE SET NULL,
  request_type    text        NOT NULL CHECK (request_type IN ('dsar', 'erasure', 'rectification')),
  status          text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  requested_at    timestamptz NOT NULL DEFAULT now(),
  completed_at    timestamptz,
  notes           text,
  export_url      text        -- signed URL for DSAR export (7-day expiry)
);

CREATE INDEX gdpr_requests_org_id_idx    ON gdpr_requests(organisation_id);
CREATE INDEX gdpr_requests_client_id_idx ON gdpr_requests(client_id);

ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gdpr_requests_own_org" ON gdpr_requests
  FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());
