-- =============================================================================
-- LUSTRE — Portal Email Hook: branding lookup by slug
-- =============================================================================
-- Anon-callable SECURITY DEFINER function used by the /api/auth/email-hook
-- endpoint to look up org branding when sending branded magic-link emails.
-- No service role key required — safe for server-side use with anon key.
-- =============================================================================

CREATE OR REPLACE FUNCTION public_get_portal_branding_by_slug(p_slug TEXT)
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
    'org_name',    o.name,
    'brand_color', o.brand_color,
    'logo_url',    o.logo_url
  )
  INTO v_result
  FROM   client_portal_settings ps
  JOIN   organisations           o ON o.id = ps.organisation_id
  WHERE  ps.portal_slug    = p_slug
    AND  ps.portal_enabled = true;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public_get_portal_branding_by_slug(TEXT) TO anon;
