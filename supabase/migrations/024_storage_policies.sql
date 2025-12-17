-- Storage policies for processed-images bucket
-- This allows authenticated users to upload/view/delete their own images

-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('processed-images', 'processed-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folders
-- Paths: studio-temp/{user_id}/* and {org_id}/*
CREATE POLICY "Users can upload to studio-temp" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'processed-images' AND
    auth.uid() IS NOT NULL AND
    (
      -- Allow uploads to studio-temp/{user_id}/*
      (storage.foldername(name))[1] = 'studio-temp' AND
      (storage.foldername(name))[2] = auth.uid()::text
    )
  );

-- Allow authenticated users to view processed images (public bucket anyway)
CREATE POLICY "Anyone can view processed images" ON storage.objects
  FOR SELECT USING (bucket_id = 'processed-images');

-- Allow users to delete their own studio-temp files
CREATE POLICY "Users can delete own studio-temp files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'processed-images' AND
    (storage.foldername(name))[1] = 'studio-temp' AND
    (storage.foldername(name))[2] = auth.uid()::text
  );

-- Allow service role to manage all files (for edge functions)
CREATE POLICY "Service role can manage all processed images" ON storage.objects
  FOR ALL USING (
    bucket_id = 'processed-images' AND
    auth.jwt() ->> 'role' = 'service_role'
  );
