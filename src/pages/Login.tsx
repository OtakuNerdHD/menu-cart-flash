
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { supabase } from '@/integrations/supabase/client';
import { CurrentUser } from '@/types/supabase';
import ProgressiveRegistration from '@/components/ProgressiveRegistration';

interface LoginFormState {
  email: string;
  password: string;
}

const Login = () => {
  const navigate = useNavigate();
  const { setCurrentUser, currentUser } = useUserSwitcher();
  const [activeTab, setActiveTab] = useState<string>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState<LoginFormState>({
    email: '',
    password: ''
  });
  
  // Verifica se já está logado e redireciona para a página principal
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Tentativa de login com Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password
      });
      
      if (error) throw error;
      
      // Buscar dados adicionais do usuário
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
        
      // Criar usuário para o contexto da aplicação
      const user: CurrentUser = {
        id: data.user.id,
        role: profileData?.role || 'customer',
        name: profileData?.name || data.user.email?.split('@')[0] || 'Usuário',
        email: data.user.email || '',
        avatar_url: profileData?.avatar_url || null
      };
      
      setCurrentUser(user);
      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo ao sistema!",
      });
      navigate('/');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    
    try {
      // Abrir janela de login Google para seleção de conta
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account'
          }
        }
      });
      
      if (error) throw error;
      
      toast({
        title: "Autenticando com Google",
        description: "Você será redirecionado...",
      });
    } catch (error: any) {
      console.error('Erro ao fazer login com Google:', error);
      toast({
        title: "Erro ao autenticar com Google",
        description: error.message || "Não foi possível fazer login com o Google. Tente novamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-menu-primary">Cardápio<span className="text-menu-accent">Digital</span></h1>
          <p className="text-gray-500 mt-2">Seja bem-vindo ao nosso sistema. Faça login para continuar.</p>
        </div>
        
        <Card>
          <CardHeader>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="login">
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
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <ProgressiveRegistration />
              </TabsContent>
            </Tabs>
            
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
              disabled={isLoading || activeTab === 'register'}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="h-4 w-4 mr-2" />
              Google
            </Button>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              {activeTab === 'login' ? (
                <span>Não tem uma conta? <Button variant="link" className="p-0" onClick={() => setActiveTab('register')}>Cadastre-se</Button></span>
              ) : (
                <span>Já tem uma conta? <Button variant="link" className="p-0" onClick={() => setActiveTab('login')}>Fazer login</Button></span>
              )}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
