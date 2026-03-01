-- Migration: Add custom_courses table + custom_course_id to sessions
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Create custom_courses table
CREATE TABLE IF NOT EXISTS custom_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  presenter_id UUID NOT NULL,
  slides JSONB NOT NULL DEFAULT '[]'::jsonb,
  sections JSONB DEFAULT '[]'::jsonb,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add custom_course_id column to sessions (nullable — existing sessions don't have one)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS custom_course_id UUID REFERENCES custom_courses(id) ON DELETE SET NULL;

-- 3. Enable RLS on custom_courses
ALTER TABLE custom_courses ENABLE ROW LEVEL SECURITY;

-- 4. RLS policies — allow authenticated users to manage their own courses
CREATE POLICY "Users can view own courses" ON custom_courses
  FOR SELECT USING (auth.uid() = presenter_id);

CREATE POLICY "Users can insert own courses" ON custom_courses
  FOR INSERT WITH CHECK (auth.uid() = presenter_id);

CREATE POLICY "Users can update own courses" ON custom_courses
  FOR UPDATE USING (auth.uid() = presenter_id);

CREATE POLICY "Users can delete own courses" ON custom_courses
  FOR DELETE USING (auth.uid() = presenter_id);

-- 5. Also allow service role full access (for server-side API)
CREATE POLICY "Service role full access" ON custom_courses
  FOR ALL USING (true);

-- 6. Index for fast lookup by presenter
CREATE INDEX IF NOT EXISTS idx_custom_courses_presenter ON custom_courses(presenter_id);

-- 7. Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_courses_updated_at
  BEFORE UPDATE ON custom_courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
