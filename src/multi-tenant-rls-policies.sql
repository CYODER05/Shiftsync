-- Multi-Tenant RLS Policies
-- This setup allows:
-- 1. Each authenticated user (business owner) can only access their own employees and data
-- 2. Employees are PIN-based and can clock in/out anonymously
-- 3. Data isolation between different business accounts

-- First, drop ALL existing policies to ensure clean slate
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON users';
    END LOOP;
    
    -- Drop all policies on sessions table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'sessions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON sessions';
    END LOOP;
    
    -- Drop all policies on active_sessions table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'active_sessions') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON active_sessions';
    END LOOP;
    
    -- Drop all policies on hourly_rate_history table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'hourly_rate_history') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON hourly_rate_history';
    END LOOP;
    
    -- Drop all policies on auth_links table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'auth_links') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON auth_links';
        END LOOP;
    END IF;
END $$;

-- Add owner_id column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE users ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_users_owner_id ON users(owner_id);
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_history ENABLE ROW LEVEL SECURITY;

-- If auth_links table exists, enable RLS on it too
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        EXECUTE 'ALTER TABLE auth_links ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- AUTHENTICATED USER POLICIES (Business Owners)
-- Each authenticated user can only access their own employees and data

CREATE OR REPLACE FUNCTION set_owner_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set owner_id if it's null
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Users table: Authenticated users can only manage their own employees

DROP TRIGGER IF EXISTS trigger_set_owner_id ON users;

CREATE TRIGGER trigger_set_owner_id
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_owner_id_from_auth();

CREATE POLICY "Users can manage their own employees" ON users
FOR ALL 
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Sessions table: Authenticated users can only see sessions from their employees
CREATE POLICY "Users can manage sessions from their employees" ON sessions
FOR ALL 
TO authenticated
USING (
    user_pin IN (
        SELECT pin FROM users WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    user_pin IN (
        SELECT pin FROM users WHERE owner_id = auth.uid()
    )
);

-- Active sessions table: Authenticated users can only see active sessions from their employees
CREATE POLICY "Users can manage active sessions from their employees" ON active_sessions
FOR ALL 
TO authenticated
USING (
    user_pin IN (
        SELECT pin FROM users WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    user_pin IN (
        SELECT pin FROM users WHERE owner_id = auth.uid()
    )
);

-- Hourly rate history table: Authenticated users can only see rate history from their employees
CREATE POLICY "Users can manage rate history from their employees" ON hourly_rate_history
FOR ALL 
TO authenticated
USING (
    user_pin IN (
        SELECT pin FROM users WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    user_pin IN (
        SELECT pin FROM users WHERE owner_id = auth.uid()
    )
);

-- ANONYMOUS POLICIES (for PIN-based clock in/out system)
-- Allow anonymous access for physical clock-in operations

-- Allow anonymous users to read user data (for PIN validation during clock in/out)
CREATE POLICY "Anonymous users can read users for PIN validation" ON users
FOR SELECT 
TO anon
USING (true);

-- Allow anonymous users to manage active sessions (for clock in/out)
CREATE POLICY "Anonymous users can manage active sessions for clock in/out" ON active_sessions
FOR ALL 
TO anon
USING (true)
WITH CHECK (true);

-- Allow anonymous users to insert sessions (for completed clock out)
CREATE POLICY "Anonymous users can insert sessions for clock out" ON sessions
FOR INSERT 
TO anon
WITH CHECK (true);

-- Allow anonymous users to read hourly rate history (for payroll calculations)
CREATE POLICY "Anonymous users can read rate history" ON hourly_rate_history
FOR SELECT 
TO anon
USING (true);

-- Auth links policies (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own auth links" ON auth_links FOR ALL TO authenticated USING (auth_id = auth.uid()) WITH CHECK (auth_id = auth.uid())';
    END IF;
END $$;

-- Verify that RLS is enabled and policies are created
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sessions', 'active_sessions', 'hourly_rate_history', 'auth_links');

-- Show all policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Show the new column structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
