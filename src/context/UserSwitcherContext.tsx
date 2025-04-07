
import React, { createContext, useContext, useState, useEffect } from 'react';
import { type CurrentUser } from '@/types/supabase';
import { toast } from "@/components/ui/use-toast";

// Definindo os tipos do contexto
type UserSwitcherContextType = {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void; // Adicionando esta propriedade
  switchUser: (role: CurrentUser['role']) => void;
  isUserSwitcherOpen: boolean;
  toggleUserSwitcher: () => void;
  closeUserSwitcher: () => void;
};

// Criando o contexto
const UserSwitcherContext = createContext<UserSwitcherContextType | undefined>(undefined);

// Lista de usuários mock para testes/desenvolvimento
const mockUsers: Record<string, CurrentUser> = {
  admin: {
    id: 'admin-id',
    role: 'admin',
    name: 'Admin',
    email: 'admin@example.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin'
  },
  restaurant_owner: {
    id: 'owner-id',
    role: 'restaurant_owner',
    name: 'Dono do Restaurante',
    email: 'owner@example.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner'
  },
  waiter: {
    id: 'waiter-id',
    role: 'waiter',
    name: 'Garçom',
    email: 'waiter@example.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=waiter'
  },
  chef: {
    id: 'chef-id',
    role: 'chef',
    name: 'Chef',
    email: 'chef@example.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chef'
  },
  delivery_person: {
    id: 'delivery-id',
    role: 'delivery_person',
    name: 'Entregador',
    email: 'delivery@example.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=delivery'
  },
  customer: {
    id: 'customer-id',
    role: 'customer',
    name: 'Cliente',
    email: 'customer@example.com',
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=customer'
  },
  visitor: {
    id: 'visitor-id',
    role: 'visitor',
    name: 'Visitante',
    email: null,
    avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=visitor'
  }
};

// Provider Component
export const UserSwitcherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    // Tentar recuperar do localStorage
    const savedUser = localStorage.getItem('currentUser');
    return savedUser ? JSON.parse(savedUser) : mockUsers.visitor;
  });
  
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  // Salvar no localStorage quando mudar
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  const switchUser = (role: CurrentUser['role']) => {
    const newUser = mockUsers[role];
    if (newUser) {
      setCurrentUser(newUser);
      toast({
        title: "Usuário alterado",
        description: `Agora você está usando o perfil: ${newUser.name}`,
      });
      closeUserSwitcher();
    }
  };

  const toggleUserSwitcher = () => {
    setIsUserSwitcherOpen(prev => !prev);
  };

  const closeUserSwitcher = () => {
    setIsUserSwitcherOpen(false);
  };

  return (
    <UserSwitcherContext.Provider value={{ 
      currentUser, 
      setCurrentUser, // Exportando a função setCurrentUser
      switchUser, 
      isUserSwitcherOpen, 
      toggleUserSwitcher, 
      closeUserSwitcher 
    }}>
      {children}
    </UserSwitcherContext.Provider>
  );
};

// Custom hook para usar o contexto
export const useUserSwitcher = () => {
  const context = useContext(UserSwitcherContext);
  if (context === undefined) {
    throw new Error('useUserSwitcher deve ser usado dentro de um UserSwitcherProvider');
  }
  return context;
};
