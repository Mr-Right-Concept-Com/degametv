INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES('creator-masters','creator-masters',false,2147483648,ARRAY['video/mp4','video/quicktime','video/webm','video/x-matroska','video/mpeg'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=2147483648,allowed_mime_types=EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Creator uploads own master media" ON storage.objects;
CREATE POLICY "Creator uploads own master media" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id='creator-masters' AND (storage.foldername(name))[1]=auth.uid()::text);

DROP POLICY IF EXISTS "Creator reads own master media" ON storage.objects;
CREATE POLICY "Creator reads own master media" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id='creator-masters' AND (storage.foldername(name))[1]=auth.uid()::text);

DROP POLICY IF EXISTS "Creator updates own master media" ON storage.objects;
CREATE POLICY "Creator updates own master media" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id='creator-masters' AND (storage.foldername(name))[1]=auth.uid()::text)
WITH CHECK (bucket_id='creator-masters' AND (storage.foldername(name))[1]=auth.uid()::text);

DROP POLICY IF EXISTS "Creator deletes own master media" ON storage.objects;
CREATE POLICY "Creator deletes own master media" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id='creator-masters' AND (storage.foldername(name))[1]=auth.uid()::text);