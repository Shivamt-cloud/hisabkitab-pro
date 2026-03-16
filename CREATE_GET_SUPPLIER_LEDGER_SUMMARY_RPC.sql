-- =====================================================
-- Party Ledger Summary: single fast RPC (no full purchase/payment fetch)
-- Run this in Supabase SQL Editor
-- =====================================================

CREATE OR REPLACE FUNCTION get_supplier_ledger_summary(p_company_id int DEFAULT NULL)
RETURNS TABLE (
  supplier_id bigint,
  supplier_name text,
  total_purchases decimal,
  total_paid decimal,
  pending_amount decimal
) AS $$
BEGIN
  RETURN QUERY
  WITH purchase_totals AS (
    SELECT
      p.supplier_id,
      SUM(CASE WHEN p.type = 'gst' THEN COALESCE(p.grand_total, 0) ELSE COALESCE(p.total_amount, 0) END) AS total
    FROM purchases p
    WHERE p.supplier_id IS NOT NULL
      AND (p_company_id IS NULL OR p.company_id = p_company_id)
    GROUP BY p.supplier_id
  ),
  payment_totals AS (
    SELECT
      sp.supplier_id,
      SUM(sp.amount) AS total
    FROM supplier_payments sp
    WHERE (p_company_id IS NULL OR sp.company_id = p_company_id)
    GROUP BY sp.supplier_id
  ),
  purchase_paid AS (
    SELECT
      p.supplier_id,
      SUM(
        COALESCE(p.amount_paid,
          CASE WHEN p.payment_status = 'paid' THEN
            CASE WHEN p.type = 'gst' THEN COALESCE(p.grand_total, 0) ELSE COALESCE(p.total_amount, 0) END
          ELSE 0 END
        )
      ) AS total
    FROM purchases p
    WHERE p.supplier_id IS NOT NULL
      AND (p_company_id IS NULL OR p.company_id = p_company_id)
    GROUP BY p.supplier_id
  )
  SELECT
    s.id::bigint AS supplier_id,
    s.name::text AS supplier_name,
    COALESCE(pt.total, 0)::decimal AS total_purchases,
    (COALESCE(pyt.total, 0) + COALESCE(pp.total, 0))::decimal AS total_paid,
    GREATEST(0, COALESCE(pt.total, 0) - COALESCE(pyt.total, 0) - COALESCE(pp.total, 0))::decimal AS pending_amount
  FROM suppliers s
  LEFT JOIN purchase_totals pt ON s.id = pt.supplier_id
  LEFT JOIN payment_totals pyt ON s.id = pyt.supplier_id
  LEFT JOIN purchase_paid pp ON s.id = pp.supplier_id
  WHERE (p_company_id IS NULL OR s.company_id = p_company_id)
  ORDER BY GREATEST(0, COALESCE(pt.total, 0) - COALESCE(pyt.total, 0) - COALESCE(pp.total, 0)) DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_supplier_ledger_summary IS 'Returns Party Ledger summary (supplier totals) in one query. Fast alternative to loading all purchases/payments.';
