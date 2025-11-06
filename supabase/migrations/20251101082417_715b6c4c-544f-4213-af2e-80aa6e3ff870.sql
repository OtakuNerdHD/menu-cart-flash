-- Corrigir políticas RLS para products e combos
-- Remover políticas públicas que permitem ver tudo sem filtro

-- PRODUCTS: Remover política pública sem filtro
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;

-- COMBOS: Remover política pública sem filtro  
DROP POLICY IF EXISTS "Allow public read access to combos" ON public.combos;

-- PRODUCTS: Adicionar política SELECT que filtra por team_id usando app.current_team_id
CREATE POLICY "products_select_by_team_context" ON public.products
FOR SELECT
USING (
  -- Permite se o team_id corresponde ao contexto atual
  (team_id::text = NULLIF(current_setting('app.current_team_id', true), ''))
  OR
  -- Permite para admins gerais
  (current_setting('app.current_user_role', true) = 'general_admin')
);

-- COMBOS: Adicionar política SELECT que filtra por team_id usando app.current_team_id
CREATE POLICY "combos_select_by_team_context" ON public.combos
FOR SELECT
USING (
  -- Permite se o team_id corresponde ao contexto atual
  (team_id::text = NULLIF(current_setting('app.current_team_id', true), ''))
  OR
  -- Permite para admins gerais
  (current_setting('app.current_user_role', true) = 'general_admin')
);

-- TEAMS: Garantir que visitantes possam ler a tabela teams para resolver slug -> team_id
-- Verificar se já existe uma política de leitura pública
DROP POLICY IF EXISTS "teams_public_read" ON public.teams;

CREATE POLICY "teams_public_read" ON public.teams
FOR SELECT
USING (true);

-- RESTAURANTS: Permitir leitura pública para visitantes resolverem restaurant_id
DROP POLICY IF EXISTS "restaurants_public_read" ON public.restaurants;

CREATE POLICY "restaurants_public_read" ON public.restaurants  
FOR SELECT
USING (true);