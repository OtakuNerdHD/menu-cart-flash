import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * Hook para detectar e gerenciar subdomínios multi-tenant
 * Extrai o slug do cliente do subdomínio (ex: cliente1.delliapp.com.br)
 */
export const useSubdomain = () => {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    const detectSubdomain = () => {
      try {
        const hostname = window.location.hostname;
        
        // Verificar se é localhost (desenvolvimento)
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          // Em ambiente local, verificar parâmetro da URL para permitir alternância
          const urlParams = new URLSearchParams(window.location.search);
          const clientParam = urlParams.get('client');
          
          if (clientParam) {
            setSubdomain(clientParam);
            setIsAdminMode(false);
            console.log(`Ambiente local: modo cliente ativado para ${clientParam}`);
          } else {
            setSubdomain(null);
            // Em ambiente local, verificar se usuário é admin para ativar modo admin
            const isUserAdmin = currentUser?.role === 'admin';
            setIsAdminMode(isUserAdmin);
            console.log(`Ambiente local: modo admin ${isUserAdmin ? 'ativado' : 'desativado'} - usuário ${isUserAdmin ? 'é' : 'não é'} admin`);
          }
        } else {
          // Produção: extrair subdomínio
          const parts = hostname.split('.');
          
          // Se for app.delliapp.com.br (domínio raiz admin)
          if (parts.length === 4 && parts[0] === 'app' && parts[1] === 'delliapp' && parts[2] === 'com' && parts[3] === 'br') {
            setSubdomain(null);
            // Ativar modo admin APENAS se usuário tem role 'admin'
            const isUserAdmin = currentUser?.role === 'admin';
            setIsAdminMode(isUserAdmin);
            console.log(`Produção: app.delliapp.com.br - modo admin ${isUserAdmin ? 'ativado' : 'desativado'} - usuário ${isUserAdmin ? 'é' : 'não é'} admin`);
          }
          // Se for cliente.delliapp.com.br, extrair o cliente
          else if (parts.length === 4 && parts[1] === 'delliapp' && parts[2] === 'com' && parts[3] === 'br' && parts[0] !== 'app') {
            const clientSlug = parts[0];
            setSubdomain(clientSlug);
            setIsAdminMode(false);
            console.log(`Produção: modo cliente ativado para ${clientSlug}.delliapp.com.br`);
          }
          // Caso contrário, assumir modo cliente
          else {
            setSubdomain(null);
            setIsAdminMode(false);
          }
        }
      } catch (error) {
        console.error('Erro ao detectar subdomínio:', error);
        // Em caso de erro, assumir modo cliente
        setSubdomain(null);
        setIsAdminMode(false);
      }
    };

    // Aguardar o carregamento da autenticação antes de detectar subdomínio
    if (!authLoading) {
      detectSubdomain();
      setIsLoading(false);
    }
  }, [authLoading, currentUser]); // Dependência do estado de autenticação

  const switchToClient = (clientSlug: string) => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Em desenvolvimento, usar parâmetro da URL
      const url = new URL(window.location.href);
      url.searchParams.set('client', clientSlug);
      window.location.href = url.toString();
    } else {
      // Em produção, redirecionar para o subdomínio
      window.location.href = `https://${clientSlug}.delliapp.com.br`;
    }
  };

  const switchToAdmin = () => {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Em desenvolvimento, remover parâmetro da URL
      const url = new URL(window.location.href);
      url.searchParams.delete('client');
      window.location.href = url.toString();
    } else {
      // Em produção, redirecionar para o domínio raiz admin
      window.location.href = 'https://app.delliapp.com.br';
    }
  };

  return {
    subdomain,
    isLoading,
    isAdminMode,
    isClientMode: !isAdminMode && !!subdomain,
    switchToClient,
    switchToAdmin
  };
};