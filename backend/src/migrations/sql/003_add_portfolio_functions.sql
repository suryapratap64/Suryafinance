-- Function to get stock holdings
CREATE OR REPLACE FUNCTION get_stock_holdings(p_user_id UUID)
RETURNS TABLE (
    symbol VARCHAR,
    name VARCHAR,
    current_price DECIMAL,
    total_quantity DECIMAL,
    avg_price DECIMAL,
    total_investment DECIMAL,
    holding_days INTEGER,
    current_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sm.symbol,
        sm.name,
        sm.last_price as current_price,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) as total_quantity,
        AVG(CASE WHEN t.transaction_type = 'BUY' THEN t.price_per_unit END) as avg_price,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_amount ELSE -t.total_amount END) as total_investment,
        DATE_PART('day', NOW() - MIN(t.transaction_date))::INTEGER as holding_days,
        (SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) * sm.last_price) as current_value
    FROM transactions t
    JOIN securities_master sm ON t.security_id = sm.id
    WHERE t.user_id = p_user_id AND sm.security_type = 'STOCK'
    GROUP BY sm.id, sm.symbol, sm.name, sm.last_price
    HAVING SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mutual fund holdings
CREATE OR REPLACE FUNCTION get_mutual_fund_holdings(p_user_id UUID)
RETURNS TABLE (
    symbol VARCHAR,
    name VARCHAR,
    current_nav DECIMAL,
    total_units DECIMAL,
    avg_nav DECIMAL,
    total_investment DECIMAL,
    holding_days INTEGER,
    current_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sm.symbol,
        sm.name,
        sm.last_price as current_nav,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) as total_units,
        AVG(CASE WHEN t.transaction_type = 'BUY' THEN t.price_per_unit END) as avg_nav,
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_amount ELSE -t.total_amount END) as total_investment,
        DATE_PART('day', NOW() - MIN(t.transaction_date))::INTEGER as holding_days,
        (SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) * sm.last_price) as current_value
    FROM transactions t
    JOIN securities_master sm ON t.security_id = sm.id
    WHERE t.user_id = p_user_id AND (sm.security_type = 'MF' OR sm.security_type = 'MUTUAL_FUND')
    GROUP BY sm.id, sm.symbol, sm.name, sm.last_price
    HAVING SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) > 0
    ORDER BY current_value DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get portfolio summary
CREATE OR REPLACE FUNCTION get_portfolio_summary(p_user_id UUID)
RETURNS TABLE (
    total_investment DECIMAL,
    current_value DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        SUM(CASE WHEN t.transaction_type = 'BUY' THEN t.total_amount ELSE -t.total_amount END) as total_investment,
        SUM((CASE WHEN t.transaction_type = 'BUY' THEN t.quantity ELSE -t.quantity END) * sm.last_price) as current_value
    FROM transactions t
    JOIN securities_master sm ON t.security_id = sm.id
    WHERE t.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;