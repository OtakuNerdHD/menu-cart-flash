
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CurrentUser } from '@/types/supabase';

interface UserSwitcherContextType {
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;
  showUserSwitcher: boolean;
  setShowUserSwitcher: (show: boolean) => void;
}

const UserSwitcherContext = createContext<UserSwitcherContextType | undefined>(undefined);

export const UserSwitcherProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);

  return (
    <UserSwitcherContext.Provider 
      value={{ 
        currentUser, 
        setCurrentUser, 
        showUserSwitcher, 
        setShowUserSwitcher 
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
