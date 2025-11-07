-- PUBLIC wrappers que chamam app.*  (mantém RLS e SECURITY DEFINER do app.*)
create or replace function public.start_session(
  p_role_at_login text,
  p_fingerprint   text default null,
  p_user_agent    text default null,
  p_ip            text default null
) returns uuid
language sql
security definer
set search_path to app, public
as $$
  select app.start_session(p_role_at_login, p_fingerprint, p_user_agent, p_ip);
$$;

create or replace function public.touch_session(p_session_id uuid)
returns void
language sql
security definer
set search_path to app, public
as $$
  select app.touch_session(p_session_id);
$$;

create or replace function public.end_session(p_session_id uuid)
returns void
language sql
security definer
set search_path to app, public
as $$
  select app.end_session(p_session_id);
$$;

revoke all on function public.start_session(text,text,text,text) from public;
revoke all on function public.touch_session(uuid) from public;
revoke all on function public.end_session(uuid) from public;

grant execute on function public.start_session(text,text,text,text) to anon, authenticated, service_role;
grant execute on function public.touch_session(uuid)              to anon, authenticated, service_role;
grant execute on function public.end_session(uuid)                to anon, authenticated, service_role;