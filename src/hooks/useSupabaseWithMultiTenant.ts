import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext'; // Importar useAuth

/**
 * Hook que encapsula operações do Supabase com isolamento multi-tenant
 * Filtra automaticamente os dados baseado no team atual
 */
export const useSupabaseWithMultiTenant = () => {
  const { currentTeam, isAdminMode } = useMultiTenant();
  const { loading: authLoading, user: authUser } = useAuth(); // Obter estado de loading e usuário do AuthContext

  // Configurar o team_id no Supabase para RLS
  useEffect(() => {
    const configureSupabase = async () => {
      // Não configurar RLS se a autenticação ainda estiver carregando ou não houver usuário
      if (authLoading || !authUser) {
        console.log('Aguardando autenticação ou usuário não encontrado para configurar RLS.');
        return;
      }

      try {
        // Verificar se há uma sessão ativa antes de configurar RLS
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.log('Nenhuma sessão ativa encontrada, não configurando RLS:', sessionError);
          return;
        }
        
        console.log('Sessão ativa confirmada, configurando RLS para:', authUser.id);
        
        if (isAdminMode) {
          // Configurar modo admin - verificar se é admin geral
          const hostname = window.location.hostname;
          const isGeneralAdmin = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
          
          if (isGeneralAdmin) {
            const result1 = await supabase.rpc('set_app_config', {
              config_name: 'app.current_user_role',
              config_value: 'general_admin'
            });
            
            const result2 = await supabase.rpc('set_app_config', {
                config_name: 'app.current_team_id',
                config_value: null // Correção: Usar null para admin geral
              });
            
            console.log('Configurações RLS aplicadas para admin geral:', result1, result2);
          } else {
            const result1 = await supabase.rpc('set_app_config', {
              config_name: 'app.current_user_role',
              config_value: 'admin'
            });
            
            const result2 = await supabase.rpc('set_app_config', {
                config_name: 'app.current_team_id',
                config_value: null // Correção: Usar null para admin de subdomínio
              });
            
            console.log('Configurações RLS aplicadas para modo admin:', result1, result2);
          }
        } else if (currentTeam?.id) {
          // Configurar modo team específico
          const result1 = await supabase.rpc('set_app_config', {
            config_name: 'app.current_user_role',
            config_value: 'user'
          });
          
          const result2 = await supabase.rpc('set_app_config', {
               config_name: 'app.current_team_id',
               config_value: currentTeam.id.toString()
             });
          
          console.log('Configurações RLS aplicadas para team:', currentTeam.id, result1, result2);
        }
      } catch (error) {
        console.warn('Erro ao configurar RLS:', error);
      }
    };

    configureSupabase();
  }, [isAdminMode, currentTeam, authLoading, authUser]); // Adicionar authLoading e authUser às dependências

  // Função para adicionar filtro de team automaticamente
  const addTeamFilter = (query: any) => {
    if (!isAdminMode && currentTeam) {
      return query.eq('team_id', currentTeam.id);
    }
    return query;
  };

  // Produtos
  const getProducts = async (filters?: { category?: string; restaurant_id?: string }) => {
    let query = supabase.from('products').select('*');
    
    // Aplicar filtro de team automaticamente
    query = addTeamFilter(query);
    
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', Number(filters.restaurant_id));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const createProduct = async (product: any) => {
    const productData = {
      ...product,
      team_id: isAdminMode ? product.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const updateProduct = async (id: string, updates: any) => {
    let query = supabase.from('products').update(updates).eq('id', Number(id));
    
    // Aplicar filtro de team para segurança
    if (!isAdminMode && currentTeam) {
      query = query.eq('team_id', currentTeam.id);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  };

  const deleteProduct = async (id: string) => {
    let query = supabase.from('products').delete().eq('id', Number(id));
    
    // Aplicar filtro de team para segurança
    if (!isAdminMode && currentTeam) {
      query = query.eq('team_id', currentTeam.id);
    }
    
    const { error } = await query;
    if (error) throw error;
  };

  // Pedidos
  const getOrders = async (filters?: { status?: string; restaurant_id?: string }) => {
    let query = supabase.from('orders').select('*, order_items(*)');
    
    // Aplicar filtro de team automaticamente
    query = addTeamFilter(query);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', Number(filters.restaurant_id));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const createOrder = async (order: any) => {
    const orderData = {
      ...order,
      team_id: isAdminMode ? order.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const updateOrder = async (id: string, updates: any) => {
    let query = supabase.from('orders').update(updates).eq('id', Number(id));
    
    // Aplicar filtro de team para segurança
    if (!isAdminMode && currentTeam) {
      query = query.eq('team_id', currentTeam.id);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  };

  // Restaurantes
  const getRestaurants = async () => {
    let query = supabase.from('restaurants').select('*');
    
    // Aplicar filtro de team automaticamente
    query = addTeamFilter(query);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const createRestaurant = async (restaurant: any) => {
    const restaurantData = {
      ...restaurant,
      team_id: isAdminMode ? restaurant.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  // Mesas
  const getTables = async (restaurant_id?: string) => {
    const baseQuery = supabase.from('tables').select('*');
    const teamQuery = addTeamFilter(baseQuery);
    
    const finalQuery = restaurant_id 
      ? teamQuery.eq('restaurant_id', Number(restaurant_id))
      : teamQuery;
    
    const { data, error } = await finalQuery;
    if (error) throw error;
    return data;
  };

  const createTable = async (table: any) => {
    const tableData = {
      ...table,
      team_id: isAdminMode ? table.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('tables')
      .insert(tableData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  // Teams (apenas para admin)
  const getTeams = async () => {
    if (!isAdminMode) {
      throw new Error('Acesso negado: apenas admins podem listar teams');
    }
    
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  };

  // Função para criar um novo team (restaurante)
  const createTeam = async (teamData: any) => {
    try {
      // Verificar se há uma sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Nenhuma sessão ativa encontrada. Faça login novamente.');
      }
      
      // Verificar se está no domínio principal (apenas o domínio principal pode criar teams)
      const hostname = window.location.hostname;
      const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
      
      if (!isMainDomain) {
        throw new Error('Acesso negado: criação de clientes disponível apenas no domínio principal');
      }
      
      if (!isAdminMode) {
        throw new Error('Acesso negado: apenas usuários admin podem criar clientes');
      }
      
      // Garantir que as configurações RLS estão aplicadas
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_user_role',
        config_value: 'general_admin'
      });
      
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_team_id',
        config_value: null
      });
      
      // Verificar se o slug já existe
      const { data: existingTeam, error: checkError } = await supabase
        .from('teams')
        .select('id, slug')
        .eq('slug', teamData.slug)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingTeam) {
        throw new Error(`Slug '${teamData.slug}' já está em uso. Escolha outro slug.`);
      }
      
      // Preparar dados do team
      const preparedData = {
        name: teamData.name,
        slug: teamData.slug,
        description: teamData.description || null,
        settings: teamData.settings || {}
      };
      
      // Inserir o novo team
      const { data: newTeam, error: insertError } = await supabase
        .from('teams')
        .insert(preparedData)
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      return newTeam;
    } catch (error: any) {
      console.error('Erro ao criar restaurante:', error);
      throw error;
    }
  };

  const updateTeam = async (id: string, updates: any) => {
    // Verificar se há uma sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Nenhuma sessão ativa encontrada. Faça login novamente.');
    }
    
    // Verificar se está no domínio principal (apenas o domínio principal pode atualizar teams)
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
    
    if (!isMainDomain) {
      throw new Error('Acesso negado: atualização de clientes disponível apenas no domínio principal');
    }
    
    if (!isAdminMode) {
      throw new Error('Acesso negado: apenas usuários admin podem atualizar clientes');
    }
    
    // Garantir que as configurações RLS estão aplicadas
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_user_role',
      config_value: 'general_admin'
    });
    
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team_id',
      config_value: null
    });
    
    const { data, error } = await supabase
      .from('teams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const deleteTeam = async (id: string) => {
    // Verificar se há uma sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Nenhuma sessão ativa encontrada. Faça login novamente.');
    }
    
    // Verificar se é admin geral (apenas eles podem deletar teams)
    const hostname = window.location.hostname;
    const isGeneralAdmin = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
    
    if (!isAdminMode || !isGeneralAdmin) {
      throw new Error('Acesso negado: apenas o admin geral pode deletar teams');
    }
    
    // Garantir que as configurações RLS estão aplicadas
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_user_role',
      config_value: 'general_admin'
    });
    
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team_id',
      config_value: null
    });
    
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  };

  return {
    // Cliente Supabase direto (para casos especiais)
    supabase,
    
    // Estado do multi-tenant
    currentTeam,
    isAdminMode,
    
    // Operações de produtos
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    
    // Operações de pedidos
    getOrders,
    createOrder,
    updateOrder,
    
    // Operações de restaurantes
    getRestaurants,
    createRestaurant,
    
    // Operações de mesas
    getTables,
    createTable,
    
    // Operações de teams (admin apenas)
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    
    // Utilitários
    addTeamFilter
  };
};