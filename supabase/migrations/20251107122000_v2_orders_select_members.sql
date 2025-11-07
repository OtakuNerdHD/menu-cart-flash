-- V2: orders SELECT para membros do time atual, com gate por feature flag
-- Não remove policies v1; ativa apenas sob a flag rls_v2_enabled

CREATE POLICY v2_orders_select_members
ON public.orders
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND app.is_member(app.current_team_id()::uuid)
  AND team_id = app.current_team_id()
);