



-- Keep the RPC signature aligned with the definition in documents.sql.
-- This is a global search RPC: it does not filter by requesting_user_id.
-- Recreate it here as well so either schema script can safely be applied.
DROP FUNCTION IF EXISTS public.match_document_chunks_for_user(vector(3072), uuid, uuid, double precision, integer);
DROP FUNCTION IF EXISTS public.match_document_chunks_for_user(vector(768), uuid, uuid, double precision, integer);

CREATE OR REPLACE FUNCTION public.match_document_chunks_for_user(
  query_embedding vector(3072),
  requesting_user_id uuid,
  filter_document_id uuid DEFAULT NULL,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  user_id uuid,
  uploader_name text,
  content text,
  metadata jsonb,
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
    p.full_name AS uploader_name,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  INNER JOIN public.documents d ON d.id = dc.document_id
  INNER JOIN public.profiles p ON p.id = d.user_id
  WHERE
    (filter_document_id IS NULL OR dc.document_id = filter_document_id)
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Step 3: Refresh schema cache
NOTIFY pgrst, 'reload schema';
