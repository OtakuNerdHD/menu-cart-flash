
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const processCallback = async () => {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.startsWith('#') ? url.hash.substring(1) : url.hash);
      const searchParams = url.searchParams;

      try {
        // 1) Fluxos que retornam access_token/refresh_token no hash (ex.: OAuth, magic link)
        if (hashParams.has('access_token')) {
          const access_token = hashParams.get('access_token') ?? '';
          const refresh_token = hashParams.get('refresh_token') ?? '';
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });

          if (error) {
            console.error('Erro ao configurar sessão via hash:', error);
            toast({
              title: 'Falha ao autenticar',
              description: error.message ?? 'Não foi possível validar sua sessão. Tente novamente.',
              variant: 'destructive'
            });
            navigate('/login');
            return;
          }

          // Limpa o hash da URL
          url.hash = '';
          window.history.replaceState({}, document.title, url.toString());
        }

        // 2) Fluxo de confirmação de e-mail / alteração (token + type + email)
        if (searchParams.has('token') || searchParams.has('token_hash')) {
          const token = searchParams.get('token') ?? searchParams.get('token_hash');
          const type = (searchParams.get('type') ?? 'signup') as 'signup' | 'recovery' | 'email_change';
          const email = searchParams.get('email');

          if (!email || !token) {
            toast({
              title: 'Link inválido ou expirado',
              description: 'Requisite um novo e-mail de confirmação e tente novamente.',
              variant: 'destructive'
            });
            navigate('/login');
            return;
          }

          const { error } = await supabase.auth.verifyOtp({ email, token, type });

          if (error) {
            console.error('Erro ao verificar token OTP:', error);
            toast({
              title: 'Não foi possível confirmar o e-mail',
              description: error.message ?? 'Solicite um novo link de confirmação.',
              variant: 'destructive'
            });
            navigate('/login');
            return;
          }

          // Após confirmação, remover query params da URL
          url.search = '';
          window.history.replaceState({}, document.title, url.toString());

          toast({
            title: 'E-mail confirmado com sucesso',
            description: 'Agora você já pode acessar sua conta.',
          });
        }
      } finally {
        setProcessing(false);
      }
    };

    processCallback();
  }, [navigate]);

  useEffect(() => {
    if (!processing && !loading) {
      if (user) {
        navigate('/');
      } else {
        navigate('/login');
      }
    }
  }, [user, loading, processing, navigate]);

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
