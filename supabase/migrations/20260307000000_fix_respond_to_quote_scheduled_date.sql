-- =============================================================================
-- LUSTRE Migration: Fix public_respond_to_quote — include scheduled_date
-- =============================================================================
-- The jobs table requires a scheduled_date (NOT NULL).
-- The previous version of this function omitted it, causing the INSERT to
-- fail with a not-null constraint violation whenever a client accepted a quote.
-- Default to today's date; the operator can reschedule from the dashboard.
-- =============================================================================

CREATE OR REPLACE FUNCTION public_respond_to_quote(p_token TEXT, p_response TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote     quotes%ROWTYPE;
  v_job_id    uuid;
  v_quote_num text;
BEGIN
  -- Validate response value up front
  IF p_response NOT IN ('accepted', 'declined') THEN
    RETURN '{"error":"Invalid response value."}'::jsonb;
  END IF;

  -- Lock the quote row to prevent concurrent responses
  SELECT * INTO v_quote
  FROM   quotes
  WHERE  accept_token = p_token
  FOR    UPDATE;

  IF NOT FOUND THEN
    RETURN '{"error":"Quote not found."}'::jsonb;
  END IF;

  IF v_quote.status NOT IN ('sent', 'viewed') THEN
    RETURN '{"error":"This quote is no longer open for responses."}'::jsonb;
  END IF;

  IF v_quote.valid_until IS NOT NULL AND v_quote.valid_until < NOW() THEN
    RETURN '{"error":"This quote has expired. Please contact us for an updated quote."}'::jsonb;
  END IF;

  -- Record the response
  UPDATE quotes
  SET    status       = p_response,
         responded_at = NOW()
  WHERE  id = v_quote.id;

  -- If accepted: create a linked job atomically in the same transaction
  IF p_response = 'accepted' THEN
    SELECT quote_number INTO v_quote_num
    FROM   quotes
    WHERE  id = v_quote.id;

    INSERT INTO jobs (
      organisation_id, client_id, property_id,
      service_type, status, scheduled_date, price, notes
    )
    VALUES (
      v_quote.organisation_id,
      v_quote.client_id,
      v_quote.property_id,
      'other',
      'scheduled',
      CURRENT_DATE,
      v_quote.total,
      'From quote ' || v_quote_num || ': ' || v_quote.title
    )
    RETURNING id INTO v_job_id;

    UPDATE quotes
    SET    job_id = v_job_id
    WHERE  id     = v_quote.id;
  END IF;

  RETURN '{"success":true}'::jsonb;
END;
$$;

GRANT EXECUTE ON FUNCTION public_respond_to_quote(TEXT, TEXT) TO anon;
