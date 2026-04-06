-- ============================================
-- StudyMate - Collaboration & Progress Features
-- ============================================

-- ============================================
-- Session Collaborators Table
-- Allows users to share study sessions with others
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_collaborators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.study_sessions(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL,
    collaborator_id UUID NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('viewer', 'editor', 'admin')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(session_id, collaborator_id)
);

CREATE INDEX IF NOT EXISTS idx_session_collaborators_session_id ON public.session_collaborators(session_id);
CREATE INDEX IF NOT EXISTS idx_session_collaborators_collaborator_id ON public.session_collaborators(collaborator_id);

ALTER TABLE public.session_collaborators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaborators for sessions they own or are collaborators on"
ON public.session_collaborators FOR SELECT
USING (
    auth.uid() = owner_id OR 
    auth.uid() = collaborator_id
);

CREATE POLICY "Users can insert collaborators for sessions they own"
ON public.session_collaborators FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own collaboration status"
ON public.session_collaborators FOR UPDATE
USING (auth.uid() = collaborator_id);

CREATE POLICY "Users can delete collaborators for sessions they own"
ON public.session_collaborators FOR DELETE
USING (auth.uid() = owner_id);

-- ============================================
-- Spaced Repetition Cards Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.spaced_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID REFERENCES public.study_sessions(id) ON DELETE SET NULL,
    note_id UUID REFERENCES public.session_notes(id) ON DELETE SET NULL,
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    ease_factor NUMERIC(5,2) DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    next_review_date TIMESTAMPTZ DEFAULT NOW(),
    last_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spaced_cards_user_id ON public.spaced_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_spaced_cards_next_review ON public.spaced_cards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_spaced_cards_session_id ON public.spaced_cards(session_id);

ALTER TABLE public.spaced_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own cards"
ON public.spaced_cards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own cards"
ON public.spaced_cards FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own cards"
ON public.spaced_cards FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own cards"
ON public.spaced_cards FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- Study Progress Table
-- Tracks user study statistics and progress
-- ============================================
CREATE TABLE IF NOT EXISTS public.study_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    study_sessions_count INTEGER DEFAULT 0,
    total_study_time_minutes INTEGER DEFAULT 0,
    notes_created INTEGER DEFAULT 0,
    files_uploaded INTEGER DEFAULT 0,
    cards_reviewed INTEGER DEFAULT 0,
    cards_learned INTEGER DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_study_progress_user_id ON public.study_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_study_progress_date ON public.study_progress(date DESC);

ALTER TABLE public.study_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own progress"
ON public.study_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own progress"
ON public.study_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own progress"
ON public.study_progress FOR UPDATE
USING (auth.uid() = user_id);

-- ============================================
-- Study Sessions with Collaborators View
-- ============================================
CREATE OR REPLACE VIEW public.sessions_with_collaborators AS
SELECT 
    s.id,
    s.title,
    s.subject,
    s.created_at,
    s.user_id as owner_id,
    COALESCE(
        json_agg(
            json_build_object(
                'id', c.id,
                'collaborator_id', c.collaborator_id,
                'role', c.role,
                'status', c.status
            )
        ) FILTER (WHERE c.id IS NOT NULL),
        '[]'::json
    ) as collaborators
FROM study_sessions s
LEFT JOIN session_collaborators c ON s.id = c.session_id AND c.status = 'accepted'
WHERE s.user_id = auth.uid() OR c.collaborator_id = auth.uid()
GROUP BY s.id, s.title, s.subject, s.created_at, s.user_id;