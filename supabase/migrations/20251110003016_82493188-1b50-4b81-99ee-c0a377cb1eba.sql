-- Add helper RPCs for deterministic tenant scoping in sessions
BEGIN;

-- 1) Return active session id for the current user and a specific tenant scope
CREATE OR REPLACE FUNCTION app.get_active_session(p_tenant_id_text text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT id
  FROM app.sessions
  WHERE user_id = auth.uid()
    AND COALESCE(team_id_text,'') = COALESCE(p_tenant_id_text,'')
    AND revoked_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION app.get_active_session(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.get_active_session(text) TO authenticated;

-- 2) Deterministic session start using an explicit tenant id (avoids reliance on per-connection settings)
CREATE OR REPLACE FUNCTION app.start_session_with_tenant(
  p_team_id_text text,
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
  v_new_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Revoke any existing active session for the same user + provided tenant scope
  UPDATE app.sessions
     SET revoked_at = now()
   WHERE user_id = v_uid
     AND COALESCE(team_id_text,'') = COALESCE(p_team_id_text,'')
     AND revoked_at IS NULL;

  -- Create new session in the explicit scope
  INSERT INTO app.sessions (user_id, team_id_text, role_at_login, fingerprint, user_agent, ip)
  VALUES (v_uid, p_team_id_text, p_role_at_login, p_fingerprint, p_user_agent, p_ip)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END
$$;

REVOKE ALL ON FUNCTION app.start_session_with_tenant(text, text, text, text, inet) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.start_session_with_tenant(text, text, text, text, inet) TO authenticated;

COMMIT;