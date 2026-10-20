-- ============================================
-- StudyMate - Fix live study_sessions schema
-- Run this in the Supabase SQL editor if the
-- deployed table is missing newer columns.
-- ============================================

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS scheduled_start_at TIMESTAMPTZ;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS planned_duration_minutes INTEGER;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS status TEXT;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS last_checkpoint JSONB;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS last_checkpoint_at TIMESTAMPTZ;

ALTER TABLE public.study_sessions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE public.study_sessions
SET status = COALESCE(status, 'draft')
WHERE status IS NULL;

UPDATE public.study_sessions
SET updated_at = COALESCE(updated_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.study_sessions
ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.study_sessions
ALTER COLUMN status SET NOT NULL;

ALTER TABLE public.study_sessions
ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE public.study_sessions
ALTER COLUMN updated_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id
ON public.study_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_study_sessions_created_at
ON public.study_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_study_sessions_status
ON public.study_sessions(status);

CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled_start_at
ON public.study_sessions(scheduled_start_at DESC);

