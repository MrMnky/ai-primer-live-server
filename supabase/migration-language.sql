-- Add language column to sessions table
-- Default: 'en' (English)
-- Run this migration against your Supabase project

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';
