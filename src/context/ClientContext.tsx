import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSubdomain, isAdminMode } from '@/utils/getSubdomain';
import { supabase } from '@/integrations/supabase/client';

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
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

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
    const currentSubdomain = getSubdomain();
    const currentAdminMode = isAdminMode();
    
    setSubdomain(currentSubdomain);
    setAdminMode(currentAdminMode);
    
    if (currentAdminMode) {
      // Modo admin - não carregar cliente específico
      console.log('Modo admin ativado - não carregando cliente específico');
      setClient(null);
      setError(null);
      setIsLoading(false);
    } else if (currentSubdomain) {
      // Modo cliente - carregar dados do cliente
      fetchClient(currentSubdomain);
    } else {
      // Sem subdomínio e não é modo admin - erro
      setError('Subdomínio não detectado');
      setClient(null);
      setIsLoading(false);
    }
  }, []);

  const value: ClientContextType = {
    client,
    isLoading,
    error,
    isAdminMode: adminMode,
    subdomain,
    refetchClient
  };

  return (
    <ClientContext.Provider value={value}>
      {children}
    </ClientContext.Provider>
  );
};