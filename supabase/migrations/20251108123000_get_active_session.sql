BEGIN;

-- RPC: retorna a sessão ativa (não revogada) para o par (auth.uid, p_tenant_id_text)
CREATE OR REPLACE FUNCTION app.get_active_session(
  p_tenant_id_text text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO app, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sid uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT s.id INTO v_sid
    FROM app.sessions s
   WHERE s.user_id = v_uid
     AND COALESCE(s.team_id_text,'') = COALESCE(p_tenant_id_text,'')
     AND s.revoked_at IS NULL
   ORDER BY s.last_seen_at DESC
   LIMIT 1;

  RETURN v_sid;
END
$$;

REVOKE ALL ON FUNCTION app.get_active_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.get_active_session(text) TO authenticated;

COMMIT;