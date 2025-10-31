import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback, useRef } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { supabase, TENANT_HEADER_KEYS } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

const NO_TEAM_SENTINEL = '00000000-0000-0000-0000-000000000000';

interface Team {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
}

interface MultiTenantContextType {
  currentTeam: Team | null;
  isLoading: boolean;
  isAdminMode: boolean;
  isClientMode: boolean;
  subdomain: string | null;
  resolvedTeamId: string | null;
  switchToClient: (clientSlug: string) => void;
  switchToAdmin: () => void;
  refreshTeam: () => Promise<void>;
}

const MultiTenantContext = createContext<MultiTenantContextType | undefined>(undefined);

interface MultiTenantProviderProps {
  children: ReactNode;
}

export const MultiTenantProvider: React.FC<MultiTenantProviderProps> = ({ children }) => {
  const { subdomain, isLoading: subdomainLoading, isAdminMode, switchToClient, switchToAdmin } = useSubdomain();
  const { isSuperAdmin, user } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const ensuredRef = useRef<string | null>(null);

  // Verificar se está em ambiente local
  const isLocalEnvironment = useMemo(() => {
    const hostname = window.location.hostname;
    return (hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  const effectiveAdminMode = useMemo(() => {
    // Admin mode apenas quando for super admin no domínio principal
    return isSuperAdmin && isAdminMode;
  }, [isSuperAdmin, isAdminMode]);

  const effectiveSubdomain = useMemo(() => {
    if (effectiveAdminMode) return null;
    return subdomain;
  }, [effectiveAdminMode, subdomain]);

  const applyRlsConfig = useCallback(async (roleValue: 'general_admin' | 'admin' | 'user' | 'visitor', teamId: string | null) => {
    try {
      const { error: roleError } = await supabase.rpc('set_app_config', {
        config_name: 'app.current_user_role',
        config_value: roleValue
      });

      if (roleError) {
        console.warn('Falha ao configurar papel via set_app_config:', roleError);
      }

      const { error: teamError } = await supabase.rpc('set_app_config', {
        config_name: 'app.current_team_id',
        config_value: teamId ?? NO_TEAM_SENTINEL
      });

      if (teamError) {
        console.warn('Falha ao configurar team via set_app_config:', teamError);
      }

      // Adicional: manter variável 'app.current_team' alinhada para políticas que esperam este nome
      const { error: legacyTeamVarError } = await supabase.rpc('set_app_config', {
        config_name: 'app.current_team',
        config_value: teamId ?? NO_TEAM_SENTINEL
      });

      if (legacyTeamVarError) {
        console.warn('Falha ao configurar app.current_team via set_app_config:', legacyTeamVarError);
      }

      // Persistir também em headers para visitantes (e usuários) via fetch global
      try {
        localStorage.setItem(TENANT_HEADER_KEYS.role, roleValue);
        localStorage.setItem(TENANT_HEADER_KEYS.tenantId, teamId ?? NO_TEAM_SENTINEL);
      } catch {}

      console.log('[MultiTenant] applyRlsConfig', { roleValue, teamId, roleError, teamError, legacyTeamVarError });
    } catch (error) {
      console.warn('Erro ao configurar RLS no MultiTenantContext:', error);
    }
  }, []);

  const loadTeamById = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao buscar team por id:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao carregar team por id:', error);
      return null;
    }
  };

  const setRestaurantContext = useCallback(async (teamId: string | null) => {
    try {
      let restaurantValue = '0';
      if (teamId) {
        const { data: restaurants, error } = await supabase
          .from('restaurants')
          .select('id')
          .eq('team_id', teamId)
          .limit(1);
        if (!error && restaurants && restaurants.length > 0) {
          restaurantValue = String(restaurants[0].id);
        }
      }
      
      // Configurar via RPC
      const { error: restaurantErr } = await supabase.rpc('set_app_config', {
        config_name: 'jwt.claims.restaurant_id',
        config_value: restaurantValue,
      } as never);
      if (restaurantErr) {
        console.warn('Falha ao configurar restaurant_id via set_app_config:', restaurantErr);
      }
      
      // Salvar nos headers para visitantes
      localStorage.setItem(TENANT_HEADER_KEYS.restaurantId, restaurantValue);
    } catch (error) {
      console.warn('Erro ao configurar restaurant_id:', error);
    }
  }, []);

  const refreshTeam = async () => {
    setIsLoading(true);

    // Domínio principal: só super admin recebe privilégios; demais são 'user' com sentinel
    if (!effectiveSubdomain) {
      const roleValue = isSuperAdmin ? 'general_admin' : 'user';
      await applyRlsConfig(roleValue, NO_TEAM_SENTINEL);
      setCurrentTeam(null);
      setIsLoading(false);
      return;
    }

    // Modo cliente: primeiro garante associação e contexto pelo RPC
    let ensuredTeamId: string | null = null;
    if (!user) {
      await applyRlsConfig('visitor', NO_TEAM_SENTINEL);
      await setRestaurantContext(null);
    }
    try {
      const { data: ensured, error: ensureErr } = await supabase.rpc('ensure_membership' as never, { team_slug: effectiveSubdomain } as never);
      if (!ensureErr && ensured) {
        ensuredTeamId = String(ensured);
        ensuredRef.current = ensuredTeamId;
      } else if (ensureErr) {
        console.warn('ensure_membership falhou:', ensureErr);
      }
    } catch (e) {
      console.warn('Erro ensure_membership:', e);
    }

    if (ensuredTeamId) {
      const roleValue: 'user' | 'admin' | 'general_admin' | 'visitor' = isSuperAdmin
        ? 'admin'
        : (user ? 'user' : 'visitor');
      await applyRlsConfig(roleValue, ensuredTeamId);
      await setRestaurantContext(ensuredTeamId);

      const team = await loadTeamById(ensuredTeamId);
      if (team) {
        setCurrentTeam(team);
        console.log('Team carregado via ensure_membership:', team);
      } else {
        setCurrentTeam(null);
      }
    } else {
      // Não conseguiu garantir membership; cair para admin sentinel (sem acessar dados)
      const fallbackRole: 'general_admin' | 'admin' | 'visitor' = isSuperAdmin ? 'general_admin' : (user ? 'admin' : 'visitor');
      await applyRlsConfig(fallbackRole, NO_TEAM_SENTINEL);
      await setRestaurantContext(null);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (!subdomainLoading) {
      refreshTeam();
    }
  }, [effectiveSubdomain, effectiveAdminMode, subdomainLoading]);

  // Garantia extra desnecessária agora; manter apenas log
  useEffect(() => {
    if (user && currentTeam && !effectiveAdminMode) {
      console.log('[MultiTenant] currentTeam assegurado', currentTeam.id);
    }
  }, [user, currentTeam, effectiveAdminMode]);

  // Garantir que o carregamento seja finalizado em ambiente local
  useEffect(() => {
    if (isLocalEnvironment && subdomainLoading === false) {
      // Forçar finalização do carregamento após um curto período em ambiente local
      const timer = setTimeout(() => {
        setIsLoading(false);
        console.log('Carregamento finalizado forçadamente em ambiente local');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [isLocalEnvironment, subdomainLoading]);

  const value: MultiTenantContextType = {
    currentTeam,
    isLoading: isLocalEnvironment ? false : (subdomainLoading || isLoading),
    isAdminMode: effectiveAdminMode,
    isClientMode: !effectiveAdminMode && !!effectiveSubdomain,
    subdomain: effectiveSubdomain,
    resolvedTeamId: currentTeam?.id ?? ensuredRef.current,
    switchToClient,
    switchToAdmin,
    refreshTeam
  };

  return (
    <MultiTenantContext.Provider value={value}>
      {children}
    </MultiTenantContext.Provider>
  );
};

export const useMultiTenant = (): MultiTenantContextType => {
  const context = useContext(MultiTenantContext);
  if (context === undefined) {
    throw new Error('useMultiTenant deve ser usado dentro de um MultiTenantProvider');
  }
  return context;
};

// Hook para verificar se o usuário tem acesso ao team atual
export const useTeamAccess = () => {
  const { currentTeam, isAdminMode } = useMultiTenant();
  
  const hasAccess = (requiredTeamId?: string) => {
    // Admin sempre tem acesso
    if (isAdminMode) return true;
    
    // Se não há team requerido, permitir acesso
    if (!requiredTeamId) return true;
    
    // Verificar se o team atual corresponde ao requerido
    return currentTeam?.id === requiredTeamId;
  };
  
  const requireTeamAccess = (requiredTeamId?: string) => {
    if (!hasAccess(requiredTeamId)) {
      throw new Error('Acesso negado: recurso não pertence ao team atual');
    }
  };
  
  return { 
    hasAccess, 
    requireTeamAccess, 
    currentTeamId: currentTeam?.id || null,
    isAdminMode
  };
};