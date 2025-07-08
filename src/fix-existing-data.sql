-- Fix existing data that may not have proper owner_id values
-- This ensures all existing records are properly associated with their owners

-- =====================================================
-- STEP 1: Check current data state
-- =====================================================

-- Check users table for records without owner_id
SELECT 
    'users' as table_name,
    COUNT(*) as total_records,
    COUNT(owner_id) as records_with_owner_id,
    COUNT(*) - COUNT(owner_id) as records_missing_owner_id
FROM users;

-- Check kiosks table for records without owner_id (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        RAISE NOTICE 'Checking kiosks table...';
        PERFORM 1; -- Placeholder for kiosks check
    END IF;
END $$;

-- Check sessions table structure
SELECT 
    'sessions' as table_name,
    COUNT(*) as total_records
FROM sessions;

-- Check active_sessions table structure  
SELECT 
    'active_sessions' as table_name,
    COUNT(*) as total_records
FROM active_sessions;

-- =====================================================
-- STEP 2: Identify orphaned data
-- =====================================================

-- Find users without owner_id
SELECT 
    id,
    name,
    pin,
    created_at,
    'Missing owner_id' as issue
FROM users 
WHERE owner_id IS NULL
ORDER BY created_at;

-- Find kiosks without owner_id (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        RAISE NOTICE 'Checking for kiosks without owner_id...';
        -- This would need to be executed separately if kiosks table exists
    END IF;
END $$;

-- =====================================================
-- STEP 3: Data cleanup options
-- =====================================================

-- OPTION A: If you know which auth user should own the orphaned data
-- Replace 'YOUR_AUTH_USER_ID' with the actual auth.users ID

/*
-- Example: Assign all orphaned users to a specific auth user
UPDATE users 
SET owner_id = 'YOUR_AUTH_USER_ID'  -- Replace with actual auth.users ID
WHERE owner_id IS NULL;

-- Example: Assign all orphaned kiosks to a specific auth user
UPDATE kiosks 
SET owner_id = 'YOUR_AUTH_USER_ID'  -- Replace with actual auth.users ID  
WHERE owner_id IS NULL;
*/

-- OPTION B: Delete orphaned data (DANGEROUS - use with caution)
-- Only use this if you're sure the data is not needed

/*
-- Delete users without owner_id (DANGEROUS)
DELETE FROM users WHERE owner_id IS NULL;

-- Delete kiosks without owner_id (DANGEROUS)  
DELETE FROM kiosks WHERE owner_id IS NULL;
*/

-- =====================================================
-- STEP 4: Verify data integrity after cleanup
-- =====================================================

-- Function to verify all data has proper owner_id values
CREATE OR REPLACE FUNCTION verify_data_integrity()
RETURNS TABLE(
    table_name TEXT,
    total_records BIGINT,
    records_with_owner_id BIGINT,
    records_missing_owner_id BIGINT,
    integrity_status TEXT
) AS $$
BEGIN
    -- Check users table
    RETURN QUERY
    SELECT 
        'users'::TEXT,
        COUNT(*)::BIGINT,
        COUNT(u.owner_id)::BIGINT,
        (COUNT(*) - COUNT(u.owner_id))::BIGINT,
        CASE 
            WHEN COUNT(*) = COUNT(u.owner_id) THEN 'OK'
            ELSE 'NEEDS ATTENTION'
        END::TEXT
    FROM users u;
    
    -- Check kiosks table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'kiosks') THEN
        RETURN QUERY
        EXECUTE 'SELECT 
            ''kiosks''::TEXT,
            COUNT(*)::BIGINT,
            COUNT(owner_id)::BIGINT,
            (COUNT(*) - COUNT(owner_id))::BIGINT,
            CASE 
                WHEN COUNT(*) = COUNT(owner_id) THEN ''OK''
                ELSE ''NEEDS ATTENTION''
            END::TEXT
        FROM kiosks';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Run the verification
SELECT * FROM verify_data_integrity();

-- =====================================================
-- STEP 5: Check for cross-contamination
-- =====================================================

-- Check if there are multiple distinct owner_id values (indicating multiple accounts)
SELECT 
    'Data isolation check' as check_type,
    COUNT(DISTINCT owner_id) as distinct_owners,
    CASE 
        WHEN COUNT(DISTINCT owner_id) <= 1 THEN 'Single tenant - OK'
        WHEN COUNT(DISTINCT owner_id) > 1 THEN 'Multi-tenant - Verify isolation'
    END as status
FROM users
WHERE owner_id IS NOT NULL;

-- Show owner distribution
SELECT 
    owner_id,
    COUNT(*) as user_count,
    MIN(created_at) as first_user_created,
    MAX(created_at) as last_user_created
FROM users 
WHERE owner_id IS NOT NULL
GROUP BY owner_id
ORDER BY user_count DESC;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

/*
DATA CLEANUP INSTRUCTIONS:

1. First, run this script to assess the current state of your data
2. Review the output to understand what data exists and what needs fixing
3. Choose one of the cleanup options:

   OPTION A - Assign ownership:
   - If you have existing data that should belong to a specific account
   - Update the owner_id values to the correct auth.users ID
   - This preserves all existing data

   OPTION B - Delete orphaned data:
   - If you have test/invalid data that can be safely deleted
   - Use the DELETE statements (uncomment them)
   - This removes data that can't be properly assigned

4. After cleanup, run the verification function to ensure data integrity
5. Test that accounts are properly isolated

CRITICAL: 
- Make sure you have backups before running any UPDATE or DELETE statements
- Test the isolation by creating a new account and verifying it sees no other data
- All future data will be properly isolated due to the RLS policies and triggers
*/
