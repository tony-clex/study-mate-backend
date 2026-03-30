
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'study-files',
  'study-files',
  true,
  10485760, -- 10MB in bytes
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'study-files'
);

CREATE POLICY "Allow users to view their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'study-files'
);

CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'study-files'
);

CREATE POLICY "Allow public read access to files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'study-files');
