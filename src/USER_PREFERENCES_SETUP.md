# User Preferences Setup Guide

## Issue Description

The color mode settings (and other user preferences) are not saving properly because the `user_preferences` table either doesn't exist or doesn't have proper Row Level Security (RLS) policies configured. This explains why one account works while another doesn't - it depends on whether the table exists and has the correct permissions.

## Root Cause

1. **Missing Table**: The `user_preferences` table may not exist in your Supabase database
2. **Missing RLS Policies**: Even if the table exists, it may not have proper Row Level Security policies
3. **Missing Permissions**: Users may not have the correct permissions to read/write their preferences

## Solution

### Step 1: Run the Database Migration

Execute the SQL script to create the `user_preferences` table and set up proper RLS policies:

1. Open your Supabase Dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `src/create-user-preferences-table.sql`
4. Run the script

### Step 2: Verify the Setup

After running the script, you should see:

1. A new `user_preferences` table with the following columns:
   - `id` (UUID, Primary Key)
   - `user_id` (UUID, Foreign Key to auth.users)
   - `time_format` (VARCHAR, default '12h')
   - `timezone` (VARCHAR, default 'auto')
   - `date_format` (VARCHAR, default 'MM/DD/YYYY')
   - `color_mode` (VARCHAR, default 'system')
   - `created_at` (TIMESTAMP)
   - `updated_at` (TIMESTAMP)

2. RLS enabled on the table
3. A policy that allows users to manage only their own preferences
4. Automatic triggers for updating timestamps and creating default preferences

### Step 3: Test the Fix

1. Log in with both accounts that were having issues
2. Go to Settings
3. Change the color mode and other preferences
4. Refresh the page or log out and back in
5. Verify that settings are preserved

## What the Migration Does

### Table Creation
- Creates the `user_preferences` table with proper constraints
- Sets up foreign key relationship to `auth.users`
- Adds check constraints to ensure valid values

### Security Setup
- Enables Row Level Security (RLS)
- Creates policy: "Users can manage their own preferences"
- Ensures users can only access their own preference data

### Automation
- Auto-creates default preferences for new users
- Auto-updates the `updated_at` timestamp on changes
- Handles conflicts gracefully with `ON CONFLICT DO NOTHING`

### Performance
- Creates index on `user_id` for faster lookups
- Uses UUID primary keys for better performance

## Debugging

If settings still don't save after running the migration, check the browser console for error messages. The updated code includes detailed logging that will show:

- User ID being used for preferences
- Success/failure of database operations
- Specific error messages if operations fail

Look for console messages like:
- "Saving preferences for user: [user-id]"
- "Update result:" or "Insert result:"
- Any error messages about permissions or database issues

## Features Included

### Color Mode Options
- **Light Mode**: Always use light theme
- **Dark Mode**: Always use dark theme
- **System Default**: Follow OS/browser preference (NEW!)

### System Preference Detection
- Automatically detects if user's OS is in dark or light mode
- Updates theme in real-time when system preference changes
- Shows current detected mode in settings when "System Default" is selected

### Persistence
- All settings now save to the database
- Settings persist across sessions and devices
- Each user has their own isolated preferences

## Technical Details

### Database Schema
```sql
CREATE TABLE user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    time_format VARCHAR(10) DEFAULT '12h',
    timezone VARCHAR(50) DEFAULT 'auto',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    color_mode VARCHAR(10) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);
```

### RLS Policy
```sql
CREATE POLICY "Users can manage their own preferences" ON user_preferences
FOR ALL 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

This ensures complete data isolation - each user can only access their own preferences.
