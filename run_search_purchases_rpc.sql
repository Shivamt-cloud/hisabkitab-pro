-- Run this in Supabase SQL Editor to create/update search_purchases_for_sale
-- (partial barcode search: "89" matches "8903657644837")

CREATE OR REPLACE FUNCTION search_purchases_for_sale(
  search_query text,
  p_company_id int DEFAULT NULL
)
RETURNS SETOF purchases AS $$
DECLARE
  q text;
BEGIN
  q := trim(search_query);
  IF q = '' OR q IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.*
  FROM purchases p
  WHERE (p_company_id IS NULL OR p.company_id = p_company_id)
  AND (
    (p.supplier_name IS NOT NULL AND p.supplier_name ILIKE '%' || q || '%')
    OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      WHERE elem->>'barcode' IS NOT NULL
        AND (trim(elem->>'barcode') = q
             OR trim(elem->>'barcode') LIKE q || '%'
             OR trim(elem->>'barcode') ILIKE '%' || q || '%')
    )
    OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      WHERE elem->>'article' IS NOT NULL AND trim(lower(elem->>'article')) = lower(q)
    )
    OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      WHERE elem->>'product_name' IS NOT NULL AND trim(lower(elem->>'product_name')) LIKE '%' || lower(q) || '%'
    )
    OR
    EXISTS (
      SELECT 1 FROM jsonb_array_elements(p.items) AS elem
      JOIN products pr ON pr.id = ((elem->>'product_id')::int)
      WHERE (pr.name ILIKE '%' || q || '%'
             OR (pr.barcode IS NOT NULL AND (trim(pr.barcode) = q
                 OR trim(pr.barcode) LIKE q || '%'
                 OR trim(pr.barcode) ILIKE '%' || q || '%')))
    )
  )
  ORDER BY p.purchase_date DESC
  LIMIT 500;
END;
$$ LANGUAGE plpgsql STABLE;
