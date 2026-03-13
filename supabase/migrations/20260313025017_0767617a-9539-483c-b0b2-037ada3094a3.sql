-- Allow authenticated users to SELECT their own filmmaker submissions by email
CREATE POLICY "Users can view their own submissions"
ON public.filmmaker_submissions
FOR SELECT
TO authenticated
USING (submitter_email = (auth.jwt() ->> 'email'));