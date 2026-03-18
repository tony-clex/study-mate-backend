-- ============================================
-- StudyMate - Study Sessions Table Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create study_sessions table
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);

-- Create index for ordering by created_at
CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own sessions
CREATE POLICY "Users can only view their own sessions" 
ON study_sessions FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policy: users can only insert their own sessions
CREATE POLICY "Users can only insert their own sessions" 
ON study_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: users can only delete their own sessions
CREATE POLICY "Users can only delete their own sessions" 
ON study_sessions FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policy: users can only update their own sessions
CREATE POLICY "Users can only update their own sessions" 
ON study_sessions FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- Session Notes Table Schema
-- ============================================

-- Create session_notes table for storing notes/files for each session
CREATE TABLE IF NOT EXISTS session_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES study_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_url TEXT,
    file_name VARCHAR(255),
    file_type VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries on session_id
CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes(session_id);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON session_notes(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: users can only see their own notes
CREATE POLICY "Users can only view their own notes" 
ON session_notes FOR SELECT 
USING (auth.uid() = user_id);

-- Create RLS policy: users can only insert their own notes
CREATE POLICY "Users can only insert their own notes" 
ON session_notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create RLS policy: users can only delete their own notes
CREATE POLICY "Users can only delete their own notes" 
ON session_notes FOR DELETE 
USING (auth.uid() = user_id);

-- Create RLS policy: users can only update their own notes
CREATE POLICY "Users can only update their own notes" 
ON session_notes FOR UPDATE 
USING (auth.uid() = user_id);

-- ============================================
-- Example SQL to run in Supabase SQL Editor
-- ============================================

/*
-- Verify table creation
SELECT * FROM study_sessions LIMIT 0;
SELECT * FROM session_notes LIMIT 0;

-- Test insert session
INSERT INTO study_sessions (user_id, title) 
VALUES ('your-user-uuid', 'Biology Revision');

-- Test insert note
INSERT INTO session_notes (session_id, user_id, title, content) 
VALUES ('session-uuid', 'your-user-uuid', 'Chapter 1 Notes', 'Important concepts...');

-- Test select
SELECT * FROM study_sessions WHERE user_id = 'your-user-uuid';
SELECT * FROM session_notes WHERE session_id = 'session-uuid';

-- Test delete
DELETE FROM study_sessions WHERE id = 'session-uuid';
DELETE FROM session_notes WHERE id = 'note-uuid';
*/
