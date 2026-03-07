-- =============================================================================
-- LUSTRE Migration: Role-Based Access Control (M06)
-- =============================================================================
-- Adds a flexible RBAC layer on top of the existing binary admin/team_member
-- role. The legacy `profiles.role` column is preserved for backwards compat
-- during the transition window. New application code uses `custom_role_id`
-- and the role_permissions table.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. roles
-- ---------------------------------------------------------------------------

CREATE TABLE roles (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  description     text,
  is_system       boolean     NOT NULL DEFAULT false,  -- system roles cannot be deleted
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, name)
);

CREATE INDEX roles_org_idx ON roles (organisation_id);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "roles_select_own_org" ON roles FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

-- Only application layer (SECURITY DEFINER fns) and admins may mutate roles.
-- The admin check mirrors the existing RLS pattern used for org settings.
CREATE POLICY "roles_insert_admin" ON roles FOR INSERT TO authenticated
  WITH CHECK (
    organisation_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "roles_update_admin" ON roles FOR UPDATE TO authenticated
  USING (
    organisation_id = get_user_org_id()
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "roles_delete_admin" ON roles FOR DELETE TO authenticated
  USING (
    organisation_id = get_user_org_id()
    AND is_system = false  -- system roles are immutable
    AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );


-- ---------------------------------------------------------------------------
-- 2. role_permissions
-- ---------------------------------------------------------------------------

CREATE TABLE role_permissions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id     uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission  text NOT NULL,  -- e.g. 'clients:read', 'clients:write'
  UNIQUE (role_id, permission)
);

CREATE INDEX role_permissions_role_idx ON role_permissions (role_id);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "role_permissions_select_own_org" ON role_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM roles
    WHERE roles.id = role_permissions.role_id
      AND roles.organisation_id = get_user_org_id()
  ));

CREATE POLICY "role_permissions_mutate_admin" ON role_permissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM roles
    JOIN profiles ON profiles.id = auth.uid()
    WHERE roles.id = role_permissions.role_id
      AND roles.organisation_id = get_user_org_id()
      AND profiles.role = 'admin'
  ));


-- ---------------------------------------------------------------------------
-- 3. custom_role_id on profiles
-- ---------------------------------------------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_role_id uuid REFERENCES roles(id) ON DELETE SET NULL;


-- ---------------------------------------------------------------------------
-- 4. Trigger: seed system roles when a new organisation is created
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION seed_default_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_role_id  uuid;
  member_role_id uuid;
  admin_perms    text[] := ARRAY[
    'clients:read',  'clients:write',  'clients:delete',
    'jobs:read',     'jobs:write',     'jobs:delete',
    'quotes:read',   'quotes:write',   'quotes:delete',
    'pipeline:read', 'pipeline:write', 'pipeline:delete',
    'reports:read',
    'settings:read', 'settings:write',
    'settings:manage_team', 'settings:manage_roles', 'settings:manage_billing',
    'gdpr:export',   'gdpr:erase'
  ];
  member_perms   text[] := ARRAY[
    'clients:read',  'clients:write',
    'jobs:read',     'jobs:write',
    'quotes:read',   'quotes:write',
    'pipeline:read', 'pipeline:write',
    'settings:read'
  ];
  perm text;
BEGIN
  INSERT INTO roles (organisation_id, name, description, is_system)
  VALUES (NEW.id, 'Admin', 'Full access to all features', true)
  RETURNING id INTO admin_role_id;

  FOREACH perm IN ARRAY admin_perms LOOP
    INSERT INTO role_permissions (role_id, permission) VALUES (admin_role_id, perm);
  END LOOP;

  INSERT INTO roles (organisation_id, name, description, is_system)
  VALUES (NEW.id, 'Team Member', 'Standard access for day-to-day work', true)
  RETURNING id INTO member_role_id;

  FOREACH perm IN ARRAY member_perms LOOP
    INSERT INTO role_permissions (role_id, permission) VALUES (member_role_id, perm);
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_organisation_created_seed_roles ON organisations;
CREATE TRIGGER on_organisation_created_seed_roles
  AFTER INSERT ON organisations
  FOR EACH ROW EXECUTE FUNCTION seed_default_roles();


-- ---------------------------------------------------------------------------
-- 5. Trigger: auto-assign system role to profiles on insert or org transfer
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assign_system_role_to_profile()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_role_name text;
  target_role_id   uuid;
BEGIN
  -- On INSERT: always assign based on legacy role field.
  -- On UPDATE: only reassign if organisation_id changed (invitation acceptance).
  IF TG_OP = 'UPDATE' AND NEW.organisation_id = OLD.organisation_id THEN
    RETURN NEW;
  END IF;

  target_role_name := CASE NEW.role WHEN 'admin' THEN 'Admin' ELSE 'Team Member' END;

  SELECT id INTO target_role_id
  FROM roles
  WHERE organisation_id = NEW.organisation_id
    AND name = target_role_name
    AND is_system = true
  LIMIT 1;

  NEW.custom_role_id := target_role_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_insert_assign_role ON profiles;
CREATE TRIGGER on_profile_insert_assign_role
  BEFORE INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_system_role_to_profile();

DROP TRIGGER IF EXISTS on_profile_org_transfer_assign_role ON profiles;
CREATE TRIGGER on_profile_org_transfer_assign_role
  BEFORE UPDATE OF organisation_id ON profiles
  FOR EACH ROW EXECUTE FUNCTION assign_system_role_to_profile();


-- ---------------------------------------------------------------------------
-- 6. Seed system roles for all EXISTING organisations
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  org_rec        RECORD;
  admin_role_id  uuid;
  member_role_id uuid;
  admin_perms    text[] := ARRAY[
    'clients:read',  'clients:write',  'clients:delete',
    'jobs:read',     'jobs:write',     'jobs:delete',
    'quotes:read',   'quotes:write',   'quotes:delete',
    'pipeline:read', 'pipeline:write', 'pipeline:delete',
    'reports:read',
    'settings:read', 'settings:write',
    'settings:manage_team', 'settings:manage_roles', 'settings:manage_billing',
    'gdpr:export',   'gdpr:erase'
  ];
  member_perms   text[] := ARRAY[
    'clients:read',  'clients:write',
    'jobs:read',     'jobs:write',
    'quotes:read',   'quotes:write',
    'pipeline:read', 'pipeline:write',
    'settings:read'
  ];
  perm text;
BEGIN
  FOR org_rec IN SELECT id FROM organisations LOOP

    -- Admin role
    INSERT INTO roles (organisation_id, name, description, is_system)
    VALUES (org_rec.id, 'Admin', 'Full access to all features', true)
    ON CONFLICT (organisation_id, name) DO NOTHING
    RETURNING id INTO admin_role_id;

    IF admin_role_id IS NOT NULL THEN
      FOREACH perm IN ARRAY admin_perms LOOP
        INSERT INTO role_permissions (role_id, permission)
        VALUES (admin_role_id, perm)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

    -- Team Member role
    INSERT INTO roles (organisation_id, name, description, is_system)
    VALUES (org_rec.id, 'Team Member', 'Standard access for day-to-day work', true)
    ON CONFLICT (organisation_id, name) DO NOTHING
    RETURNING id INTO member_role_id;

    IF member_role_id IS NOT NULL THEN
      FOREACH perm IN ARRAY member_perms LOOP
        INSERT INTO role_permissions (role_id, permission)
        VALUES (member_role_id, perm)
        ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

  END LOOP;
END;
$$;

-- Backfill custom_role_id for all existing profiles
UPDATE profiles p
SET    custom_role_id = r.id
FROM   roles r
WHERE  r.organisation_id = p.organisation_id
  AND  r.is_system = true
  AND  r.name = CASE p.role WHEN 'admin' THEN 'Admin' ELSE 'Team Member' END
  AND  p.custom_role_id IS NULL;
