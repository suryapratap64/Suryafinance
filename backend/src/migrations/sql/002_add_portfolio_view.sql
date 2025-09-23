-- Drop existing view if exists
DROP VIEW IF EXISTS portfolio_summary;

-- Create portfolio summary view with built-in security
CREATE VIEW portfolio_summary AS
SELECT
    t.user_id,
    t.security_id,
    sm.symbol,
    sm.name,
    sm.security_type,
    sm.last_price,
    SUM(
        CASE
            WHEN t.transaction_type = 'BUY' THEN t.quantity
            ELSE - t.quantity
        END
    ) as total_quantity,
    SUM(
        CASE
            WHEN t.transaction_type = 'BUY' THEN t.total_amount
            ELSE - t.total_amount
        END
    ) as total_investment
FROM
    transactions t
    JOIN securities_master sm ON t.security_id = sm.id
WHERE
    -- Built-in row-level security using auth.uid()
    t.user_id = auth.uid ()
GROUP BY
    t.user_id,
    t.security_id,
    sm.symbol,
    sm.name,
    sm.security_type,
    sm.last_price;

-- Grant access to authenticated users
GRANT SELECT ON portfolio_summary TO authenticated;

-- Revoke access from other roles for extra security
REVOKE ALL ON portfolio_summary FROM anon, service_role;