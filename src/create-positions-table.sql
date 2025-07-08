-- Create positions table for job positions/roles that can be assigned to team members
-- This allows businesses to define custom positions like "Manager", "Cashier", "Cook", etc.

-- Create the positions table
CREATE TABLE IF NOT EXISTS positions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for visual identification
    is_active BOOLEAN DEFAULT true,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, owner_id) -- Prevent duplicate position names per owner
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_positions_owner_id ON positions(owner_id);
CREATE INDEX IF NOT EXISTS idx_positions_name ON positions(name);
CREATE INDEX IF NOT EXISTS idx_positions_active ON positions(is_active);

-- Add position_id column to users table to link users to positions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'position_id'
    ) THEN
        ALTER TABLE users ADD COLUMN position_id UUID REFERENCES positions(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_users_position_id ON users(position_id);
    END IF;
END $$;

-- Enable RLS on positions table
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for positions table
-- Authenticated users can only manage their own positions
CREATE POLICY "Users can manage their own positions" ON positions
FOR ALL 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Allow anonymous users to read positions (for kiosk functionality)
-- This is needed so kiosks can display position information during clock in/out
CREATE POLICY "Kiosk users can read positions" ON positions
FOR SELECT 
TO anon
USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM kiosks 
        WHERE id = current_setting('app.current_kiosk_id', true)
        AND is_active = true
        AND owner_id = positions.owner_id
    )
);

-- Alternative policy for service role approach
CREATE POLICY "Service role can read positions for kiosk operations" ON positions
FOR SELECT 
TO service_role
USING (is_active = true);

-- Create function to automatically set owner_id for positions
CREATE OR REPLACE FUNCTION set_position_owner_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set owner_id if it's null and user is authenticated
    IF NEW.owner_id IS NULL AND auth.uid() IS NOT NULL THEN
        NEW.owner_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set owner_id on insert
DROP TRIGGER IF EXISTS trigger_set_position_owner_id ON positions;
CREATE TRIGGER trigger_set_position_owner_id
BEFORE INSERT ON positions
FOR EACH ROW
EXECUTE FUNCTION set_position_owner_id();

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_positions_updated_at ON positions;
CREATE TRIGGER trigger_update_positions_updated_at
    BEFORE UPDATE ON positions
    FOR EACH ROW
    EXECUTE FUNCTION update_positions_updated_at();

-- Insert some default positions for new accounts
INSERT INTO positions (name, description, hourly_rate, color, owner_id) 
SELECT 
    'General Employee',
    'Default position for team members',
    15.00,
    '#3B82F6',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (name, owner_id) DO NOTHING;

-- Verify the table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'positions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify RLS is enabled and policies exist
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'positions'
AND schemaname = 'public';

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'positions'
AND schemaname = 'public';

-- Add comments to document the table
COMMENT ON TABLE positions IS 'Stores job positions/roles that can be assigned to team members';
COMMENT ON COLUMN positions.name IS 'Position name (e.g., Manager, Cashier, Cook)';
COMMENT ON COLUMN positions.description IS 'Optional description of the position';
COMMENT ON COLUMN positions.hourly_rate IS 'Default hourly rate for this position';
COMMENT ON COLUMN positions.color IS 'Hex color code for visual identification';
COMMENT ON COLUMN positions.is_active IS 'Whether this position is currently active';
COMMENT ON COLUMN positions.owner_id IS 'References the business owner from auth.users';
