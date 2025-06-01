
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface LoginFormProps {
  onSetActiveTab: (tab: string) => void;
}

interface LoginFormState {
  email: string;
  password: string;
}

export const LoginForm = ({ onSetActiveTab }: LoginFormProps) => {
  const navigate = useNavigate();
  const { signIn, signInWithGoogle } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: '',
    password: ''
  });
  
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação básica
    if (!loginForm.email || !loginForm.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha email e senha.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    console.log('Tentando fazer login com:', loginForm.email);
    
    try {
      const { error } = await signIn(loginForm.email, loginForm.password);
      
      if (error) {
        console.error('Erro no login:', error);
        let errorMessage = "Verifique suas credenciais e tente novamente.";
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = "Email ou senha incorretos.";
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = "Por favor, confirme seu email antes de fazer login.";
        } else if (error.message.includes('Too many requests')) {
          errorMessage = "Muitas tentativas de login. Aguarde alguns minutos.";
        }
        
        toast({
          title: "Erro ao fazer login",
          description: errorMessage,
          variant: "destructive"
        });
      } else {
        console.log('Login realizado com sucesso');
        toast({
          title: "Login realizado com sucesso",
          description: "Bem-vindo ao sistema!",
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Erro inesperado ao fazer login:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      const { error } = await signInWithGoogle();
      
      if (error) {
        console.error('Erro no login com Google:', error);
        toast({
          title: "Erro ao autenticar com Google",
          description: error.message || "Não foi possível fazer login com o Google. Tente novamente.",
          variant: "destructive"
        });
        setIsLoading(false);
      } else {
        toast({
          title: "Autenticando com Google",
          description: "Você será redirecionado...",
        });
      }
    } catch (error: any) {
      console.error('Erro inesperado ao fazer login com Google:', error);
      toast({
        title: "Erro ao autenticar com Google",
        description: error.message || "Não foi possível fazer login com o Google. Tente novamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              id="login-email"
              name="email"
              type="email"
              placeholder="seu@email.com"
              className="pl-10"
              value={loginForm.email}
              onChange={handleLoginChange}
              required
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="login-password">Senha</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <Input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="pl-10"
              value={loginForm.password}
              onChange={handleLoginChange}
              required
              disabled={isLoading}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : "Entrar"}
        </Button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gray-300"></span>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-card px-2 text-sm text-gray-500">Ou continue com</span>
        </div>
      </div>
      
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
        disabled={isLoading}
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4 mr-2" />
        Google
      </Button>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-500">
          Não tem uma conta? <Button variant="link" className="p-0" onClick={() => onSetActiveTab('register')}>Cadastre-se</Button>
        </p>
      </div>
    </div>
  );
};
