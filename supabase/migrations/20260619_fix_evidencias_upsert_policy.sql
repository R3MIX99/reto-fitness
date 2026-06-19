-- Allow upsert (UPDATE) on evidencias bucket so re-uploading same path works
CREATE POLICY "actualizar mis evidencias" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'evidencias' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
