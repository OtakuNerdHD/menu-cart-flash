-- ============================================
-- FINAL SECURITY FIXES - REMAINING ITEMS
-- ============================================

-- Only drop and recreate policies that don't already exist or need fixing

-- Fix profiles policies (drop if exists and recreate)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile (non-critical fields)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- Recreate secure profiles policies
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile (non-critical fields)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id 
  AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevent role changes
  AND is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) -- Prevent admin escalation
);

CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create INSERT policy for profiles (new users can create their own profile)
CREATE POLICY "Users can create own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- All fixes completed successfully