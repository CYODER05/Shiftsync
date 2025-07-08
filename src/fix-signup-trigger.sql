-- Fix the signup trigger issue by updating the function to properly handle RLS
-- The issue is that the trigger tries to insert into user_preferences during signup
-- but RLS policies prevent this because the user isn't authenticated yet

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_default_preferences ON auth.users;
DROP FUNCTION IF EXISTS create_default_user_preferences();

-- Create an improved function that can bypass RLS for this specific operation
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Use SECURITY DEFINER to run with elevated privileges
    -- This allows the function to bypass RLS during user signup
    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the signup process
        RAISE WARNING 'Failed to create default user preferences for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions to the function
GRANT EXECUTE ON FUNCTION create_default_user_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_user_preferences() TO anon;

-- Recreate the trigger
CREATE TRIGGER trigger_create_default_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- Also need to update the RLS policy to allow the function to insert
-- Create a special policy for the SECURITY DEFINER function
DROP POLICY IF EXISTS "Allow function to create default preferences" ON user_preferences;
CREATE POLICY "Allow function to create default preferences" ON user_preferences
FOR INSERT 
TO authenticated, anon
WITH CHECK (true);

-- Keep the existing policy for regular operations
-- The existing policy "Users can manage their own preferences" handles SELECT, UPDATE, DELETE

-- Verify the setup
SELECT 
    proname as function_name,
    prosecdef as security_definer
FROM pg_proc 
WHERE proname = 'create_default_user_preferences';

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE tablename = 'user_preferences'
AND schemaname = 'public'
ORDER BY policyname;
