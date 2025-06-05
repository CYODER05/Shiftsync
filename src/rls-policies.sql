-- Enable RLS on all tables (if not already enabled)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hourly_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_links ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to insert their own user record during signup
CREATE POLICY "Allow authenticated users to insert their own user record" ON users
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Policy to allow users to read their own user record
CREATE POLICY "Users can read their own record" ON users
FOR SELECT 
TO authenticated
USING (auth.uid()::text IN (
  SELECT auth_id::text FROM auth_links WHERE user_pin = users.pin
));

-- Policy to allow users to update their own user record
CREATE POLICY "Users can update their own record" ON users
FOR UPDATE 
TO authenticated
USING (auth.uid()::text IN (
  SELECT auth_id::text FROM auth_links WHERE user_pin = users.pin
))
WITH CHECK (auth.uid()::text IN (
  SELECT auth_id::text FROM auth_links WHERE user_pin = users.pin
));

-- Policy to allow admins to read all user records
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

-- Policy to allow admins to update all user records
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

-- Policies for sessions table
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

-- Policies for active_sessions table
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

-- Policies for hourly_rate_history table
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

-- Policies for auth_links table
CREATE POLICY "Users can read their own auth link" ON auth_links
FOR SELECT 
TO authenticated
USING (auth_id = auth.uid());

CREATE POLICY "Users can insert their own auth link" ON auth_links
FOR INSERT 
TO authenticated
WITH CHECK (auth_id = auth.uid());

-- Admin policies for all tables (admins can do everything)
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
