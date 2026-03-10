-- =============================================================================
-- LUSTRE Migration: Member suspension
-- Adds suspended_at to profiles and a SECURITY DEFINER RPC so admins can
-- suspend/unsuspend members in their org without needing the service role key.
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_at timestamptz DEFAULT NULL;

-- ---------------------------------------------------------------------------
-- set_member_suspended(p_profile_id, p_suspended)
-- Called by admins to suspend or unsuspend a team member.
-- Guards:
--   - caller must be admin
--   - target must be in the same org
--   - cannot suspend yourself
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_member_suspended(
  p_profile_id uuid,
  p_suspended  boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_org  uuid;
  v_caller_role text;
  v_target_org  uuid;
BEGIN
  SELECT organisation_id, role
    INTO v_caller_org, v_caller_role
    FROM profiles
   WHERE id = auth.uid();

  IF v_caller_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Only admins can suspend members';
  END IF;

  IF p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot suspend yourself';
  END IF;

  SELECT organisation_id
    INTO v_target_org
    FROM profiles
   WHERE id = p_profile_id;

  IF v_target_org IS DISTINCT FROM v_caller_org THEN
    RAISE EXCEPTION 'Cannot suspend a member from another organisation';
  END IF;

  UPDATE profiles
     SET suspended_at = CASE WHEN p_suspended THEN now() ELSE NULL END
   WHERE id = p_profile_id;
END;
$$;
