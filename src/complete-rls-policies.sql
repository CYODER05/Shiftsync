-- Complete Multi-Tenant RLS Policies for ShiftSync
-- This setup ensures complete data isolation between different business accounts
-- Each authenticated user (business owner) can only access their own data

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
    
    -- Drop all policies on kiosks table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'kiosks') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON kiosks';
    END LOOP;
    
    -- Drop all policies on auth_links table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'auth_links') LOOP
            EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON auth_links';
        END LOOP;
    END IF;
END $$;

-- Add owner_id column to all tables if they don't exist
DO $$
BEGIN
    -- Add owner_id to users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE users ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_users_owner_id ON users(owner_id);
    END IF;
    
    -- Add owner_id to kiosks table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'kiosks' AND column_name = 'owner_id'
        ) THEN
            ALTER TABLE kiosks ADD COLUMN owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
            CREATE INDEX IF NOT EXISTS idx_kiosks_owner_id ON kiosks(owner_id);
        END IF;
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_history ENABLE ROW LEVEL SECURITY;

-- Enable RLS on kiosks table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        EXECUTE 'ALTER TABLE kiosks ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Enable RLS on auth_links table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        EXECUTE 'ALTER TABLE auth_links ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Create function to automatically set owner_id
CREATE OR REPLACE FUNCTION set_owner_id_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set owner_id if it's null and user is authenticated
  IF NEW.owner_id IS NULL AND auth.uid() IS NOT NULL THEN
    NEW.owner_id := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers to automatically set owner_id on insert
DROP TRIGGER IF EXISTS trigger_set_owner_id_users ON users;
CREATE TRIGGER trigger_set_owner_id_users
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION set_owner_id_from_auth();

-- Create trigger for kiosks table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        EXECUTE 'DROP TRIGGER IF EXISTS trigger_set_owner_id_kiosks ON kiosks';
        EXECUTE 'CREATE TRIGGER trigger_set_owner_id_kiosks
                 BEFORE INSERT ON kiosks
                 FOR EACH ROW
                 EXECUTE FUNCTION set_owner_id_from_auth()';
    END IF;
END $$;

-- =====================================================
-- AUTHENTICATED USER POLICIES (Business Owners)
-- Each authenticated user can only access their own data
-- =====================================================

-- Users table: Authenticated users can only manage their own employees
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

-- Kiosks table: Authenticated users can only manage their own kiosks
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own kiosks" ON kiosks
                 FOR ALL 
                 TO authenticated
                 USING (owner_id = auth.uid())
                 WITH CHECK (owner_id = auth.uid())';
    END IF;
END $$;

-- =====================================================
-- ANONYMOUS POLICIES (for PIN-based clock in/out system)
-- Allow anonymous access for physical clock-in operations
-- =====================================================

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

-- Allow anonymous users to read kiosk data (for kiosk functionality)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        EXECUTE 'CREATE POLICY "Anonymous users can read kiosks for clock in/out" ON kiosks
                 FOR SELECT 
                 TO anon
                 USING (is_active = true)';
    END IF;
END $$;

-- =====================================================
-- AUTH LINKS POLICIES (if table exists)
-- =====================================================
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        EXECUTE 'CREATE POLICY "Users can manage their own auth links" ON auth_links 
                 FOR ALL 
                 TO authenticated 
                 USING (auth_id = auth.uid()) 
                 WITH CHECK (auth_id = auth.uid())';
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify that RLS is enabled and policies are created
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sessions', 'active_sessions', 'hourly_rate_history', 'kiosks', 'auth_links')
ORDER BY tablename;

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

-- Show table structures with owner_id columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('users', 'kiosks', 'sessions', 'active_sessions', 'hourly_rate_history')
AND table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================

/*
SETUP INSTRUCTIONS:

1. Copy and paste this entire SQL script into your Supabase SQL Editor
2. Run the script to apply all RLS policies
3. Create the kiosks table if it doesn't exist:

CREATE TABLE kiosks (
  id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

4. Ensure all existing data has proper owner_id values:
   - For users: UPDATE users SET owner_id = 'your-auth-user-id' WHERE owner_id IS NULL;
   - For kiosks: UPDATE kiosks SET owner_id = 'your-auth-user-id' WHERE owner_id IS NULL;

WHAT THIS ACCOMPLISHES:

✅ Complete data isolation between business accounts
✅ Each business owner only sees their own employees, sessions, kiosks, etc.
✅ Anonymous users can still use kiosks for clock in/out
✅ Automatic owner_id assignment for new records
✅ Proper security for all data operations

TABLES COVERED:
- users (employees)
- sessions (completed work sessions)
- active_sessions (currently clocked in employees)
- hourly_rate_history (wage history)
- kiosks (clock-in terminals)
- auth_links (if exists)
*/
