
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubdomain } from '@/hooks/useSubdomain';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { subdomain, isAdminMode } = useSubdomain();

  useEffect(() => {
    if (!loading) {
      if (user) {
        // Usuário autenticado com sucesso
        console.log('Usuário autenticado via callback:', user.id);
        navigate('/');
      } else {
        // Falha na autenticação
        console.log('Falha na autenticação via callback');
        navigate('/login');
      }
    }
  }, [user, loading, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-lg">Processando autenticação...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
