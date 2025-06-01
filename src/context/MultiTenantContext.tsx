import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSubdomain } from '@/hooks/useSubdomain';
import { supabase } from '@/integrations/supabase/client';

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
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se está em ambiente local
  const isLocalEnvironment = React.useMemo(() => {
    const hostname = window.location.hostname;
    return (hostname === 'localhost' || hostname === '127.0.0.1');
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
    if (!subdomain || isAdminMode) {
      setCurrentTeam(null);
      // Finalizar carregamento mesmo sem team em modo admin
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const team = await loadTeamBySlug(subdomain);
    
    if (team) {
      setCurrentTeam(team);
      console.log('Team carregado com sucesso:', team);
      
      // Configurar o team_id no Supabase para RLS
      try {
        const { error } = await supabase.rpc('set_current_team_id', {
          team_id: team.id.toString()
        });
        
        if (error) {
          console.warn('Erro ao configurar team_id no Supabase:', error);
        } else {
          console.log('Team ID configurado no Supabase para RLS:', team.id);
        }
      } catch (error) {
        console.warn('Erro ao configurar team_id no Supabase:', error);
      }
    } else {
      setCurrentTeam(null);
      console.log('Nenhum team encontrado para o subdomínio:', subdomain);
      
      // Limpar o team_id no Supabase para modo admin ou sem team
      try {
        const { error } = await supabase.rpc('set_current_team_id', {
          team_id: ''
        });
        
        if (error) {
          console.warn('Erro ao limpar team_id no Supabase:', error);
        } else {
          console.log('Team ID limpo no Supabase (modo admin ou sem team)');
        }
      } catch (error) {
        console.warn('Erro ao limpar team_id no Supabase:', error);
      }
    }
    
    setIsLoading(false);
  };

  useEffect(() => {
    if (!subdomainLoading) {
      refreshTeam();
    }
  }, [subdomain, isAdminMode, subdomainLoading]);

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
    isLoading: isLocalEnvironment ? false : (subdomainLoading || isLoading), // Forçar isLoading como false em ambiente local
    isAdminMode,
    isClientMode: !isAdminMode && !!subdomain,
    subdomain,
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