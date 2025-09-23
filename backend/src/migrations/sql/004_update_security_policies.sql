-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can read securities" ON securities_master;

DROP POLICY IF EXISTS "Authenticated users can insert securities" ON securities_master;

-- Create more permissive policies for securities_master
CREATE POLICY "Enable read access for all users" ON securities_master FOR
SELECT USING (true);

CREATE POLICY "Enable insert access for authenticated users" ON securities_master FOR INSERT
WITH
    CHECK (
        auth.role () = 'authenticated'
    );

CREATE POLICY "Enable update access for authenticated users" ON securities_master
FOR UPDATE
    USING (
        auth.role () = 'authenticated'
    );

-- Allow authenticated users to update prices and names
CREATE POLICY "Allow price updates" ON securities_master
FOR UPDATE
    USING (
        auth.role () = 'authenticated'
    )
WITH
    CHECK (
        auth.role () = 'authenticated'
        AND (
            OLD.symbol = NEW.symbol
            AND OLD.security_type = NEW.security_type
        ) -- Prevent changing key identifiers
    );

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_securities_symbol_type ON securities_master (symbol, security_type);