-- =============================================================================
-- LUSTRE Migration: public_mark_quote_viewed — return boolean
-- =============================================================================
-- Changes the return type from void to boolean so the application can tell
-- whether the status actually changed (true = transitioned sent→viewed for
-- the first time, false = already viewed/accepted/declined).
-- This allows the caller to fire the "quote opened" operator notification
-- exactly once, rather than on every page load.
-- =============================================================================

CREATE OR REPLACE FUNCTION public_mark_quote_viewed(p_token TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_updated boolean;
BEGIN
  UPDATE quotes
  SET    status    = 'viewed',
         viewed_at = NOW()
  WHERE  accept_token = p_token
    AND  status       = 'sent';

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public_mark_quote_viewed(TEXT) TO anon;
