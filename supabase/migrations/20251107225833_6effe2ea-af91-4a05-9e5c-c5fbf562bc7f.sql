-- Single session por tenant: criar/garantir estrutura no schema app e expor wrappers public.* para RPC
-- IMPORTANTE: Não altera RLS existente fora da nova tabela app.sessions

BEGIN;

-- Extensão necessária para gen_random_uuid
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Schema lógico da aplicação (não exposto diretamente ao PostgREST)
CREATE SCHEMA IF NOT EXISTS app;

-- Tabela de sessões por tenant/escopo
CREATE TABLE IF NOT EXISTS app.sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL,
  team_id_text    text,                              -- NULL = domínio master
  role_at_login   text NOT NULL,                     -- snapshot do papel no momento do login (informativo)
  user_agent      text,
  ip              inet,
  fingerprint     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at      timestamptz NULL
);

-- Índice: garante 1 ativa por (user, escopo). Usa coalesce para normalizar NULL (master) em ''
CREATE UNIQUE INDEX IF NOT EXISTS sessions_one_active_per_user_tenant
  ON app.sessions (user_id, COALESCE(team_id_text, ''))
  WHERE revoked_at IS NULL;

-- RLS
ALTER TABLE app.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_select_own ON app.sessions;
CREATE POLICY sessions_select_own
  ON app.sessions
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_insert_own ON app.sessions;
CREATE POLICY sessions_insert_own
  ON app.sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_update_own ON app.sessions;
CREATE POLICY sessions_update_own
  ON app.sessions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS sessions_delete_own ON app.sessions;
CREATE POLICY sessions_delete_own
  ON app.sessions
  FOR DELETE
  USING (user_id = auth.uid());

-- (Opcional) acesso completo somente para service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON app.sessions TO service_role;

-- Funções internas no schema app
-- Nota: depende de app.current_team_id() já existir no projeto (mantemos a dependência conforme contexto)

CREATE OR REPLACE FUNCTION app.start_session(
  p_role_at_login text,
  p_fingerprint   text DEFAULT NULL,
  p_user_agent    text DEFAULT NULL,
  p_ip            inet DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team text := app.current_team_id();  -- NULL no master
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Revoga sessão ativa anterior do mesmo user + escopo
  UPDATE app.sessions
     SET revoked_at = now()
   WHERE user_id = v_uid
     AND COALESCE(team_id_text,'') = COALESCE(v_team,'')
     AND revoked_at IS NULL;

  INSERT INTO app.sessions (user_id, team_id_text, role_at_login, fingerprint, user_agent, ip)
  VALUES (v_uid, v_team, p_role_at_login, p_fingerprint, p_user_agent, p_ip)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END
$$;

REVOKE ALL ON FUNCTION app.start_session(text, text, text, inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.start_session(text, text, text, inet) TO authenticated;

CREATE OR REPLACE FUNCTION app.touch_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_last_seen timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT last_seen_at INTO v_last_seen
    FROM app.sessions
   WHERE id = p_session_id
     AND user_id = v_uid
     AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RETURN; -- já revogada ou não pertence ao usuário
  END IF;

  -- Expira se idle > 30 dias
  IF now() - v_last_seen > interval '30 days' THEN
    UPDATE app.sessions
       SET revoked_at = now()
     WHERE id = p_session_id;
    RETURN;
  END IF;

  UPDATE app.sessions
     SET last_seen_at = now()
   WHERE id = p_session_id;
END
$$;

REVOKE ALL ON FUNCTION app.touch_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.touch_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION app.end_session(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  UPDATE app.sessions
     SET revoked_at = now()
   WHERE id = p_session_id
     AND user_id = auth.uid()
     AND revoked_at IS NULL;
$$;

REVOKE ALL ON FUNCTION app.end_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.end_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION app.end_other_sessions_current_scope(p_keep_session uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  WITH scope AS (
    SELECT auth.uid() AS uid, app.current_team_id() AS team_scope
  )
  UPDATE app.sessions s
     SET revoked_at = now()
    FROM scope
   WHERE s.user_id = scope.uid
     AND COALESCE(s.team_id_text,'') = COALESCE(scope.team_scope,'')
     AND s.revoked_at IS NULL
     AND s.id <> p_keep_session
  RETURNING 1
$$;

REVOKE ALL ON FUNCTION app.end_other_sessions_current_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.end_other_sessions_current_scope(uuid) TO authenticated;

-- Wrappers públicos para RPC via PostgREST (expostos no schema public)
-- Mantemos as mesmas assinaturas utilizadas pelo frontend

CREATE OR REPLACE FUNCTION public.start_session(
  p_role_at_login text,
  p_fingerprint   text DEFAULT NULL,
  p_user_agent    text DEFAULT NULL,
  p_ip            inet DEFAULT NULL
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT app.start_session(p_role_at_login, p_fingerprint, p_user_agent, p_ip);
$$;

REVOKE ALL ON FUNCTION public.start_session(text, text, text, inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_session(text, text, text, inet) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_session(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT app.touch_session(p_session_id);
$$;

REVOKE ALL ON FUNCTION public.touch_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_session(p_session_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT app.end_session(p_session_id);
$$;

REVOKE ALL ON FUNCTION public.end_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.end_other_sessions_current_scope(p_keep_session uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT COALESCE(COUNT(*), 0)
  FROM (
    SELECT app.end_other_sessions_current_scope(p_keep_session)
  ) AS t;
$$;

REVOKE ALL ON FUNCTION public.end_other_sessions_current_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_other_sessions_current_scope(uuid) TO authenticated;

COMMIT;