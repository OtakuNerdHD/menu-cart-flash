import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';

interface Client {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  domain?: string;
  settings?: any;
  is_active?: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

interface ClientContextType {
  client: Client | null;
  isLoading: boolean;
  error: string | null;
  isAdminMode: boolean;
  subdomain: string | null;
  refetchClient: () => Promise<void>;
}

const ClientContext = createContext<ClientContextType | undefined>(undefined);

export const useClient = () => {
  const context = useContext(ClientContext);
  if (context === undefined) {
    throw new Error('useClient deve ser usado dentro de um ClientProvider');
  }
  return context;
};

interface ClientProviderProps {
  children: ReactNode;
}

export const ClientProvider: React.FC<ClientProviderProps> = ({ children }) => {
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { subdomain, isAdminMode, isLoading: tenantLoading } = useMultiTenant();

  const fetchClient = async (slug: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`Buscando cliente com slug: ${slug}`);
      
      const { data, error: supabaseError } = await supabase
        .from('teams')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single() as { data: Client | null; error: any };
      
      if (supabaseError) {
        console.error('Erro ao buscar cliente:', supabaseError);
        
        if (supabaseError.code === 'PGRST116') {
          setError(`Cliente "${slug}" não encontrado ou inativo`);
        } else {
          setError('Erro ao carregar dados do cliente');
        }
        
        setClient(null);
        return;
      }
      
      if (!data) {
        setError(`Cliente "${slug}" não encontrado`);
        setClient(null);
        return;
      }
      
      console.log('Cliente encontrado:', data);
      setClient(data);
      setError(null);
      
    } catch (err) {
      console.error('Erro inesperado ao buscar cliente:', err);
      setError('Erro inesperado ao carregar cliente');
      setClient(null);
    } finally {
      setIsLoading(false);
    }
  };

  const refetchClient = async () => {
    if (subdomain) {
      await fetchClient(subdomain);
    }
  };

  useEffect(() => {
    if (tenantLoading) {
      return;
    }

    if (isAdminMode || !subdomain) {
      console.log('Modo admin ou sem subdomínio - não carregando cliente específico');
      setClient(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    fetchClient(subdomain);
  }, [tenantLoading, subdomain, isAdminMode]);

  const value: ClientContextType = {
    client,
    isLoading,
    error,
    isAdminMode,
    subdomain,
    refetchClient
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};