-- Ajustes isolados de roles para RLS v2 (sem tocar policies ou outras funções)
-- - ensure_membership(team_slug): fallback passa a criar role='cliente'
-- - app.is_tenant_admin(team_id): considera somente role='dono' como admin no banco

BEGIN;

-- Garante existência do schema app para a função app.is_tenant_admin
CREATE SCHEMA IF NOT EXISTS app;

-- Atualiza ensure_membership: altera apenas o papel inserido na ausência de membership
CREATE OR REPLACE FUNCTION public.ensure_membership(team_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_team_id uuid;
begin
  select id into v_team_id from public.teams where slug = team_slug limit 1;
  if v_team_id is null then
    return null;
  end if;

  -- Upsert membership como 'cliente' por padrão
  insert into public.team_members(team_id, user_id, role)
  values (v_team_id, auth.uid(), 'cliente')
  on conflict (team_id, user_id) do nothing;

  return v_team_id;
end;
$function$;

-- Atualiza app.is_tenant_admin: apenas 'dono' é admin para RLS
CREATE OR REPLACE FUNCTION app.is_tenant_admin(team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT (tm.role = 'dono')
    FROM public.team_members tm
    WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
    LIMIT 1
  ), false);
$$;

COMMIT;