
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at ON study_sessions(created_at DESC);

ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own sessions" 
ON study_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own sessions" 
ON study_sessions FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own sessions" 
ON study_sessions FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own sessions" 
ON study_sessions FOR UPDATE 
USING (auth.uid() = user_id);

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

CREATE INDEX IF NOT EXISTS idx_session_notes_session_id ON session_notes(session_id);

CREATE INDEX IF NOT EXISTS idx_session_notes_user_id ON session_notes(user_id);

ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own notes" 
ON session_notes FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own notes" 
ON session_notes FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own notes" 
ON session_notes FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only update their own notes" 
ON session_notes FOR UPDATE 
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
