-- CRITICAL SECURITY FIX: Fix data isolation issues in RLS policies
-- The current anonymous policies allow unrestricted access to all data
-- This fix maintains kiosk functionality while ensuring proper data isolation

-- =====================================================
-- STEP 1: Drop the problematic anonymous policies
-- =====================================================

-- Drop all existing policies that allow unrestricted anonymous access
DROP POLICY IF EXISTS "Anonymous users can read users for PIN validation" ON users;
DROP POLICY IF EXISTS "Anonymous users can manage active sessions for clock in/out" ON active_sessions;
DROP POLICY IF EXISTS "Anonymous users can insert sessions for clock out" ON sessions;
DROP POLICY IF EXISTS "Anonymous users can read rate history" ON hourly_rate_history;

-- Drop kiosk policy if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        EXECUTE 'DROP POLICY IF EXISTS "Anonymous users can read kiosks for clock in/out" ON kiosks';
    END IF;
END $$;

-- =====================================================
-- STEP 2: Create secure kiosk-specific policies
-- =====================================================

-- For kiosk functionality, we need a different approach that doesn't leak data
-- Option 1: Use kiosk-specific policies that only work with specific kiosk IDs

-- Allow anonymous users to read users ONLY for specific kiosk operations
-- This policy requires a kiosk_id context to be set
CREATE POLICY "Kiosk users can read users for PIN validation" ON users
FOR SELECT 
TO anon
USING (
    -- Only allow if there's a valid kiosk context
    -- This requires the application to set a kiosk context before PIN validation
    EXISTS (
        SELECT 1 FROM kiosks 
        WHERE id = current_setting('app.current_kiosk_id', true)
        AND is_active = true
        AND owner_id = users.owner_id
    )
);

-- Allow anonymous users to manage active sessions ONLY for the current kiosk's owner
CREATE POLICY "Kiosk users can manage active sessions" ON active_sessions
FOR ALL 
TO anon
USING (
    user_pin IN (
        SELECT u.pin FROM users u
        JOIN kiosks k ON k.owner_id = u.owner_id
        WHERE k.id = current_setting('app.current_kiosk_id', true)
        AND k.is_active = true
    )
)
WITH CHECK (
    user_pin IN (
        SELECT u.pin FROM users u
        JOIN kiosks k ON k.owner_id = u.owner_id
        WHERE k.id = current_setting('app.current_kiosk_id', true)
        AND k.is_active = true
    )
);

-- Allow anonymous users to insert sessions ONLY for the current kiosk's owner
CREATE POLICY "Kiosk users can insert sessions" ON sessions
FOR INSERT 
TO anon
WITH CHECK (
    user_pin IN (
        SELECT u.pin FROM users u
        JOIN kiosks k ON k.owner_id = u.owner_id
        WHERE k.id = current_setting('app.current_kiosk_id', true)
        AND k.is_active = true
    )
);

-- Allow anonymous users to read rate history ONLY for the current kiosk's owner
CREATE POLICY "Kiosk users can read rate history" ON hourly_rate_history
FOR SELECT 
TO anon
USING (
    user_pin IN (
        SELECT u.pin FROM users u
        JOIN kiosks k ON k.owner_id = u.owner_id
        WHERE k.id = current_setting('app.current_kiosk_id', true)
        AND k.is_active = true
    )
);

-- Allow anonymous users to read kiosk data (but only active kiosks)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        EXECUTE 'CREATE POLICY "Anonymous users can read active kiosks" ON kiosks
                 FOR SELECT 
                 TO anon
                 USING (is_active = true)';
    END IF;
END $$;

-- =====================================================
-- STEP 3: Alternative approach - Service role for kiosks
-- =====================================================

-- If the above approach is too complex, we can use a service role approach
-- Create policies that allow service_role to access data for kiosk operations

-- Allow service_role to read users (for kiosk PIN validation)
CREATE POLICY "Service role can read users for kiosk operations" ON users
FOR SELECT 
TO service_role
USING (true);

-- Allow service_role to manage active sessions (for kiosk operations)
CREATE POLICY "Service role can manage active sessions for kiosk operations" ON active_sessions
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Allow service_role to insert sessions (for kiosk operations)
CREATE POLICY "Service role can insert sessions for kiosk operations" ON sessions
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Allow service_role to read rate history (for kiosk operations)
CREATE POLICY "Service role can read rate history for kiosk operations" ON hourly_rate_history
FOR SELECT 
TO service_role
USING (true);

-- =====================================================
-- STEP 4: Create helper function for kiosk context
-- =====================================================

-- Function to set kiosk context for anonymous operations
CREATE OR REPLACE FUNCTION set_kiosk_context(kiosk_id TEXT)
RETURNS void AS $$
BEGIN
    -- Verify the kiosk exists and is active
    IF NOT EXISTS (SELECT 1 FROM kiosks WHERE id = kiosk_id AND is_active = true) THEN
        RAISE EXCEPTION 'Invalid or inactive kiosk ID: %', kiosk_id;
    END IF;
    
    -- Set the context
    PERFORM set_config('app.current_kiosk_id', kiosk_id, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION set_kiosk_context(TEXT) TO anon;

-- =====================================================
-- STEP 5: Verification and cleanup
-- =====================================================

-- Verify all policies are correctly set
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('users', 'sessions', 'active_sessions', 'hourly_rate_history', 'kiosks')
ORDER BY tablename, policyname;

-- Check for any remaining anonymous policies that might leak data
SELECT 
    tablename,
    policyname,
    roles
FROM pg_policies 
WHERE schemaname = 'public'
AND 'anon' = ANY(roles)
AND cmd != 'SELECT'  -- Focus on non-SELECT policies that might allow data modification
ORDER BY tablename, policyname;

-- =====================================================
-- INSTRUCTIONS FOR IMPLEMENTATION
-- =====================================================

/*
CRITICAL SECURITY FIX APPLIED:

This fix addresses the data isolation breach by:

1. REMOVING dangerous anonymous policies that allowed unrestricted access
2. IMPLEMENTING kiosk-specific policies that require context
3. ADDING service role policies as a backup approach
4. CREATING helper functions for secure kiosk operations

IMPLEMENTATION OPTIONS:

Option A - Kiosk Context Approach:
- Kiosk applications must call set_kiosk_context(kiosk_id) before operations
- All subsequent operations are scoped to that kiosk's owner
- More secure but requires application changes

Option B - Service Role Approach:
- Use service_role key for kiosk operations instead of anon key
- Implement business logic in your application to ensure proper isolation
- Easier to implement but requires careful application-level security

IMMEDIATE ACTION REQUIRED:
1. Run this SQL script in Supabase immediately
2. Test that new accounts no longer see other accounts' data
3. Update kiosk applications to use one of the secure approaches above
4. Verify all existing data has proper owner_id values

SECURITY VERIFICATION:
- Create a new account and verify it sees NO data from other accounts
- Test kiosk functionality with the new security model
- Monitor for any remaining data leakage
*/
