import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

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
  const { isSuperAdmin } = useAuth();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se está em ambiente local
  const isLocalEnvironment = useMemo(() => {
    const hostname = window.location.hostname;
    return (hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  const effectiveAdminMode = useMemo(() => {
    if (isSuperAdmin) return true;
    return isAdminMode;
  }, [isSuperAdmin, isAdminMode]);

  const effectiveSubdomain = useMemo(() => {
    if (effectiveAdminMode) return null;
    return subdomain;
  }, [effectiveAdminMode, subdomain]);

  const applyRlsConfig = useCallback(async (roleValue: 'general_admin' | 'admin' | 'user', teamId: string | null) => {
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
        config_value: teamId ?? ''
      });

      if (teamError) {
        console.warn('Falha ao configurar team via set_app_config:', teamError);
      }

      console.log('[MultiTenant] applyRlsConfig', { roleValue, teamId, roleError, teamError });
    } catch (error) {
      console.warn('Erro ao configurar RLS no MultiTenantContext:', error);
    }
  }, []);

  const loadTeamBySlug = async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('Erro ao buscar team por slug:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao carregar team:', error);
      return null;
    }
  };

  const refreshTeam = async () => {
    setIsLoading(true);

    if (!effectiveSubdomain || effectiveAdminMode) {
      const roleValue = effectiveAdminMode && isSuperAdmin ? 'general_admin' : 'admin';
      await applyRlsConfig(roleValue, null);
      setCurrentTeam(null);
      setIsLoading(false);
      return;
    }

    const team = await loadTeamBySlug(effectiveSubdomain);
    
    if (team) {
      setCurrentTeam(team);
      console.log('Team carregado com sucesso:', team);
      
      const roleValue: 'user' | 'admin' = isSuperAdmin ? 'admin' : 'user';
      await applyRlsConfig(roleValue, team.id.toString());
    } else {
      setCurrentTeam(null);
      console.log('Nenhum team encontrado para o subdomínio:', effectiveSubdomain);
      
      const roleValue = isSuperAdmin ? 'general_admin' : 'admin';
      await applyRlsConfig(roleValue, null);
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (!subdomainLoading) {
      refreshTeam();
    }
  }, [effectiveSubdomain, effectiveAdminMode, subdomainLoading]);

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