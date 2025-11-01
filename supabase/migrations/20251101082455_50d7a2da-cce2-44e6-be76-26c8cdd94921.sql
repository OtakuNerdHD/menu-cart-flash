-- Remover todas as políticas SELECT antigas que permitem leitura pública sem filtro
-- Isso vai manter apenas as novas políticas que filtram por team_id

-- PRODUCTS: Remover políticas SELECT que não filtram por team
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "products_select_member_rls" ON public.products;

-- COMBOS: Remover políticas SELECT que não filtram por team  
DROP POLICY IF EXISTS "Allow public read access to combos" ON public.combos;
DROP POLICY IF EXISTS "combos_select" ON public.combos;

-- Verificar se as novas políticas já existem antes de criar
DROP POLICY IF EXISTS "products_select_by_team_context" ON public.products;
DROP POLICY IF EXISTS "combos_select_by_team_context" ON public.combos;

-- Recriar as políticas corretas que filtram por team_id
CREATE POLICY "products_select_by_team_context" ON public.products
FOR SELECT
USING (
  -- Permite se o team_id corresponde ao contexto atual
  (team_id::text = NULLIF(current_setting('app.current_team_id', true), ''))
  OR
  -- Permite para admins gerais
  (current_setting('app.current_user_role', true) = 'general_admin')
);

CREATE POLICY "combos_select_by_team_context" ON public.combos
FOR SELECT
USING (
  -- Permite se o team_id corresponde ao contexto atual
  (team_id::text = NULLIF(current_setting('app.current_team_id', true), ''))
  OR
  -- Permite para admins gerais
  (current_setting('app.current_user_role', true) = 'general_admin')
);