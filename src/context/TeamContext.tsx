import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';

interface TeamContextType {
  teamId: string | null;
  setTeamId: (teamId: string | null) => void;
  isLoading: boolean;
  isReady: boolean;
}

const TeamContext = createContext<TeamContextType | undefined>(undefined);

interface TeamProviderProps {
  children: ReactNode;
}

export const TeamProvider: React.FC<TeamProviderProps> = ({ children }) => {
  const [teamId, setTeamIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { subdomain, isLoading: tenantLoading, isAdminMode, currentTeam } = useMultiTenant();

  useEffect(() => {
    const initializeTeamId = async () => {
      try {
        // 1. Verificar se há team_id na URL (prioridade máxima)
        const urlParams = new URLSearchParams(window.location.search);
        const teamFromUrl = urlParams.get('team_id');
        
        if (teamFromUrl) {
          setTeamIdState(teamFromUrl);
          localStorage.setItem('current_team_id', teamFromUrl);
          console.log(`Team ID definido via URL: ${teamFromUrl}`);
          return;
        }

        // 2. Se houver team resolvido pelo multi-tenant, usar esse ID
        if (currentTeam?.id) {
          setTeamIdState(currentTeam.id);
          localStorage.setItem('current_team_id', currentTeam.id);
          console.log(`Team ID definido via contexto multi-tenant: ${currentTeam.id}`);
          return;
        }

        // 3. Se estiver em modo admin, não definir team_id
        if (isAdminMode) {
          setTeamIdState(null);
          localStorage.removeItem('current_team_id');
          console.log('Modo admin: team_id removido');
          return;
        }

        // 4. Se houver subdomínio, buscar o team correspondente
        if (subdomain) {
          const { data: team, error } = await supabase
            .from('teams')
            .select('id')
            .eq('slug', subdomain)
            .single();

          if (team && !error) {
            setTeamIdState(team.id);
            localStorage.setItem('current_team_id', team.id);
            console.log(`Team ID definido via subdomínio ${subdomain}: ${team.id}`);
            return;
          } else {
            console.warn(`Nenhum team encontrado para o subdomínio: ${subdomain}`);
          }
        }

        // 5. Verificar localStorage como fallback
        const savedTeamId = localStorage.getItem('current_team_id');
        if (savedTeamId && savedTeamId !== 'default-team') {
          setTeamIdState(savedTeamId);
          console.log(`Team ID recuperado do localStorage: ${savedTeamId}`);
          return;
        }

        // 6. Em ambiente local sem subdomínio, permitir sem team_id
        const isLocalEnvironment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (isLocalEnvironment) {
          setTeamIdState(null);
          localStorage.removeItem('current_team_id');
          console.log('Ambiente local: operando sem team_id específico');
          return;
        }

        // 7. Último recurso: definir como null
        setTeamIdState(null);
        localStorage.removeItem('current_team_id');
        console.log('Nenhum team_id definido');
        
      } catch (error) {
        console.error('Erro ao inicializar team_id:', error);
        setTeamIdState(null);
      } finally {
        setIsLoading(false);
      }
    };

    // Aguardar o carregamento do subdomínio antes de inicializar
    if (!tenantLoading) {
      initializeTeamId();
    }
  }, [subdomain, tenantLoading, isAdminMode, currentTeam]);

  const setTeamId = (newTeamId: string | null) => {
    setTeamIdState(newTeamId);
    if (newTeamId) {
      localStorage.setItem('current_team_id', newTeamId);
    } else {
      localStorage.removeItem('current_team_id');
    }
  };

  return (
    <TeamContext.Provider value={{ teamId, setTeamId, isLoading, isReady: !isLoading && !!teamId }}>
      {children}
    </TeamContext.Provider>
  );
};

export const useTeam = (): TeamContextType => {
  const context = useContext(TeamContext);
  if (context === undefined) {
    throw new Error('useTeam deve ser usado dentro de um TeamProvider');
  }
  return context;
};

// Hook para verificar se o usuário tem acesso ao team atual
export const useTeamAccess = () => {
  const { teamId } = useTeam();
  
  // Aqui você pode implementar lógica adicional para verificar
  // se o usuário atual tem acesso ao team_id
  const hasAccess = (requiredTeamId?: string) => {
    if (!requiredTeamId) return true;
    return teamId === requiredTeamId;
  };
  
  return { hasAccess, currentTeamId: teamId };
};