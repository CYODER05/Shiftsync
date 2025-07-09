-- Create roles table for job roles that can be assigned to team members
-- This replaces the old 'positions' table with proper 'roles' naming

-- First, drop the old positions table if it exists
DROP TABLE IF EXISTS positions CASCADE;

-- Create the roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    hourly_rate DECIMAL(10,2) DEFAULT 0.00,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color for visual identification
    is_active BOOLEAN DEFAULT true,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, owner_id) -- Prevent duplicate role names per owner
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_roles_owner_id ON roles(owner_id);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_active ON roles(is_active);

-- Update users table to reference roles instead of positions
-- First, drop the old position_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'position_id'
    ) THEN
        ALTER TABLE users DROP COLUMN position_id;
    END IF;
END $$;

-- Add role_id column to users table to link users to roles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role_id'
    ) THEN
        ALTER TABLE users ADD COLUMN role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
    END IF;
END $$;

-- Enable RLS on roles table
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for roles table
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own roles" ON roles;
DROP POLICY IF EXISTS "Kiosk users can read roles" ON roles;
DROP POLICY IF EXISTS "Service role can read roles for kiosk operations" ON roles;

-- Authenticated users can only manage their own roles
CREATE POLICY "Users can manage their own roles" ON roles
FOR ALL 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Allow anonymous users to read roles (for kiosk functionality)
-- This is needed so kiosks can display role information during clock in/out
CREATE POLICY "Kiosk users can read roles" ON roles
FOR SELECT 
TO anon
USING (
    is_active = true AND
    EXISTS (
        SELECT 1 FROM kiosks 
        WHERE id = current_setting('app.current_kiosk_id', true)
        AND is_active = true
        AND owner_id = roles.owner_id
    )
);

-- Alternative policy for service role approach
CREATE POLICY "Service role can read roles for kiosk operations" ON roles
FOR SELECT 
TO service_role
USING (is_active = true);

-- Create function to automatically set owner_id for roles
CREATE OR REPLACE FUNCTION set_role_owner_id()
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
DROP TRIGGER IF EXISTS trigger_set_role_owner_id ON roles;
CREATE TRIGGER trigger_set_role_owner_id
BEFORE INSERT ON roles
FOR EACH ROW
EXECUTE FUNCTION set_role_owner_id();

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_roles_updated_at ON roles;
CREATE TRIGGER trigger_update_roles_updated_at
    BEFORE UPDATE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION update_roles_updated_at();

-- Insert some default roles for new accounts
INSERT INTO roles (name, description, hourly_rate, color, owner_id) 
SELECT 
    'General Employee',
    'Default role for team members',
    15.00,
    '#3B82F6',
    auth.uid()
WHERE auth.uid() IS NOT NULL
ON CONFLICT (name, owner_id) DO NOTHING;

-- Clean up old position-related functions and triggers
DROP FUNCTION IF EXISTS set_position_owner_id() CASCADE;
DROP FUNCTION IF EXISTS update_positions_updated_at() CASCADE;

-- Verify the table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'roles'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify RLS is enabled and policies exist
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'roles'
AND schemaname = 'public';

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'roles'
AND schemaname = 'public';

-- Add comments to document the table
COMMENT ON TABLE roles IS 'Stores job roles that can be assigned to team members';
COMMENT ON COLUMN roles.name IS 'Role name (e.g., Manager, Cashier, Cook)';
COMMENT ON COLUMN roles.description IS 'Optional description of the role';
COMMENT ON COLUMN roles.hourly_rate IS 'Default hourly rate for this role';
COMMENT ON COLUMN roles.color IS 'Hex color code for visual identification';
COMMENT ON COLUMN roles.is_active IS 'Whether this role is currently active';
COMMENT ON COLUMN roles.owner_id IS 'References the business owner from auth.users';

-- Success message
SELECT 'Roles table created successfully! Old positions table has been removed.' as status;
