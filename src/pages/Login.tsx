
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { LoginForm } from '@/components/login/LoginForm';
import { ResetPasswordForm } from '@/components/login/ResetPasswordForm';
import { ProgressiveRegistration } from '@/components/ProgressiveRegistration';

const Login = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserSwitcher();
  const [activeTab, setActiveTab] = useState<string>('login');
  
  // Verificar se já está logado e redireciona para a página principal
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
  
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
                <TabsTrigger value="reset">Recuperar</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent className="pt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="login">
                <LoginForm onSetActiveTab={setActiveTab} />
              </TabsContent>
              
              <TabsContent value="register">
                <ProgressiveRegistration />
              </TabsContent>

              <TabsContent value="reset">
                <ResetPasswordForm onSetActiveTab={setActiveTab} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
