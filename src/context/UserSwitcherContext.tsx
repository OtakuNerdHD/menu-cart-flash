
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { CurrentUser } from '@/types/supabase';
import { useMultiTenant } from './MultiTenantContext';
import { useAuth } from './AuthContext';

interface UserSwitcherContextType {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  showUserSwitcher: boolean;
  setShowUserSwitcher: (show: boolean) => void;
  // Adding the missing properties
  switchUser: (role: CurrentUser['role']) => void;
  isUserSwitcherOpen: boolean;
  toggleUserSwitcher: () => void;
  closeUserSwitcher: () => void;
  logout: () => Promise<void>;
}

const UserSwitcherContext = createContext<UserSwitcherContextType | undefined>(undefined);

export const UserSwitcherProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);
  const { isAdminMode, switchToClient, switchToAdmin } = useMultiTenant();
  const { signOut, user: authUser } = useAuth();

  // Carregar usuário do localStorage na inicialização
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUserSwitcher');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
        // Se houver erro, definir usuário visitante como padrão
        setCurrentUser(realUsers.visitor);
      }
    } else {
      // Se não houver usuário salvo, definir visitante como padrão
      setCurrentUser(realUsers.visitor);
    }
  }, []);

  // Usuários reais do sistema
  const realUsers = {
    restaurant_owner: {
      id: 'real-owner-joaby',
      role: 'restaurant_owner' as CurrentUser['role'],
      name: 'Joaby Chaves',
      email: 'joabychaves10@gmail.com',
      avatar_url: null
    },
    admin: {
      id: 'real-admin-joaby',
      role: 'admin' as CurrentUser['role'],
      name: 'Joaby Chaves',
      email: 'testhabboo@gmail.com',
      avatar_url: null
    },
    chef: {
      id: 'real-chef-milly',
      role: 'chef' as CurrentUser['role'],
      name: 'Milly Gueno',
      email: 'euguenoo@gmail.com',
      avatar_url: null
    },
    waiter: {
      id: 'real-waiter-milly',
      role: 'waiter' as CurrentUser['role'],
      name: 'Milly Safadinha',
      email: 'myllyzinhasafadinhadojob@gmail.com',
      avatar_url: null
    },
    customer: {
      id: 'real-customer-lucad',
      role: 'customer' as CurrentUser['role'],
      name: 'Lucad Teste',
      email: 'xdroidbr1021@gmail.com',
      avatar_url: null
    },
    visitor: {
      id: 'visitor-default',
      role: 'visitor' as CurrentUser['role'],
      name: 'Visitante',
      email: 'visitor@example.com',
      avatar_url: null
    }
  };

  // Function to switch user based on role
  const switchUser = (role: CurrentUser['role']) => {
    // Usar usuários reais baseados no papel
    const selectedUser = realUsers[role];
    
    if (selectedUser) {
      setCurrentUser(selectedUser);
      
      // Salvar no localStorage para persistir após refresh
      localStorage.setItem('currentUserSwitcher', JSON.stringify(selectedUser));
      
      closeUserSwitcher();
      
      // Nota: A lógica de modo admin agora é controlada pelo useSubdomain
      // baseada na autenticação real do usuário, não pelo user switcher
    }
  };

  // Toggle user switcher menu
  const toggleUserSwitcher = () => {
    setIsUserSwitcherOpen(prev => !prev);
  };

  // Close user switcher menu
  const closeUserSwitcher = () => {
    setIsUserSwitcherOpen(false);
  };
  
  // Função de logout
  const logout = async () => {
    try {
      // Chamar o signOut do AuthContext
      await signOut();
      
      // Resetar para usuário visitante
      const visitorUser = realUsers.visitor;
      setCurrentUser(visitorUser);
      
      // Limpar localStorage
      localStorage.removeItem('currentUserSwitcher');
      localStorage.setItem('currentUserSwitcher', JSON.stringify(visitorUser));
      
      // Se estiver em modo admin, manter o modo admin mas com usuário visitante
      if (!isAdminMode) {
        switchToClient('cliente1');
      }
      
      closeUserSwitcher();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <UserSwitcherContext.Provider 
      value={{ 
        currentUser, 
        setCurrentUser, 
        showUserSwitcher, 
        setShowUserSwitcher,
        switchUser,
        isUserSwitcherOpen,
        toggleUserSwitcher,
        closeUserSwitcher,
        logout
      }}
    >
      {children}
    </UserSwitcherContext.Provider>
  );
};

export const useUserSwitcher = () => {
  const context = useContext(UserSwitcherContext);
  
  if (context === undefined) {
    throw new Error('useUserSwitcher must be used within a UserSwitcherProvider');
  }
  
  return context;
};
