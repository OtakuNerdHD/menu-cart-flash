-- ============================================
-- FIX PRODUCTS POLICY - EXECUTE AGORA
-- Remove políticas que dependem de current_setting
-- Garante que apenas a política pública permaneça
-- ============================================

BEGIN;

-- Remover políticas antigas que dependem de current_setting (não funcionam via REST)
DROP POLICY IF EXISTS "Public view products by team" ON public.products;
DROP POLICY IF EXISTS "General admin view products" ON public.products;

-- A política "Allow public read access to products" já existe e está correta
-- Não precisamos recriá-la, apenas garantir que as políticas antigas foram removidas

COMMIT;

