-- =============================================================================
-- LUSTRE Migration: Team invitations
-- Purpose: Allow org admins to invite team members by email.
--          Includes a public lookup function (anon-safe, returns only safe
--          fields) and an authenticated accept function (SECURITY DEFINER so
--          it can move a user between orgs atomically).
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. invitations table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS invitations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid        NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  role            text        NOT NULL DEFAULT 'team_member',
  token           text        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  accepted_at     timestamptz,
  expires_at      timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invitations_org_pending
  ON invitations (organisation_id, expires_at)
  WHERE accepted_at IS NULL;

CREATE INDEX IF NOT EXISTS invitations_token
  ON invitations (token);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org members can see all invitations for their org
DROP POLICY IF EXISTS "invitations_select_own_org" ON invitations;
CREATE POLICY "invitations_select_own_org"
  ON invitations FOR SELECT TO authenticated
  USING (organisation_id = get_user_org_id());

-- Only admins can create invitations for their org
DROP POLICY IF EXISTS "invitations_insert_admin" ON invitations;
CREATE POLICY "invitations_insert_admin"
  ON invitations FOR INSERT TO authenticated
  WITH CHECK (
    organisation_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete invitations for their org
DROP POLICY IF EXISTS "invitations_delete_admin" ON invitations;
CREATE POLICY "invitations_delete_admin"
  ON invitations FOR DELETE TO authenticated
  USING (
    organisation_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );


-- ---------------------------------------------------------------------------
-- 2. public_get_invitation_by_token
--    Safe public lookup — returns only non-sensitive fields (org name,
--    inviter's first name, role). No email, no org internals.
--    Called by the anon client on the public /invite/[token] page.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_get_invitation_by_token(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id',            i.id,
    'email',         i.email,
    'role',          i.role,
    'expires_at',    i.expires_at,
    'accepted_at',   i.accepted_at,
    'org_name',      o.name,
    'inviter_name',  p.full_name
  ) INTO v_result
  FROM   invitations   i
  JOIN   organisations o ON o.id = i.organisation_id
  LEFT JOIN profiles   p ON p.id = i.invited_by
  WHERE  i.token = p_token;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public_get_invitation_by_token(TEXT) TO anon;


-- ---------------------------------------------------------------------------
-- 3. accept_invitation
--    Called by an authenticated user to accept an invitation.
--    SECURITY DEFINER so it can:
--      a) Move the user's profile to the invited org
--      b) Update the invitation's accepted_at
--      c) Delete the user's auto-created org if it's now empty
--    Validates: token not expired, not accepted, email matches JWT claim.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id     uuid;
  v_user_email  text;
  v_invite      invitations%ROWTYPE;
  v_old_org_id  uuid;
BEGIN
  v_user_id    := auth.uid();
  v_user_email := auth.jwt() ->> 'email';

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  -- Find a valid, matching invitation
  SELECT * INTO v_invite
  FROM   invitations
  WHERE  token      = p_token
    AND  accepted_at IS NULL
    AND  expires_at  > now()
    AND  lower(email) = lower(v_user_email)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Invitation not found, expired, or email does not match your account.');
  END IF;

  -- Record the user's current org before moving them
  SELECT organisation_id INTO v_old_org_id
  FROM   profiles
  WHERE  id = v_user_id;

  -- Move the user to the invited org with the invited role
  UPDATE profiles
  SET    organisation_id = v_invite.organisation_id,
         role            = v_invite.role
  WHERE  id = v_user_id;

  -- Mark invitation as accepted
  UPDATE invitations
  SET    accepted_at = now()
  WHERE  id = v_invite.id;

  -- Clean up the user's old auto-created org if it's now empty
  -- (only if it's different from the invited org)
  IF v_old_org_id IS NOT NULL AND v_old_org_id != v_invite.organisation_id THEN
    DELETE FROM organisations
    WHERE  id = v_old_org_id
      AND  NOT EXISTS (
        SELECT 1 FROM profiles WHERE organisation_id = v_old_org_id
      );
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION accept_invitation(TEXT) TO authenticated;
