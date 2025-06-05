-- Simplified RLS Policies for Employee-Only Users Table
-- Run this script in your Supabase SQL Editor

-- First, create all tables (if they don't exist)

-- Create users table (for employees only)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pin VARCHAR(4) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255),
  current_hourly_rate DECIMAL(10, 2) DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  email VARCHAR(255) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pin VARCHAR(4) NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out TIMESTAMP WITH TIME ZONE,
  duration BIGINT, -- stored in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraint to ensure clock_out is after clock_in
  CONSTRAINT clock_out_after_clock_in CHECK (clock_out IS NULL OR clock_out > clock_in)
);

-- Create active_sessions table
CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pin VARCHAR(4) NOT NULL,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Each user can only have one active session
  CONSTRAINT unique_user_active_session UNIQUE (user_pin)
);

-- Create hourly_rate_history table
CREATE TABLE IF NOT EXISTS hourly_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pin VARCHAR(4) NOT NULL,
  rate DECIMAL(10, 2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints after all tables are created
DO $$
BEGIN
  -- Add foreign key for sessions.user_pin if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'sessions_user_pin_fkey' 
    AND table_name = 'sessions'
  ) THEN
    ALTER TABLE sessions ADD CONSTRAINT sessions_user_pin_fkey 
    FOREIGN KEY (user_pin) REFERENCES users(pin) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for active_sessions.user_pin if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'active_sessions_user_pin_fkey' 
    AND table_name = 'active_sessions'
  ) THEN
    ALTER TABLE active_sessions ADD CONSTRAINT active_sessions_user_pin_fkey 
    FOREIGN KEY (user_pin) REFERENCES users(pin) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for hourly_rate_history.user_pin if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'hourly_rate_history_user_pin_fkey' 
    AND table_name = 'hourly_rate_history'
  ) THEN
    ALTER TABLE hourly_rate_history ADD CONSTRAINT hourly_rate_history_user_pin_fkey 
    FOREIGN KEY (user_pin) REFERENCES users(pin) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function to update session duration
CREATE OR REPLACE FUNCTION update_session_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL THEN
    NEW.duration := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for session duration (only if it doesn't exist)
DROP TRIGGER IF EXISTS update_session_duration_trigger ON sessions;
CREATE TRIGGER update_session_duration_trigger
BEFORE INSERT OR UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_session_duration();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamps (only if they don't exist)
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

DROP TRIGGER IF EXISTS update_sessions_timestamp ON sessions;
CREATE TRIGGER update_sessions_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Admins can do everything on users" ON users;
DROP POLICY IF EXISTS "Admins can do everything on sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can do everything on active_sessions" ON active_sessions;
DROP POLICY IF EXISTS "Admins can do everything on hourly_rate_history" ON hourly_rate_history;

-- Create simplified RLS policies
-- Since admins are now Supabase Auth users only, we just need to allow authenticated users (admins) full access

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

-- Create helper functions
CREATE OR REPLACE FUNCTION get_table_columns(table_name text)
RETURNS TABLE (
  column_name text,
  data_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT c.column_name::text, c.data_type::text
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = table_name;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION add_email_column_to_users()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'email'
  ) THEN
    ALTER TABLE users ADD COLUMN email VARCHAR(255) UNIQUE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Execute the email column function
SELECT add_email_column_to_users();
