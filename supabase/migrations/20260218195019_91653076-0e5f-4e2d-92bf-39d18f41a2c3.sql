
-- Create storage bucket for filmmaker content uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'content-uploads',
  'content-uploads', 
  true,
  524288000, -- 500MB limit
  ARRAY['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- RLS for content-uploads bucket
CREATE POLICY "Authenticated users can upload content"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-uploads');

CREATE POLICY "Anyone can view uploaded content"
ON storage.objects FOR SELECT
USING (bucket_id = 'content-uploads');

CREATE POLICY "Creators can delete their uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'content-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Seed the default email provider settings into platform_settings
-- Admin can update this row to swap test/live Resend API key without rebuilding
INSERT INTO public.platform_settings (setting_key, setting_value, description, is_public)
VALUES (
  'email_provider',
  '{
    "provider": "resend",
    "mode": "test",
    "test_api_key": "re_test_placeholder",
    "live_api_key": "",
    "from_name": "DeGameTV",
    "from_email": "noreply@degametv.com",
    "reply_to": "support@degametv.com"
  }'::jsonb,
  'Email provider configuration. Switch mode to live and add live_api_key to enable real email delivery.',
  false
) ON CONFLICT (setting_key) DO NOTHING;

-- filmmaker_submissions table for tracking upload requests
CREATE TABLE IF NOT EXISTS public.filmmaker_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.tenants(id),
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  company_name TEXT,
  project_title TEXT NOT NULL,
  project_type TEXT NOT NULL DEFAULT 'movie',
  description TEXT,
  genres TEXT[],
  duration_minutes INTEGER,
  release_year INTEGER,
  poster_url TEXT,
  trailer_url TEXT,
  screener_url TEXT,
  video_url TEXT,
  budget_range TEXT,
  distribution_rights TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  content_id UUID REFERENCES public.content(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.filmmaker_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit (public portal)
CREATE POLICY "Anyone can submit filmmaker applications"
ON public.filmmaker_submissions
FOR INSERT
WITH CHECK (submitter_email IS NOT NULL AND project_title IS NOT NULL);

-- Super admins can manage all submissions
CREATE POLICY "Super admins can manage filmmaker submissions"
ON public.filmmaker_submissions
FOR ALL
USING (is_super_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_filmmaker_submissions_updated_at
BEFORE UPDATE ON public.filmmaker_submissions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
