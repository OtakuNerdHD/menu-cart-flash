BEGIN;

-- Tornar app.end_other_sessions_current_scope estrita ao escopo da sessão mantida
-- Sem fallback para header nem GUC; se a sessão não existir ou não tiver escopo, não revoga nada
CREATE OR REPLACE FUNCTION app.end_other_sessions_current_scope(p_keep_session uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_team_from_keep text;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT team_id_text INTO v_team_from_keep
    FROM app.sessions
   WHERE id = p_keep_session
   LIMIT 1;

  IF v_team_from_keep IS NULL THEN
    RAISE NOTICE 'end_other_sessions_current_scope: keep session not found or no scope; uid=% keep=%', v_uid, p_keep_session;
    RETURN 0;
  END IF;

  RAISE NOTICE 'end_other_sessions_current_scope: uid=% keep_scope=% keep=%', v_uid, v_team_from_keep, p_keep_session;

  UPDATE app.sessions s
     SET revoked_at = now()
   WHERE s.user_id = v_uid
     AND COALESCE(s.team_id_text,'') = COALESCE(v_team_from_keep,'')
     AND s.revoked_at IS NULL
     AND s.id <> p_keep_session;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'end_other_sessions_current_scope: revoked count=% for uid=% scope=%', v_count, v_uid, COALESCE(v_team_from_keep,'<NULL>');
  RETURN v_count;
END
$$;

REVOKE ALL ON FUNCTION app.end_other_sessions_current_scope(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.end_other_sessions_current_scope(uuid) TO authenticated;

COMMIT;