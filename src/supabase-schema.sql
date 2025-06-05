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

-- Create functions for table creation
CREATE OR REPLACE FUNCTION create_users_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
    CREATE TABLE users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      pin VARCHAR(4) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      role VARCHAR(255),
      current_hourly_rate DECIMAL(10, 2) DEFAULT 0,
      is_admin BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_sessions_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'sessions') THEN
    CREATE TABLE sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
      clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
      clock_out TIMESTAMP WITH TIME ZONE,
      duration BIGINT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT clock_out_after_clock_in CHECK (clock_out IS NULL OR clock_out > clock_in)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_active_sessions_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'active_sessions') THEN
    CREATE TABLE active_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
      clock_in TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      CONSTRAINT unique_user_active_session UNIQUE (user_pin)
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_hourly_rate_history_table_if_not_exists()
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'hourly_rate_history') THEN
    CREATE TABLE hourly_rate_history (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
      rate DECIMAL(10, 2) NOT NULL,
      effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

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

-- Create trigger for session duration
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

-- Create triggers for timestamps
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_sessions_timestamp
BEFORE UPDATE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Create auth_links table to link Supabase Auth users with PIN-based users
CREATE TABLE IF NOT EXISTS auth_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  user_pin VARCHAR(4) NOT NULL REFERENCES users(pin) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to get table columns
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

-- Create function to add email column to users table
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
