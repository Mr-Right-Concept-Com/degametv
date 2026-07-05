GRANT SELECT ON public.content TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content TO authenticated;
GRANT ALL ON public.content TO service_role;

DROP POLICY IF EXISTS "Creators can insert their content" ON public.content;
CREATE POLICY "Creators can insert their content" ON public.content
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);