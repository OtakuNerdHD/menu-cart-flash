-- ============================================
-- PUBLIC READ BY TENANT FOR CATALOG TABLES
-- Permite leitura pública para visitantes, isolada por tenant
-- Usa app.current_team_id configurado via set_app_config
-- ============================================

BEGIN;

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view products by team" ON public.products;
DROP POLICY IF EXISTS "General admin view products" ON public.products;
CREATE POLICY "Public view products by team"
ON public.products
FOR SELECT
USING (
  current_setting('app.current_team_id', true) IS NOT NULL
  AND team_id::text = current_setting('app.current_team_id', true)
);
CREATE POLICY "General admin view products"
ON public.products
FOR SELECT
USING (
  current_setting('app.current_user_role', true) = 'general_admin'
);

-- Combos
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view combos by team" ON public.combos;
DROP POLICY IF EXISTS "General admin view combos" ON public.combos;
CREATE POLICY "Public view combos by team"
ON public.combos
FOR SELECT
USING (
  current_setting('app.current_team_id', true) IS NOT NULL
  AND team_id::text = current_setting('app.current_team_id', true)
);
CREATE POLICY "General admin view combos"
ON public.combos
FOR SELECT
USING (
  current_setting('app.current_user_role', true) = 'general_admin'
);

-- Categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view categories by team" ON public.categories;
DROP POLICY IF EXISTS "General admin view categories" ON public.categories;
CREATE POLICY "Public view categories by team"
ON public.categories
FOR SELECT
USING (
  current_setting('app.current_team_id', true) IS NOT NULL
  AND team_id::text = current_setting('app.current_team_id', true)
);
CREATE POLICY "General admin view categories"
ON public.categories
FOR SELECT
USING (
  current_setting('app.current_user_role', true) = 'general_admin'
);

-- Product categories link table
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view product_categories by team" ON public.product_categories;
DROP POLICY IF EXISTS "General admin view product_categories" ON public.product_categories;
CREATE POLICY "Public view product_categories by team"
ON public.product_categories
FOR SELECT
USING (
  current_setting('app.current_team_id', true) IS NOT NULL
  AND team_id::text = current_setting('app.current_team_id', true)
);
CREATE POLICY "General admin view product_categories"
ON public.product_categories
FOR SELECT
USING (
  current_setting('app.current_user_role', true) = 'general_admin'
);

-- Combo categories link table
ALTER TABLE public.combo_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view combo_categories by team" ON public.combo_categories;
DROP POLICY IF EXISTS "General admin view combo_categories" ON public.combo_categories;
CREATE POLICY "Public view combo_categories by team"
ON public.combo_categories
FOR SELECT
USING (
  current_setting('app.current_team_id', true) IS NOT NULL
  AND team_id::text = current_setting('app.current_team_id', true)
);
CREATE POLICY "General admin view combo_categories"
ON public.combo_categories
FOR SELECT
USING (
  current_setting('app.current_user_role', true) = 'general_admin'
);

COMMIT;