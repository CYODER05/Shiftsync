-- Add color_mode column to user_preferences table
-- This migration adds support for storing user color mode preferences

-- Add the color_mode column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS color_mode VARCHAR(10) DEFAULT 'system';

-- Add a check constraint to ensure only valid values are stored
ALTER TABLE user_preferences 
ADD CONSTRAINT check_color_mode 
CHECK (color_mode IN ('light', 'dark', 'system'));

-- Update existing records to have 'system' as default if they don't have a color_mode set
UPDATE user_preferences 
SET color_mode = 'system' 
WHERE color_mode IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN user_preferences.color_mode IS 'User color mode preference: light, dark, or system (follows OS preference)';
