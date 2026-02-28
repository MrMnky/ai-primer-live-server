-- ============================================
-- AI Primer Live — Supabase Migration
-- Run this in the Supabase SQL Editor
-- ============================================

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'AI Primer',
  presenter_name TEXT DEFAULT 'Presenter',
  slide_count INTEGER DEFAULT 0,
  current_slide INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'started', 'paused', 'ended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- Interactions table (full event log)
CREATE TABLE IF NOT EXISTS interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT NOT NULL REFERENCES sessions(code) ON DELETE CASCADE,
  participant_id TEXT,
  participant_name TEXT DEFAULT 'Anonymous',
  slide_index INTEGER,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_code);
CREATE INDEX IF NOT EXISTS idx_interactions_session_slide ON interactions(session_code, slide_index);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(event_type);
CREATE INDEX IF NOT EXISTS idx_interactions_session_type ON interactions(session_code, event_type);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_code ON sessions(code);

-- Enable RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

-- Policies: server uses service_role key (bypasses RLS)
-- These allow read-only access via anon key (for future client-side queries if needed)
CREATE POLICY "Allow public read on sessions" ON sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read on interactions" ON interactions FOR SELECT USING (true);
