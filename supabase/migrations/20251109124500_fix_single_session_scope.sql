BEGIN;

-- Ajuste de escopo em single-session para evitar revogação cruzada entre tenants
-- Fallbacks: app.current_team_id() -> request.header.x-tenant-id -> app.current_team

-- app.start_session: usa escopo resolvido com fallbacks
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
  v_team text := COALESCE(
    app.current_team_id(),
    NULLIF(current_setting('request.header.x-tenant-id', true), ''),
    NULLIF(current_setting('app.current_team', true), '')
  ); -- NULL no master
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

-- app.end_other_sessions_current_scope: se GUC ausente, usa escopo da sessão mantida; senao tenta header; por fim legacy app.current_team
CREATE OR REPLACE FUNCTION app.end_other_sessions_current_scope(p_keep_session uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team text := app.current_team_id();
  v_team_from_keep text;
  v_team_from_header text := NULLIF(current_setting('request.header.x-tenant-id', true), '');
  v_team_legacy text := NULLIF(current_setting('app.current_team', true), '');
  v_scope text;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- tenta derivar o escopo da sessão que será mantida
  SELECT team_id_text INTO v_team_from_keep
    FROM app.sessions
   WHERE id = p_keep_session
   LIMIT 1;

  v_scope := COALESCE(v_team, v_team_from_keep, v_team_from_header, v_team_legacy);

  UPDATE app.sessions s
     SET revoked_at = now()
   WHERE s.user_id = v_uid
     AND COALESCE(s.team_id_text,'') = COALESCE(v_scope,'')
     AND s.revoked_at IS NULL
     AND s.id <> p_keep_session;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END
$$;

REVOKE ALL ON FUNCTION app.end_other_sessions_current_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.end_other_sessions_current_scope(uuid) TO authenticated;

COMMIT;