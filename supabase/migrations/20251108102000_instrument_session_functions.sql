-- Instrumentação temporária de logs nas funções de sessão
-- start_session e end_other_sessions_current_scope

BEGIN;

-- Instrumentar start_session com RAISE NOTICE
CREATE OR REPLACE FUNCTION app.start_session(
  p_role_at_login text,
  p_fingerprint text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_ip inet DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team text := app.current_team_id();
  v_new_id uuid;
  v_revoked_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RAISE NOTICE 'start_session: uid=%, team=%, role=%', v_uid, COALESCE(v_team,'<NULL>'), p_role_at_login;

  UPDATE app.sessions
     SET revoked_at = now()
   WHERE user_id = v_uid
     AND COALESCE(team_id_text,'') = COALESCE(v_team,'')
     AND revoked_at IS NULL;

  GET DIAGNOSTICS v_revoked_count = ROW_COUNT;
  RAISE NOTICE 'start_session: revoked previous sessions=% for uid=% team=%', v_revoked_count, v_uid, COALESCE(v_team,'<NULL>');

  INSERT INTO app.sessions (user_id, team_id_text, role_at_login, fingerprint, user_agent, ip)
  VALUES (v_uid, v_team, p_role_at_login, p_fingerprint, p_user_agent, p_ip)
  RETURNING id INTO v_new_id;

  RAISE NOTICE 'start_session: created id=% for uid=% team=%', v_new_id, v_uid, COALESCE(v_team,'<NULL>');

  RETURN v_new_id;
END
$$;

REVOKE ALL ON FUNCTION app.start_session(text, text, text, inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.start_session(text, text, text, inet) TO authenticated;

-- Instrumentar end_other_sessions_current_scope com RAISE NOTICE
CREATE OR REPLACE FUNCTION app.end_other_sessions_current_scope(
  p_keep_session uuid
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team text := app.current_team_id();
  v_count integer := 0;
BEGIN
  RAISE NOTICE 'end_other_sessions_current_scope: uid=%, team=%, keep=%', v_uid, COALESCE(v_team,'<NULL>'), p_keep_session;

  UPDATE app.sessions s
     SET revoked_at = now()
   WHERE s.user_id = v_uid
     AND COALESCE(s.team_id_text,'') = COALESCE(v_team,'')
     AND s.revoked_at IS NULL
     AND s.id <> p_keep_session;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'end_other_sessions_current_scope: revoked count=% for uid=% team=%', v_count, v_uid, COALESCE(v_team,'<NULL>');

  RETURN v_count;
END
$$;

REVOKE ALL ON FUNCTION app.end_other_sessions_current_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.end_other_sessions_current_scope(uuid) TO authenticated;

COMMIT;