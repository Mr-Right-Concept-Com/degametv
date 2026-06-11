
-- Helper: is the user an approved filmmaker (creator role)?
CREATE OR REPLACE FUNCTION public.is_filmmaker(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'creator'
  )
$$;

-- Allow admins to update KYC fields on any profile (approve/reject applications)
DROP POLICY IF EXISTS "Admins can review filmmaker applications" ON public.profiles;
CREATE POLICY "Admins can review filmmaker applications"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'platform_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'platform_admin'));

-- Allow admins to read all profiles (needed for the application review queue)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'platform_admin'));

-- Allow admins to grant the creator role to applicants
DROP POLICY IF EXISTS "Admins can grant creator role" ON public.user_roles;
CREATE POLICY "Admins can grant creator role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'platform_admin'));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'platform_admin')
);
