-- =============================================================================
-- LUSTRE Migration: Public quote SECURITY DEFINER functions
-- Purpose: Remove the service role key from the application request path.
--          These functions are called by the anon Supabase client on the public
--          /q/[token] page and its associated server actions.
--          They execute as the function owner (postgres), bypassing RLS in a
--          tightly scoped, auditable way.
--          The service role key is no longer required in the application.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. public_get_quote_by_token
--    Returns all data needed to render the public /q/[token] page.
--    Read-only, STABLE — safe to call with zero session context.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_get_quote_by_token(p_token TEXT)
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
    'id',           q.id,
    'quote_number', q.quote_number,
    'title',        q.title,
    'status',       q.status,
    'pricing_type', q.pricing_type,
    'fixed_price',  q.fixed_price,
    'subtotal',     q.subtotal,
    'tax_rate',     q.tax_rate,
    'tax_amount',   q.tax_amount,
    'total',        q.total,
    'notes',        q.notes,
    'valid_until',  q.valid_until,
    'responded_at', q.responded_at,
    'accept_token', q.accept_token,
    'clients', jsonb_build_object(
      'first_name', cl.first_name,
      'last_name',  cl.last_name
    ),
    'properties', CASE WHEN p.id IS NOT NULL THEN jsonb_build_object(
      'address_line1', p.address_line1,
      'town',          p.town,
      'postcode',      p.postcode
    ) ELSE NULL END,
    'organisations', jsonb_build_object(
      'name',          o.name,
      'phone',         o.phone,
      'email',         o.email,
      'logo_url',      o.logo_url,
      'address_line1', o.address_line1,
      'town',          o.town,
      'postcode',      o.postcode
    ),
    'quote_line_items', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id',          li.id,
          'description', li.description,
          'quantity',    li.quantity,
          'unit_price',  li.unit_price,
          'amount',      li.amount,
          'is_addon',    li.is_addon,
          'sort_order',  li.sort_order
        )
        ORDER BY li.sort_order
      )
      FROM quote_line_items li
      WHERE li.quote_id = q.id
    ), '[]'::jsonb)
  ) INTO v_result
  FROM       quotes        q
  JOIN       clients       cl ON cl.id = q.client_id
  LEFT JOIN  properties    p  ON p.id  = q.property_id
  JOIN       organisations o  ON o.id  = q.organisation_id
  WHERE q.accept_token = p_token;

  RETURN v_result;
END;
$$;

-- Allow the anon role (unauthenticated browser / server-side anon key) to call this
GRANT EXECUTE ON FUNCTION public_get_quote_by_token(TEXT) TO anon;


-- ---------------------------------------------------------------------------
-- 2. public_mark_quote_viewed
--    Transitions a quote from 'sent' → 'viewed' exactly once.
--    Idempotent: only fires if status = 'sent'.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public_mark_quote_viewed(p_token TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE quotes
  SET    status    = 'viewed',
         viewed_at = NOW()
  WHERE  accept_token = p_token
    AND  status       = 'sent';
END;
$$;

GRANT EXECUTE ON FUNCTION public_mark_quote_viewed(TEXT) TO anon;


-- ---------------------------------------------------------------------------
-- 3. public_respond_to_quote
--    Accepts or declines a quote via its token.
--    If accepted, atomically creates a linked job in the same transaction.
--    Returns jsonb: {"success":true} or {"error":"<message>"}
-- ---------------------------------------------------------------------------

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
      service_type, status, price, notes
    )
    VALUES (
      v_quote.organisation_id,
      v_quote.client_id,
      v_quote.property_id,
      'other',
      'scheduled',
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
