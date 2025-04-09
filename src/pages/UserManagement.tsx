
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

// Mock de dados de usuários
const mockUsers = [
  { id: 1, name: 'João Silva', email: 'joao@email.com', role: 'waiter', status: 'active' },
  { id: 2, name: 'Maria Souza', email: 'maria@email.com', role: 'chef', status: 'active' },
  { id: 3, name: 'Carlos Pereira', email: 'carlos@email.com', role: 'customer', status: 'active' },
  { id: 4, name: 'Ana Oliveira', email: 'ana@email.com', role: 'waiter', status: 'inactive' },
];

// Mock de usuários extras que podem ser "descobertos" ao atualizar
const extraUsers = [
  { id: 5, name: 'Roberto Alves', email: 'roberto@email.com', role: 'customer', status: 'active' },
  { id: 6, name: 'Fernanda Lima', email: 'fernanda@email.com', role: 'chef', status: 'active' },
];

const UserManagement = () => {
  const { currentUser } = useUserSwitcher();
  const [users, setUsers] = useState(mockUsers);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [extraUsersAdded, setExtraUsersAdded] = useState(false);
  const navigate = useNavigate();
  
  const isAdminOrOwner = currentUser?.role === 'admin' || currentUser?.role === 'restaurant_owner';

  useEffect(() => {
    // Carregar usuários do localStorage se existirem
    const storedUsers = localStorage.getItem('appUsers');
    if (storedUsers) {
      try {
        setUsers(JSON.parse(storedUsers));
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
      }
    }
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    
    // Simular uma requisição para atualizar os usuários
    setTimeout(() => {
      if (!extraUsersAdded) {
        // Adicionar usuários extras apenas na primeira atualização
        const updatedUsers = [...users, ...extraUsers];
        setUsers(updatedUsers);
        setExtraUsersAdded(true);
        
        // Salvar no localStorage para persistência
        localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
        
        toast({
          title: "Lista de usuários atualizada",
          description: "Foram encontrados 2 novos usuários no sistema."
        });
      } else {
        toast({
          title: "Lista de usuários atualizada",
          description: "Nenhum novo usuário encontrado."
        });
      }
      
      setIsRefreshing(false);
    }, 800);
  };

  if (!isAdminOrOwner) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Acesso restrito</CardTitle>
              <CardDescription>
                Você não tem permissão para acessar esta página
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Esta página é destinada apenas para administradores ou proprietários do restaurante.
              </p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Voltar para o início
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
            <Button 
              size="icon"
              variant="outline"
              onClick={handleRefresh}
              className="rounded-full h-8 w-8"
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button onClick={() => navigate('/')}>
            Voltar para o menu
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <Card key={user.id}>
              <CardHeader>
                <CardTitle>{user.name}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Função:</span>
                    <span className="font-medium">{
                      user.role === 'admin' ? 'Administrador' :
                      user.role === 'restaurant_owner' ? 'Proprietário' :
                      user.role === 'waiter' ? 'Garçom' :
                      user.role === 'chef' ? 'Chef' : 'Cliente'
                    }</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className={`font-medium ${user.status === 'active' ? 'text-green-500' : 'text-red-500'}`}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <Button className="w-full" variant={user.status === 'active' ? 'default' : 'outline'}>
                    {user.status === 'active' ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button variant="outline" className="w-full">
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
