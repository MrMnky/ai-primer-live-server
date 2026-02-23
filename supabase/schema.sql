-- ============================================
-- AI Primer Live — Supabase Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'participant' CHECK (role IN ('admin', 'presenter', 'participant')),
  organisation TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'participant')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Presentation sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  title TEXT DEFAULT 'AI Primer',
  presenter_id UUID REFERENCES public.profiles(id),
  presenter_name TEXT,
  slide_count INTEGER DEFAULT 0,
  current_slide INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'ended', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

CREATE INDEX idx_sessions_code ON public.sessions(code);
CREATE INDEX idx_sessions_presenter ON public.sessions(presenter_id);

-- 3. Session participants (tracks who joined which session)
CREATE TABLE public.session_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  display_name TEXT NOT NULL DEFAULT 'Anonymous',
  joined_at TIMESTAMPTZ DEFAULT now(),
  left_at TIMESTAMPTZ
);

CREATE INDEX idx_participants_session ON public.session_participants(session_id);
CREATE INDEX idx_participants_user ON public.session_participants(user_id);

-- 4. Responses (quiz answers, poll votes, text inputs)
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES public.session_participants(id),
  user_id UUID REFERENCES public.profiles(id),
  slide_index INTEGER NOT NULL,
  response_type TEXT NOT NULL CHECK (response_type IN ('quiz', 'poll', 'text')),
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_responses_session_slide ON public.responses(session_id, slide_index);
CREATE INDEX idx_responses_user ON public.responses(user_id);

-- 5. Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read their own, admins/presenters can read all
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Presenters can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'presenter')
    )
  );

-- Sessions: presenters can create, everyone can read active sessions
CREATE POLICY "Presenters can create sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'presenter')
    )
  );

CREATE POLICY "Anyone authenticated can view active sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Presenters can update their sessions"
  ON public.sessions FOR UPDATE
  USING (presenter_id = auth.uid());

-- Participants: anyone can join a session
CREATE POLICY "Anyone can join a session"
  ON public.session_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view session participants"
  ON public.session_participants FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own participation"
  ON public.session_participants FOR UPDATE
  USING (user_id = auth.uid());

-- Responses: anyone can submit, presenters can read all for their sessions
CREATE POLICY "Anyone can submit responses"
  ON public.responses FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own responses"
  ON public.responses FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Presenters can view responses for their sessions"
  ON public.responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = responses.session_id
      AND sessions.presenter_id = auth.uid()
    )
  );
