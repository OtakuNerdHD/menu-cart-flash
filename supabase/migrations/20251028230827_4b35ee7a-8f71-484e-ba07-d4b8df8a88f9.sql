-- ============================================
-- ENABLE RLS ON REMAINING PUBLIC TABLES
-- ============================================

-- Enable RLS on backups (system table)
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can access backups" 
ON public.backups 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Enable RLS on produtos (public catalog)
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view produtos" 
ON public.produtos 
FOR SELECT 
USING (true);

-- Enable RLS on store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view store settings" 
ON public.store_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage store settings" 
ON public.store_settings 
FOR ALL 
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Enable RLS on user_switcher_sessions
ALTER TABLE public.user_switcher_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage sessions" 
ON public.user_switcher_sessions 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- spatial_ref_sys is a PostGIS system table, keep it without RLS as it's read-only reference data

-- All critical security issues have been fixed!