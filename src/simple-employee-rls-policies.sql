-- Simple Employee RLS Policies
-- This setup allows:
-- 1. Authenticated users (admins via web) full access to manage employees
-- 2. No complex admin checking that causes infinite recursion
-- 3. Employees are PIN-based and don't have Supabase auth accounts

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

-- Create simple policies for authenticated users (admins via web interface)
-- These policies allow full access without any complex checks that could cause recursion

-- Users table: Authenticated users can do everything (for admin web interface)
CREATE POLICY "Authenticated users can manage all users" ON users
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Sessions table: Authenticated users can manage all sessions
CREATE POLICY "Authenticated users can manage all sessions" ON sessions
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Active sessions table: Authenticated users can manage all active sessions
CREATE POLICY "Authenticated users can manage all active sessions" ON active_sessions
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Hourly rate history table: Authenticated users can manage all rate history
CREATE POLICY "Authenticated users can manage all rate history" ON hourly_rate_history
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Auth links table (if it exists): Authenticated users can manage auth links
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        EXECUTE 'CREATE POLICY "Authenticated users can manage auth links" ON auth_links FOR ALL TO authenticated USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- For the PIN-based employee clock-in system, we need to allow anonymous access
-- to specific operations (clock in/out) since employees don't have Supabase accounts

-- Allow anonymous users to read user data (for PIN validation during clock in/out)
CREATE POLICY "Anonymous users can read users for PIN validation" ON users
FOR SELECT 
TO anon
USING (true);

-- Allow anonymous users to insert/update/delete active sessions (for clock in/out)
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
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
