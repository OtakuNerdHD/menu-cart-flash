import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Usar credenciais explícitas para garantir persistência de sessão em todos ambientes
const supabaseUrl = 'https://jzosgtmmjswjtjvibpye.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6b3NndG1tanN3anRqdmlicHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MDkxNjQsImV4cCI6MjA1OTQ4NTE2NH0.Ky2APyH6-3v52zWQonNV9fJr9PG5L5oS9zaZe12IWp0';

// Chaves locais para headers multi-tenant por visitantes e usuários
export const TENANT_HEADER_KEYS = {
  tenantId: 'delliapp_tenant_id',
  role: 'delliapp_role',
  restaurantId: 'delliapp_restaurant_id',
} as const;

export const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'delliapp_auth',
  },
  // Injeta headers em TODAS as requisições (funciona para visitantes sem JWT)
  global: {
    fetch: (input, init) => {
      const headers = new Headers(init?.headers || {});
      try {
        const tenantId = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
        const role = localStorage.getItem(TENANT_HEADER_KEYS.role);
        const restaurantId = localStorage.getItem(TENANT_HEADER_KEYS.restaurantId);
        if (tenantId) headers.set('x-tenant-id', tenantId);
        if (role) headers.set('x-app-role', role);
        if (restaurantId) headers.set('x-restaurant-id', restaurantId);
      } catch {}
      return fetch(input as RequestInfo, { ...init, headers });
    },
  },
});
