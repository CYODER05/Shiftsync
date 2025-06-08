-- Completely Disable RLS to Fix Infinite Recursion
-- Run this script in your Supabase SQL Editor

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

-- Disable RLS completely on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_history DISABLE ROW LEVEL SECURITY;

-- If auth_links table exists, disable RLS on it too
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
        EXECUTE 'ALTER TABLE auth_links DISABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Verify that RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'sessions', 'active_sessions', 'hourly_rate_history', 'auth_links');
