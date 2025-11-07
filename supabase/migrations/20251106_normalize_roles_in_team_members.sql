-- Migration: Normalize roles in public.team_members
-- Objetivo: converter roles antigos para valores definitivos e auditar resultado
-- Não altera policies, ensure_membership, app.is_tenant_admin, nem ativa rls_v2.

BEGIN;

-- Normalização de roles antigos:
-- owner    -> dono
-- member   -> cliente
-- customer -> cliente
-- admin    -> admin (mantém, também padroniza variações de caso/espaço)
UPDATE public.team_members
SET role = CASE
  WHEN LOWER(TRIM(role)) = 'owner' THEN 'dono'
  WHEN LOWER(TRIM(role)) = 'member' THEN 'cliente'
  WHEN LOWER(TRIM(role)) = 'customer' THEN 'cliente'
  WHEN LOWER(TRIM(role)) = 'admin' THEN 'admin'
  ELSE role
END
WHERE LOWER(TRIM(role)) IN ('owner','member','customer','admin');

-- Auditoria: listar roles distintas após normalização
-- Lista final de valores definitivos aceitos:
--   'dono','admin','cozinha','garcom','entregador','cliente'
SELECT LOWER(TRIM(role)) AS role_normalized, COUNT(*) AS count
FROM public.team_members
GROUP BY 1
ORDER BY count DESC, role_normalized ASC;

-- Divergências: qualquer valor fora dos 6 definitivos (apenas log; não altera)
SELECT LOWER(TRIM(role)) AS role_divergent, COUNT(*) AS count
FROM public.team_members
WHERE LOWER(TRIM(role)) NOT IN ('dono','admin','cozinha','garcom','entregador','cliente')
GROUP BY 1
ORDER BY count DESC, role_divergent ASC;

COMMIT;