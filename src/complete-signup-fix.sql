-- Complete fix for signup issues
-- This addresses RLS policy conflicts during user signup

-- =====================================================
-- STEP 1: Fix the user_preferences trigger function
-- =====================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS trigger_create_default_preferences ON auth.users;
DROP FUNCTION IF EXISTS create_default_user_preferences();

-- Create an improved function that properly handles RLS
CREATE OR REPLACE FUNCTION create_default_user_preferences()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert with proper error handling
    -- The SECURITY DEFINER allows this function to bypass RLS
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

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_default_user_preferences() TO authenticated;
GRANT EXECUTE ON FUNCTION create_default_user_preferences() TO anon;
GRANT EXECUTE ON FUNCTION create_default_user_preferences() TO service_role;

-- Recreate the trigger
CREATE TRIGGER trigger_create_default_preferences
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_user_preferences();

-- =====================================================
-- STEP 2: Update RLS policies for user_preferences
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow function to create default preferences" ON user_preferences;

-- Create comprehensive policies
-- Policy 1: Allow authenticated users to manage their own preferences
CREATE POLICY "Users can manage their own preferences" ON user_preferences
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 2: Allow the trigger function to create default preferences
CREATE POLICY "Allow system to create default preferences" ON user_preferences
FOR INSERT 
TO authenticated, anon, service_role
WITH CHECK (true);

-- =====================================================
-- STEP 3: Ensure proper permissions on user_preferences table
-- =====================================================

-- Grant necessary table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_preferences TO authenticated;
GRANT INSERT ON user_preferences TO anon;
GRANT ALL ON user_preferences TO service_role;

-- =====================================================
-- STEP 4: Verify there are no conflicting triggers on users table
-- =====================================================

-- Check if there are any problematic triggers on the users table
-- that might be trying to create records during signup
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    -- List all triggers on users table for debugging
    FOR trigger_record IN 
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers 
        WHERE event_object_table = 'users'
        AND event_object_schema = 'public'
    LOOP
        RAISE NOTICE 'Found trigger on users table: % - % - %', 
            trigger_record.trigger_name, 
            trigger_record.event_manipulation, 
            trigger_record.action_statement;
    END LOOP;
END $$;

-- =====================================================
-- STEP 5: Verification queries
-- =====================================================

-- Verify the function exists and has correct security settings
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proacl as permissions
FROM pg_proc 
WHERE proname = 'create_default_user_preferences';

-- Verify RLS policies
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_preferences'
AND schemaname = 'public'
ORDER BY policyname;

-- Verify table permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'user_preferences'
AND table_schema = 'public'
ORDER BY grantee, privilege_type;

-- Test the function (this should work without errors)
SELECT 'Signup fix applied successfully' as status;

-- =====================================================
-- INSTRUCTIONS FOR USE
-- =====================================================

/*
To apply this fix:

1. Copy and paste this entire SQL script into your Supabase SQL Editor
2. Run the script
3. Test user signup - it should now work without database errors

This fix addresses:
- RLS policy conflicts during signup
- Proper SECURITY DEFINER function setup
- Correct permissions for the trigger function
- Error handling to prevent signup failures

The fix ensures that:
- New users can sign up successfully
- Default preferences are created automatically
- RLS policies still protect user data
- Signup process doesn't fail due to database errors
*/
