
-- Create documents table for storing uploaded document metadata
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can only insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can only delete their own documents" ON public.documents;

CREATE POLICY "Users can only view their own documents" 
ON public.documents FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own documents" 
ON public.documents FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own documents" 
ON public.documents FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- Document Chunks Table Schema (for Vector Search)
-- ============================================

-- Enable the pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create document_chunks table for storing text chunks with embeddings
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    embedding vector(3072), -- Current Gemini embedding output dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already existed with an older vector dimension, align it here.
DROP INDEX IF EXISTS idx_document_chunks_embedding;

ALTER TABLE public.document_chunks
ALTER COLUMN embedding TYPE vector(3072);

-- Create index for faster queries on document_id
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Create index for faster queries on user_id
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);

-- HNSW is disabled here because pgvector HNSW indexes do not support
-- vectors above 2000 dimensions, and Gemini currently returns 3072.
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON public.document_chunks
-- USING hnsw (embedding vector_cosine_ops);

-- Enable Row Level Security (RLS)
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can only view their own document chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can only insert their own document chunks" ON public.document_chunks;
DROP POLICY IF EXISTS "Users can only delete their own document chunks" ON public.document_chunks;

CREATE POLICY "Users can only view their own document chunks" 
ON public.document_chunks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own document chunks" 
ON public.document_chunks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own document chunks" 
ON public.document_chunks FOR DELETE 
USING (auth.uid() = user_id);

-- ============================================
-- RPC Function for Vector Similarity Search
-- ============================================

-- Drop existing function if it exists (to handle schema changes)
DROP FUNCTION IF EXISTS match_document_chunks(vector(3072), float, int);
DROP FUNCTION IF EXISTS match_document_chunks_for_user(vector(3072), uuid, uuid, float, int);
DROP FUNCTION IF EXISTS match_document_chunks(vector(768), float, int);
DROP FUNCTION IF EXISTS match_document_chunks_for_user(vector(768), uuid, uuid, float, int);

CREATE OR REPLACE FUNCTION match_document_chunks(
    query_embedding vector(3072),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    user_id UUID,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.user_id,
        dc.content,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION match_document_chunks_for_user(
    query_embedding vector(3072),
    requesting_user_id uuid,
    filter_document_id uuid DEFAULT NULL,
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    user_id UUID,
    content TEXT,
    metadata JSONB,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.user_id,
        dc.content,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE dc.user_id = requesting_user_id
      AND (filter_document_id IS NULL OR dc.document_id = filter_document_id)
      AND 1 - (dc.embedding <=> query_embedding) > match_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
