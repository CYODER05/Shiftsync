-- Create user_preferences table with proper RLS policies
-- This table stores user interface preferences like color mode, time format, etc.

-- Create the user_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_format VARCHAR(10) DEFAULT '12h' CHECK (time_format IN ('12h', '24h')),
    timezone VARCHAR(50) DEFAULT 'auto',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY' CHECK (date_format IN ('MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD')),
    color_mode VARCHAR(10) DEFAULT 'system' CHECK (color_mode IN ('light', 'dark', 'system')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;

-- Create RLS policy for authenticated users
CREATE POLICY "Users can manage their own preferences" ON user_preferences
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trigger_update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically create default preferences for new users
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create preferences when a new user signs up
DROP TRIGGER IF EXISTS trigger_create_default_preferences ON auth.users;
CREATE TRIGGER trigger_create_default_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- Verify the table was created successfully
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_preferences'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Verify RLS is enabled and policies exist
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'user_preferences'
AND schemaname = 'public';

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'user_preferences'
AND schemaname = 'public';

-- Add comment to document the table
COMMENT ON TABLE user_preferences IS 'Stores user interface preferences including color mode, time format, timezone, and date format settings';
COMMENT ON COLUMN user_preferences.user_id IS 'References the authenticated user from auth.users';
COMMENT ON COLUMN user_preferences.time_format IS 'Time display format: 12h or 24h';
COMMENT ON COLUMN user_preferences.timezone IS 'User timezone preference or auto for auto-detection';
COMMENT ON COLUMN user_preferences.date_format IS 'Date display format: MM/DD/YYYY, DD/MM/YYYY, or YYYY-MM-DD';
COMMENT ON COLUMN user_preferences.color_mode IS 'Color theme preference: light, dark, or system (follows OS preference)';
