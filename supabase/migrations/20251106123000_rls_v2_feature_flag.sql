-- RLS v2 (tenant-scoped via feature flag)
-- Up: cria funções canônicas, tabela app_features e policies v2

BEGIN;

-- Schema de utilidades
CREATE SCHEMA IF NOT EXISTS app;

-- Tabela de feature flags
CREATE TABLE IF NOT EXISTS app.app_features (
  key   text PRIMARY KEY,
  value text NOT NULL CHECK (value IN ('true','false'))
);

-- Flag padrão: RLS v2 desabilitada
INSERT INTO app.app_features(key, value)
VALUES ('rls_v2_enabled','false')
ON CONFLICT (key) DO NOTHING;

-- Funções canônicas (Security Definer)
CREATE OR REPLACE FUNCTION app.current_team_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT NULLIF(current_setting('app.current_team_id', true), '')::text;
$$;

COMMENT ON FUNCTION app.current_team_id() IS 'Canonical accessor for current tenant id from GUC (text).';

CREATE OR REPLACE FUNCTION app.membership_role(team_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT tm.role
  FROM public.team_members tm
  WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION app.is_member(team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
  );
$$;

-- Assumimos que o papel de admin por tenant é 'admin'. Ajuste se existir outro papel de admin por time.
CREATE OR REPLACE FUNCTION app.is_tenant_admin(team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT (tm.role = 'admin')
    FROM public.team_members tm
    WHERE tm.team_id = team_id AND tm.user_id = auth.uid()
    LIMIT 1
  ), false);
$$;

-- Helper de gating por feature flag
-- Usado inline nas policies: EXISTS(SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')

-- Policies V2: válidas somente quando rls_v2_enabled = true

-- PRODUCTS
CREATE POLICY products_v2_select
ON public.products
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (products.team_id = app.current_team_id() AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY products_v2_insert
ON public.products
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (products.team_id = app.current_team_id() AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY products_v2_update
ON public.products
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (products.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (products.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
);

CREATE POLICY products_v2_delete
ON public.products
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (products.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
);

-- ORDERS
CREATE POLICY orders_v2_select
ON public.orders
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (orders.team_id = app.current_team_id() AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY orders_v2_insert
ON public.orders
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (orders.team_id = app.current_team_id() AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY orders_v2_update
ON public.orders
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (orders.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (orders.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
);

CREATE POLICY orders_v2_delete
ON public.orders
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (orders.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
);

-- ORDER_ITEMS (valida por JOIN com a entidade pai orders)
CREATE POLICY order_items_v2_select
ON public.order_items
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.team_id = app.current_team_id()
  )
  AND app.is_member(app.current_team_id()::uuid)
);

CREATE POLICY order_items_v2_insert
ON public.order_items
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.team_id = app.current_team_id()
  )
  AND app.is_member(app.current_team_id()::uuid)
);

CREATE POLICY order_items_v2_update
ON public.order_items
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin(app.current_team_id()::uuid)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin(app.current_team_id()::uuid)
);

CREATE POLICY order_items_v2_delete
ON public.order_items
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin(app.current_team_id()::uuid)
);

-- TEAM_MEMBERS
CREATE POLICY team_members_v2_select_self
ON public.team_members
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (team_members.user_id = auth.uid())
);

CREATE POLICY team_members_v2_select_team
ON public.team_members
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (team_members.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
);

CREATE POLICY team_members_v2_insert_self
ON public.team_members
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (team_members.team_id = app.current_team_id()::uuid AND team_members.user_id = auth.uid())
);

CREATE POLICY team_members_v2_update_admin
ON public.team_members
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (team_members.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (team_members.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
);

CREATE POLICY team_members_v2_delete_admin
ON public.team_members
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (team_members.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
);

-- RESTAURANTS
CREATE POLICY restaurants_v2_select
ON public.restaurants
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (restaurants.team_id = app.current_team_id() AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY restaurants_v2_insert
ON public.restaurants
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (restaurants.team_id = app.current_team_id() AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY restaurants_v2_update
ON public.restaurants
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (restaurants.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (restaurants.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
);

CREATE POLICY restaurants_v2_delete
ON public.restaurants
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (restaurants.team_id = app.current_team_id() AND app.is_tenant_admin(app.current_team_id()::uuid))
);

-- STORE_SETTINGS (team_id é uuid)
CREATE POLICY store_settings_v2_select
ON public.store_settings
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (store_settings.team_id = app.current_team_id()::uuid AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY store_settings_v2_insert
ON public.store_settings
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (store_settings.team_id = app.current_team_id()::uuid AND app.is_member(app.current_team_id()::uuid))
);

CREATE POLICY store_settings_v2_update
ON public.store_settings
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (store_settings.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (store_settings.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
);

CREATE POLICY store_settings_v2_delete
ON public.store_settings
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND (store_settings.team_id = app.current_team_id()::uuid AND app.is_tenant_admin(app.current_team_id()::uuid))
);

-- PRODUCT_IMAGES (valida por JOIN com products)
CREATE POLICY product_images_v2_select
ON public.product_images
FOR SELECT TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.team_id = app.current_team_id()
  )
  AND app.is_member(app.current_team_id()::uuid)
);

CREATE POLICY product_images_v2_insert
ON public.product_images
FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.team_id = app.current_team_id()
  )
  AND app.is_member(app.current_team_id()::uuid)
);

CREATE POLICY product_images_v2_update
ON public.product_images
FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin(app.current_team_id()::uuid)
)
WITH CHECK (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin(app.current_team_id()::uuid)
);

CREATE POLICY product_images_v2_delete
ON public.product_images
FOR DELETE TO public
USING (
  EXISTS (SELECT 1 FROM app.app_features WHERE key='rls_v2_enabled' AND value='true')
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id AND p.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin(app.current_team_id()::uuid)
);

COMMIT;

-- Down (referência): execute manualmente para rollback se necessário
-- BEGIN;
-- DROP POLICY IF EXISTS products_v2_select ON public.products;
-- DROP POLICY IF EXISTS products_v2_insert ON public.products;
-- DROP POLICY IF EXISTS products_v2_update ON public.products;
-- DROP POLICY IF EXISTS products_v2_delete ON public.products;
-- DROP POLICY IF EXISTS orders_v2_select ON public.orders;
-- DROP POLICY IF EXISTS orders_v2_insert ON public.orders;
-- DROP POLICY IF EXISTS orders_v2_update ON public.orders;
-- DROP POLICY IF EXISTS orders_v2_delete ON public.orders;
-- DROP POLICY IF EXISTS order_items_v2_select ON public.order_items;
-- DROP POLICY IF EXISTS order_items_v2_insert ON public.order_items;
-- DROP POLICY IF EXISTS order_items_v2_update ON public.order_items;
-- DROP POLICY IF EXISTS order_items_v2_delete ON public.order_items;
-- DROP POLICY IF EXISTS team_members_v2_select_self ON public.team_members;
-- DROP POLICY IF EXISTS team_members_v2_select_team ON public.team_members;
-- DROP POLICY IF EXISTS team_members_v2_insert_self ON public.team_members;
-- DROP POLICY IF EXISTS team_members_v2_update_admin ON public.team_members;
-- DROP POLICY IF EXISTS team_members_v2_delete_admin ON public.team_members;
-- DROP POLICY IF EXISTS restaurants_v2_select ON public.restaurants;
-- DROP POLICY IF EXISTS restaurants_v2_insert ON public.restaurants;
-- DROP POLICY IF EXISTS restaurants_v2_update ON public.restaurants;
-- DROP POLICY IF EXISTS restaurants_v2_delete ON public.restaurants;
-- DROP POLICY IF EXISTS store_settings_v2_select ON public.store_settings;
-- DROP POLICY IF EXISTS store_settings_v2_insert ON public.store_settings;
-- DROP POLICY IF EXISTS store_settings_v2_update ON public.store_settings;
-- DROP POLICY IF EXISTS store_settings_v2_delete ON public.store_settings;
-- DROP POLICY IF EXISTS product_images_v2_select ON public.product_images;
-- DROP POLICY IF EXISTS product_images_v2_insert ON public.product_images;
-- DROP POLICY IF EXISTS product_images_v2_update ON public.product_images;
-- DROP POLICY IF EXISTS product_images_v2_delete ON public.product_images;
-- DROP FUNCTION IF EXISTS app.is_tenant_admin(uuid);
-- DROP FUNCTION IF EXISTS app.is_member(uuid);
-- DROP FUNCTION IF EXISTS app.membership_role(uuid);
-- DROP FUNCTION IF EXISTS app.current_team_id();
-- DROP TABLE IF EXISTS app.app_features;
-- DROP SCHEMA IF EXISTS app;
-- COMMIT;