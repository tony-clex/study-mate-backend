-- ============================================
-- StudyMate - Study Sessions Table Schema
-- ============================================

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS public.study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    subject TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON public.study_sessions(user_id);

-- Create index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON public.study_sessions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own sessions" 
ON public.study_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own sessions" 
ON public.study_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own sessions" 
ON public.study_sessions FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own sessions" 
ON public.study_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- Session Notes Table Schema
-- ============================================

-- Create session_notes table for storing notes/files for each session
CREATE TABLE IF NOT EXISTS public.session_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    file_url TEXT,
    file_name TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries on session_id
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON public.session_notes(session_id);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON public.session_notes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own notes" 
ON public.session_notes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own notes" 
ON public.session_notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own notes" 
ON public.session_notes FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own notes" 
ON public.session_notes FOR UPDATE 
USING (auth.uid() = user_id);

-- Session Files table for storing uploaded files linked to sessions
CREATE TABLE IF NOT EXISTS session_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_files_session_id ON session_files(session_id);

CREATE INDEX IF NOT EXISTS idx_session_files_user_id ON session_files(user_id);

ALTER TABLE session_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own files" 
ON session_files FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own files" 
ON session_files FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own files" 
ON session_files FOR DELETE 
USING (auth.uid() = user_id);
