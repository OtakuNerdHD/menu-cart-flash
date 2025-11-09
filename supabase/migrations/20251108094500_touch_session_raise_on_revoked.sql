-- Atualiza a função app.touch_session para lançar erro quando a sessão
-- estiver revogada/inexistente, permitindo que o cliente detecte e deslogue.

BEGIN;

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

  SELECT last_seen_at INTO v_last_seen
    FROM app.sessions
   WHERE id = p_session_id
     AND user_id = v_uid
     AND revoked_at IS NULL;

  IF NOT FOUND THEN
    -- Sessão não encontrada ou já revogada
    RAISE EXCEPTION 'Session revoked or not found' USING ERRCODE = 'P0001';
  END IF;

  -- Expiração por inatividade (> 30 dias)
  IF now() - v_last_seen > interval '30 days' THEN
    UPDATE app.sessions
       SET revoked_at = now()
     WHERE id = p_session_id;
    RAISE EXCEPTION 'Session expired due to inactivity' USING ERRCODE = 'P0001';
  END IF;

  -- Atualiza last_seen
  UPDATE app.sessions
     SET last_seen_at = now()
   WHERE id = p_session_id;
END
$$;

REVOKE ALL ON FUNCTION app.touch_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.touch_session(uuid) TO authenticated;

COMMIT;