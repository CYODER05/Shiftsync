-- Fix RLS Policies to Remove Infinite Recursion
-- Run this script in your Supabase SQL Editor

-- Drop all existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Allow authenticated users to insert their own user record" ON users;
DROP POLICY IF EXISTS "Users can read their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can read their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can insert their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can update their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can delete their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can read their own rate history" ON hourly_rate_history;
DROP POLICY IF EXISTS "Users can insert their own rate history" ON hourly_rate_history;
DROP POLICY IF EXISTS "Users can read their own auth link" ON auth_links;
DROP POLICY IF EXISTS "Users can insert their own auth link" ON auth_links;
DROP POLICY IF EXISTS "Admins can do everything on sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can do everything on active_sessions" ON active_sessions;
DROP POLICY IF EXISTS "Admins can do everything on hourly_rate_history" ON hourly_rate_history;
DROP POLICY IF EXISTS "Admins can do everything on users" ON users;

-- Create simplified policies that allow authenticated users (admins) full access
-- without causing infinite recursion

-- Users table policies (admins can manage all employees)
CREATE POLICY "Admins can do everything on users" ON users
FOR ALL 
TO authenticated
WITH CHECK (true);

-- Sessions table policies (admins can manage all sessions)
CREATE POLICY "Admins can do everything on sessions" ON sessions
FOR ALL 
TO authenticated
WITH CHECK (true);

-- Active sessions table policies (admins can manage all active sessions)
CREATE POLICY "Admins can do everything on active_sessions" ON active_sessions
FOR ALL 
TO authenticated
WITH CHECK (true);

-- Hourly rate history table policies (admins can manage all rate history)
CREATE POLICY "Admins can do everything on hourly_rate_history" ON hourly_rate_history
FOR ALL 
TO authenticated
WITH CHECK (true);

-- If auth_links table exists, create a simple policy for it too
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'auth_links') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can do everything on auth_links" ON auth_links';
    EXECUTE 'CREATE POLICY "Admins can do everything on auth_links" ON auth_links FOR ALL TO authenticated WITH CHECK (true)';
  END IF;
END $$;
