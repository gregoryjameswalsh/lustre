-- =============================================================================
-- LUSTRE — Add brand_color to public_get_quote_by_token result
-- =============================================================================

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
      'brand_color',   o.brand_color,
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

GRANT EXECUTE ON FUNCTION public_get_quote_by_token(TEXT) TO anon;
