-- Instrumentação de logs para revogações explícitas e por expiração
-- Funções: app.end_session e app.touch_session

BEGIN;

-- app.end_session: revogação explícita com contagem em logs
CREATE OR REPLACE FUNCTION app.end_session(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  RAISE NOTICE 'end_session: uid=%, session=%', v_uid, p_session_id;

  UPDATE app.sessions
     SET revoked_at = now()
   WHERE id = p_session_id
     AND user_id = v_uid
     AND revoked_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'end_session: revoked_count=% for uid=% session=%', v_count, v_uid, p_session_id;
END
$$;

REVOKE ALL ON FUNCTION app.end_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.end_session(uuid) TO authenticated;

-- app.touch_session: mantém exceções e adiciona logs para diagnóstico
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
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = 'P0001';
  END IF;

  RAISE NOTICE 'touch_session: uid=%, session=%', v_uid, p_session_id;

  SELECT last_seen_at INTO v_last_seen
    FROM app.sessions
   WHERE id = p_session_id
     AND user_id = v_uid
     AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE NOTICE 'touch_session: not_found_or_revoked uid=% session=%', v_uid, p_session_id;
    RAISE EXCEPTION 'Session revoked or not found' USING ERRCODE = 'P0001';
  END IF;

  IF now() - v_last_seen > interval '30 days' THEN
    UPDATE app.sessions
       SET revoked_at = now()
     WHERE id = p_session_id;
    RAISE NOTICE 'touch_session: expired_and_revoked uid=% session=%', v_uid, p_session_id;
    RAISE EXCEPTION 'Session expired due to inactivity' USING ERRCODE = 'P0001';
  END IF;

  UPDATE app.sessions
     SET last_seen_at = now()
   WHERE id = p_session_id;

  RAISE NOTICE 'touch_session: touched uid=% session=%', v_uid, p_session_id;
END
$$;

REVOKE ALL ON FUNCTION app.touch_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.touch_session(uuid) TO authenticated;

COMMIT;