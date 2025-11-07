-- Cria função SECURITY DEFINER para encapsular a flag RLS v2
CREATE OR REPLACE FUNCTION app.rls_v2_enabled()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO app, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM app.app_features
    WHERE key = 'rls_v2_enabled' AND value = 'true'
  );
$$;

-- Restringe execução e concede para roles necessárias
REVOKE ALL ON FUNCTION app.rls_v2_enabled() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.rls_v2_enabled() TO anon, authenticated, service_role;

-- Atualiza policies v2 para usar app.rls_v2_enabled()

-- public.orders
DROP POLICY IF EXISTS orders_v2_select ON public.orders;
CREATE POLICY orders_v2_select
ON public.orders
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS orders_v2_insert ON public.orders;
CREATE POLICY orders_v2_insert
ON public.orders
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS orders_v2_update ON public.orders;
CREATE POLICY orders_v2_update
ON public.orders
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
)
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS orders_v2_delete ON public.orders;
CREATE POLICY orders_v2_delete
ON public.orders
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

-- Também alinhar nossa policy adicional de membros
DROP POLICY IF EXISTS v2_orders_select_members ON public.orders;
CREATE POLICY v2_orders_select_members
ON public.orders
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND app.is_member((app.current_team_id())::uuid)
  AND (team_id = app.current_team_id())
);

-- public.order_items
DROP POLICY IF EXISTS order_items_v2_select ON public.order_items;
CREATE POLICY order_items_v2_select
ON public.order_items
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.team_id = app.current_team_id()
  )
  AND app.is_member((app.current_team_id())::uuid)
);

DROP POLICY IF EXISTS order_items_v2_insert ON public.order_items;
CREATE POLICY order_items_v2_insert
ON public.order_items
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.team_id = app.current_team_id()
  )
  AND app.is_member((app.current_team_id())::uuid)
);

DROP POLICY IF EXISTS order_items_v2_update ON public.order_items;
CREATE POLICY order_items_v2_update
ON public.order_items
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin((app.current_team_id())::uuid)
)
WITH CHECK (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin((app.current_team_id())::uuid)
);

DROP POLICY IF EXISTS order_items_v2_delete ON public.order_items;
CREATE POLICY order_items_v2_delete
ON public.order_items
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND o.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin((app.current_team_id())::uuid)
);

-- public.products
DROP POLICY IF EXISTS products_v2_select ON public.products;
CREATE POLICY products_v2_select
ON public.products
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS products_v2_insert ON public.products;
CREATE POLICY products_v2_insert
ON public.products
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS products_v2_update ON public.products;
CREATE POLICY products_v2_update
ON public.products
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
)
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS products_v2_delete ON public.products;
CREATE POLICY products_v2_delete
ON public.products
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

-- public.product_images
DROP POLICY IF EXISTS product_images_v2_select ON public.product_images;
CREATE POLICY product_images_v2_select
ON public.product_images
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.team_id = app.current_team_id()
  )
  AND app.is_member((app.current_team_id())::uuid)
);

DROP POLICY IF EXISTS product_images_v2_insert ON public.product_images;
CREATE POLICY product_images_v2_insert
ON public.product_images
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.team_id = app.current_team_id()
  )
  AND app.is_member((app.current_team_id())::uuid)
);

DROP POLICY IF EXISTS product_images_v2_update ON public.product_images;
CREATE POLICY product_images_v2_update
ON public.product_images
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin((app.current_team_id())::uuid)
)
WITH CHECK (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin((app.current_team_id())::uuid)
);

DROP POLICY IF EXISTS product_images_v2_delete ON public.product_images;
CREATE POLICY product_images_v2_delete
ON public.product_images
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
      AND p.team_id = app.current_team_id()
  )
  AND app.is_tenant_admin((app.current_team_id())::uuid)
);

-- public.restaurants
DROP POLICY IF EXISTS restaurants_v2_select ON public.restaurants;
CREATE POLICY restaurants_v2_select
ON public.restaurants
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS restaurants_v2_insert ON public.restaurants;
CREATE POLICY restaurants_v2_insert
ON public.restaurants
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS restaurants_v2_update ON public.restaurants;
CREATE POLICY restaurants_v2_update
ON public.restaurants
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
)
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS restaurants_v2_delete ON public.restaurants;
CREATE POLICY restaurants_v2_delete
ON public.restaurants
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND ((team_id = app.current_team_id()) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

-- public.store_settings
DROP POLICY IF EXISTS store_settings_v2_select ON public.store_settings;
CREATE POLICY store_settings_v2_select
ON public.store_settings
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS store_settings_v2_insert ON public.store_settings;
CREATE POLICY store_settings_v2_insert
ON public.store_settings
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_member((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS store_settings_v2_update ON public.store_settings;
CREATE POLICY store_settings_v2_update
ON public.store_settings
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
)
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS store_settings_v2_delete ON public.store_settings;
CREATE POLICY store_settings_v2_delete
ON public.store_settings
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

-- public.team_members
DROP POLICY IF EXISTS team_members_v2_select_self ON public.team_members;
CREATE POLICY team_members_v2_select_self
ON public.team_members
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND (user_id = auth.uid())
);

DROP POLICY IF EXISTS team_members_v2_select_team ON public.team_members;
CREATE POLICY team_members_v2_select_team
ON public.team_members
FOR SELECT
USING (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS team_members_v2_insert_self ON public.team_members;
CREATE POLICY team_members_v2_insert_self
ON public.team_members
FOR INSERT
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND (user_id = auth.uid()))
);

DROP POLICY IF EXISTS team_members_v2_update_admin ON public.team_members;
CREATE POLICY team_members_v2_update_admin
ON public.team_members
FOR UPDATE
USING (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
)
WITH CHECK (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
);

DROP POLICY IF EXISTS team_members_v2_delete_admin ON public.team_members;
CREATE POLICY team_members_v2_delete_admin
ON public.team_members
FOR DELETE
USING (
  app.rls_v2_enabled()
  AND ((team_id = (app.current_team_id())::uuid) AND app.is_tenant_admin((app.current_team_id())::uuid))
);