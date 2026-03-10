-- =============================================================================
-- LUSTRE — M03: Tags & Segmentation
-- =============================================================================

-- ---------------------------------------------------------------------------
-- tags — org-scoped tag definitions
-- ---------------------------------------------------------------------------
CREATE TABLE tags (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  colour          text,          -- hex from curated palette, e.g. '#C8F5D7'
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_own_org" ON tags FOR ALL TO authenticated
  USING (organisation_id = get_user_org_id());

-- ---------------------------------------------------------------------------
-- entity_tags — polymorphic junction (one tag → many entities)
-- entity_type disambiguates the entity_id FK: 'client' | 'job'
-- ---------------------------------------------------------------------------
CREATE TABLE entity_tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id      uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_id   uuid NOT NULL,
  entity_type text NOT NULL,  -- 'client' | 'job'
  UNIQUE (tag_id, entity_id, entity_type)
);

ALTER TABLE entity_tags ENABLE ROW LEVEL SECURITY;

-- Scoped via the parent tag's organisation_id
CREATE POLICY "entity_tags_own_org" ON entity_tags FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tags
      WHERE tags.id = entity_tags.tag_id
        AND tags.organisation_id = get_user_org_id()
    )
  );

-- Indexes for fast entity lookups (tag picker + filter)
CREATE INDEX entity_tags_entity ON entity_tags (entity_id, entity_type);
CREATE INDEX entity_tags_tag    ON entity_tags (tag_id);
