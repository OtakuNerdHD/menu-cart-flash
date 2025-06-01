import { supabase } from '@/integrations/supabase/client';
import { useTeam } from '@/context/TeamContext';
import { useMemo } from 'react';

/**
 * Hook personalizado para facilitar consultas no Supabase com isolamento por team_id
 * Garante que todas as consultas sejam automaticamente filtradas pelo team atual
 */
export const useSupabaseWithTeam = () => {
  const { teamId } = useTeam();

  const teamSupabase = useMemo(() => {
    if (!teamId) {
      return null;
    }

    return {
      // Buscar produtos do team atual
      getProducts: async (filters?: { available?: boolean; category?: string }) => {
        let query = supabase
          .from('products')
          .select(`
            *,
            restaurants!inner(
              id,
              name,
              team_id
            )
          `)
          .eq('restaurants.team_id', teamId);

        if (filters?.available !== undefined) {
          query = query.eq('available', filters.available);
        }

        if (filters?.category) {
          query = query.eq('category', filters.category);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },

      // Buscar pedidos do team atual
      getOrders: async (filters?: { status?: string; user_id?: string }) => {
        let query = supabase
          .from('orders')
          .select(`
            *,
            order_items(
              *,
              products(*)
            ),
            restaurants!inner(
              id,
              name,
              team_id
            )
          `)
          .eq('team_id', teamId);

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.user_id) {
          query = query.eq('user_id', filters.user_id);
        }

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return data;
      },

      // Buscar restaurantes do team atual
      getRestaurants: async () => {
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('team_id', teamId);
        if (error) throw error;
        return data;
      },

      // Buscar mesas do team atual
      getTables: async (restaurant_id?: string) => {
        let query = supabase
          .from('tables')
          .select(`
            *,
            restaurants!inner(
              id,
              name,
              team_id
            )
          `)
          .eq('team_id', teamId);

        if (restaurant_id) {
          query = query.eq('restaurant_id', parseInt(restaurant_id));
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },

      // Criar produto com team_id automático
      createProduct: async (productData: any) => {
        // Primeiro, buscar um restaurante do team atual
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id')
          .eq('team_id', teamId)
          .limit(1);

        if (!restaurants || restaurants.length === 0) {
          throw new Error('Nenhum restaurante encontrado para este team');
        }

        return supabase
          .from('products')
          .insert({
            ...productData,
            restaurant_id: restaurants[0].id,
            team_id: teamId
          });
      },

      // Criar pedido com team_id automático
      createOrder: async (orderData: any) => {
        // Primeiro, buscar um restaurante do team atual
        const { data: restaurants } = await supabase
          .from('restaurants')
          .select('id')
          .eq('team_id', teamId)
          .limit(1);

        if (!restaurants || restaurants.length === 0) {
          throw new Error('Nenhum restaurante encontrado para este team');
        }

        return supabase
          .from('orders')
          .insert({
            ...orderData,
            restaurant_id: restaurants[0].id,
            team_id: teamId
          });
      },

      // Atualizar produto (com verificação de team)
      updateProduct: async (productId: number, updates: any) => {
        return supabase
          .from('products')
          .update(updates)
          .eq('id', productId)
          .eq('team_id', teamId);
      },

      // Deletar produto (com verificação de team)
      deleteProduct: async (productId: number) => {
        return supabase
          .from('products')
          .delete()
          .eq('id', productId)
          .eq('team_id', teamId);
      },

      // Acesso direto ao cliente Supabase para consultas customizadas
      client: supabase,
      currentTeamId: teamId
    };
  }, [teamId]);

  return {
    teamSupabase,
    teamId,
    isReady: !!teamId && !!teamSupabase
  };
};

// Hook para verificar se uma operação é permitida para o team atual
export const useTeamPermissions = () => {
  const { teamId } = useTeam();

  const canAccess = (resourceTeamId: string) => {
    return teamId === resourceTeamId;
  };

  const requireTeamAccess = (resourceTeamId: string) => {
    if (!canAccess(resourceTeamId)) {
      throw new Error('Acesso negado: recurso não pertence ao team atual');
    }
  };

  return {
    canAccess,
    requireTeamAccess,
    currentTeamId: teamId
  };
};
