-- Complete Supabase Setup Script
-- Run this script in your Supabase SQL Editor

-- First, create all tables (if they don't exist)

-- Create users table
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
  user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
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
  user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Each user can only have one active session
  CONSTRAINT unique_user_active_session UNIQUE (user_pin)
);

-- Create hourly_rate_history table
CREATE TABLE IF NOT EXISTS hourly_rate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
  rate DECIMAL(10, 2) NOT NULL,
  effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create auth_links table to link Supabase Auth users with PIN-based users
CREATE TABLE IF NOT EXISTS auth_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Now enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to insert their own user record" ON users;
DROP POLICY IF EXISTS "Users can read their own record" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert their own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can do everything on sessions" ON sessions;

DROP POLICY IF EXISTS "Users can read their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can insert their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can update their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Users can delete their own active sessions" ON active_sessions;
DROP POLICY IF EXISTS "Admins can do everything on active_sessions" ON active_sessions;

DROP POLICY IF EXISTS "Users can read their own rate history" ON hourly_rate_history;
DROP POLICY IF EXISTS "Users can insert their own rate history" ON hourly_rate_history;
DROP POLICY IF EXISTS "Admins can do everything on hourly_rate_history" ON hourly_rate_history;

DROP POLICY IF EXISTS "Users can read their own auth link" ON auth_links;
DROP POLICY IF EXISTS "Users can insert their own auth link" ON auth_links;

-- Create RLS policies

-- Users table policies
CREATE POLICY "Allow authenticated users to insert their own user record" ON users
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can read their own record" ON users
FOR SELECT 
TO authenticated
USING (auth.uid()::text IN (
  SELECT auth_id::text FROM auth_links WHERE user_pin = users.pin
));

CREATE POLICY "Users can update their own record" ON users
FOR UPDATE 
TO authenticated
USING (auth.uid()::text IN (
  SELECT auth_id::text FROM auth_links WHERE user_pin = users.pin
))
WITH CHECK (auth.uid()::text IN (
  SELECT auth_id::text FROM auth_links WHERE user_pin = users.pin
));

CREATE POLICY "Admins can read all users" ON users
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
);

CREATE POLICY "Admins can update all users" ON users
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
);

-- Sessions table policies
CREATE POLICY "Users can read their own sessions" ON sessions
FOR SELECT 
TO authenticated
USING (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Users can insert their own sessions" ON sessions
FOR INSERT 
TO authenticated
WITH CHECK (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Users can update their own sessions" ON sessions
FOR UPDATE 
TO authenticated
USING (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
))
WITH CHECK (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Admins can do everything on sessions" ON sessions
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
);

-- Active sessions table policies
CREATE POLICY "Users can read their own active sessions" ON active_sessions
FOR SELECT 
TO authenticated
USING (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Users can insert their own active sessions" ON active_sessions
FOR INSERT 
TO authenticated
WITH CHECK (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Users can update their own active sessions" ON active_sessions
FOR UPDATE 
TO authenticated
USING (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
))
WITH CHECK (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Users can delete their own active sessions" ON active_sessions
FOR DELETE 
TO authenticated
USING (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Admins can do everything on active_sessions" ON active_sessions
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
);

-- Hourly rate history table policies
CREATE POLICY "Users can read their own rate history" ON hourly_rate_history
FOR SELECT 
TO authenticated
USING (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Users can insert their own rate history" ON hourly_rate_history
FOR INSERT 
TO authenticated
WITH CHECK (user_pin IN (
  SELECT u.pin FROM users u 
  JOIN auth_links al ON u.pin = al.user_pin 
  WHERE al.auth_id = auth.uid()
));

CREATE POLICY "Admins can do everything on hourly_rate_history" ON hourly_rate_history
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users u 
    JOIN auth_links al ON u.pin = al.user_pin 
    WHERE al.auth_id = auth.uid() AND u.is_admin = true
  )
);

-- Auth links table policies
CREATE POLICY "Users can read their own auth link" ON auth_links
FOR SELECT 
TO authenticated
USING (auth_id = auth.uid());

CREATE POLICY "Users can insert their own auth link" ON auth_links
FOR INSERT 
TO authenticated
WITH CHECK (auth_id = auth.uid());

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
