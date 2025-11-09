-- Adicionar RPC get_active_session que estava faltando
-- Retorna o ID da sessão ativa para um user_id + tenant específico

CREATE OR REPLACE FUNCTION app.get_active_session(p_tenant_id_text text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT id
  FROM app.sessions
  WHERE user_id = auth.uid()
    AND COALESCE(team_id_text, '') = COALESCE(p_tenant_id_text, '')
    AND revoked_at IS NULL
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION app.get_active_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.get_active_session(text) TO authenticated;