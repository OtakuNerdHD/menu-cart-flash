import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useSubdomain } from '@/hooks/useSubdomain';
import { toast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, currentUser } = useAuth();
  const { isAdminMode, isClientMode, switchToClientMode, switchToAdminMode } = useSubdomain();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Aguardar um pouco para garantir que a autenticação foi processada
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (user && currentUser) {
          // Determinar o redirecionamento baseado no role do usuário
          const userRole = currentUser.role;
          
          if (userRole === 'admin' || userRole === 'restaurant_owner') {
            // Usuários admin/restaurant_owner devem ir para o modo admin
            if (!isAdminMode) {
              switchToAdminMode();
              return; // O redirecionamento será feito pelo switchToAdminMode
            }
          } else {
            // Usuários customer/driver devem ir para o modo cliente
            if (!isClientMode) {
              switchToClientMode();
              return; // O redirecionamento será feito pelo switchToClientMode
            }
          }

          // Se já estamos no modo correto, navegar para a home
          toast({
            title: "Login realizado com sucesso",
            description: `Bem-vindo, ${currentUser.full_name || currentUser.email}!`,
          });
          
          navigate('/', { replace: true });
        } else {
          // Se não há usuário autenticado, redirecionar para login
          toast({
            title: "Erro na autenticação",
            description: "Não foi possível completar o login. Tente novamente.",
            variant: "destructive"
          });
          
          navigate('/login', { replace: true });
        }
      } catch (error) {
        console.error('Erro no callback de autenticação:', error);
        
        toast({
          title: "Erro na autenticação",
          description: "Ocorreu um erro durante o processo de login.",
          variant: "destructive"
        });
        
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [user, currentUser, navigate, isAdminMode, isClientMode, switchToAdminMode, switchToClientMode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Finalizando autenticação...</h2>
        <p className="text-gray-600">Aguarde enquanto redirecionamos você.</p>
      </div>
    </div>
  );
};

export default AuthCallback;