-- ============================================
-- FIX PUBLIC READ POLICY FOR PRODUCTS
-- Substitui políticas que dependem de current_setting por políticas públicas
-- O filtro team_id é aplicado no cliente via addTeamFilter
-- Similar à correção aplicada para combos
-- ============================================

BEGIN;

-- Remover políticas antigas que dependem de current_setting (não funcionam via REST)
DROP POLICY IF EXISTS "Public view products by team" ON public.products;
DROP POLICY IF EXISTS "General admin view products" ON public.products;

-- Remover e recriar a política pública para garantir que está correta
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;

-- Criar política pública de leitura (SELECT) para products
-- O isolamento por tenant é feito pelo filtro team_id aplicado no cliente
CREATE POLICY "Allow public read access to products"
ON public.products
FOR SELECT
TO public
USING (true);

-- A política "products_select_member_rls" pode permanecer, pois políticas RLS são OR (qualquer uma verdadeira permite acesso)
-- A política pública acima já garante acesso para todos, então não precisamos nos preocupar com as outras

COMMIT;

