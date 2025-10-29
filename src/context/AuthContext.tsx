import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';

export interface Profile { // Adicionado export
  id: string;
  email: string;
  role: string;
  full_name?: string;
  avatar_url?: string;
  status?: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  currentUser: Profile | null;
  loading: boolean;
  isSuperAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signInWithGoogle: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  setCurrentUser: (user: Profile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SUPER_ADMIN_EMAILS = (import.meta.env.VITE_SUPER_ADMIN_EMAILS ?? 'joabychaves10@gmail.com')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

// Função para determinar o redirect URL correto baseado no ambiente e subdomínio
const getRedirectUrl = (): string => {
  const { origin, hostname, protocol } = window.location;

  // Ambiente local (localhost ou 127.0.0.1)
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${origin}/auth/callback`;
  }

  // Ambiente de desenvolvimento Netlify (ex: delliapp.netlify.app)
  if (hostname.endsWith('netlify.app')) {
    return `${origin}/auth/callback`;
  }

  // Produção - delliapp.com.br com subdomínios (tld .com.br)
  const parts = hostname.split('.');
  const isDelliappDomain =
    parts.length >= 3 &&
    parts[parts.length - 3] === 'delliapp' &&
    parts[parts.length - 2] === 'com' &&
    parts[parts.length - 1] === 'br';

  if (isDelliappDomain) {
    return `${protocol}//${hostname}/auth/callback`;
  }

  // Fallback para o domínio atual (caso geral ou configuração não prevista)
  return `${origin}/auth/callback`;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const emailFromUser = user?.email?.toLowerCase();
    const emailFromProfile = currentUser?.email?.toLowerCase();
    const resolvedEmail = emailFromUser || emailFromProfile;
    setIsSuperAdmin(resolvedEmail ? SUPER_ADMIN_EMAILS.includes(resolvedEmail) : false);
  }, [user, currentUser]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Renomeada para clareza e para retornar a sessão ou nulo
    const initializeSession = async (): Promise<User | null> => {
      try {
        console.log('Inicializando sessão (initializeSession)...');
        const { data: { session: activeSession }, error } = await supabase.auth.getSession();

        if (!isMounted) return null;

        if (error) {
          console.error('Erro ao obter sessão (initializeSession):', error);
          setUser(null);
          setCurrentUser(null);
          return null;
        }

        if (activeSession?.user) {
          console.log('Sessão ativa encontrada (initializeSession):', activeSession.user.id);
          setUser(activeSession.user);
          await fetchUserProfile(activeSession.user.id); // fetchUserProfile agora não mexe no loading global
          // Lógica de refresh de token pode ser adicionada aqui se necessário
          return activeSession.user;
        } else {
          console.log('Nenhuma sessão ativa ou usuário na sessão (initializeSession).');
          setUser(null);
          setCurrentUser(null);
          return null;
        }
      } catch (e) {
        console.error("Erro em initializeSession:", e);
        if (isMounted) {
          setUser(null);
          setCurrentUser(null);
        }
        return null;
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      console.log('Evento de autenticação:', event, session?.user?.id);

      // INITIAL_SESSION é tratado pela chamada inicial a initializeSession().
      // O listener aqui principalmente reage a mudanças *após* a inicialização.
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }
        // O loading principal é tratado por initializeSession
        // Se uma sessão é estabelecida DEPOIS do load inicial, setLoading(false) pode ser necessário
        // mas geralmente o fluxo de login/refresh já implica uma interface de usuário ativa.
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setCurrentUser(null);
        setLoading(false); // Importante para indicar que o estado de não autenticado é final.
      } else if (event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
        }
      }
    });

    initializeSession().finally(() => {
      if (isMounted) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single<Profile>(); // Adiciona a tipagem explícita aqui

      if (error) {
        console.error('Erro ao buscar perfil:', error);
        setCurrentUser(null); // Limpa o usuário em caso de erro
        return;
      }

      if (data) {
        setCurrentUser(data); // Agora 'data' deve estar corretamente tipado
      } else {
        setCurrentUser(null); // Caso data seja null
      }
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      setCurrentUser(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const redirectUrl = getRedirectUrl();
      console.log('Redirecionando Google OAuth para:', redirectUrl);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) {
      return { error: 'Usuário não autenticado' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (!error) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value: AuthContextType = {
    user,
    currentUser,
    loading,
    isSuperAdmin,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    setCurrentUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};