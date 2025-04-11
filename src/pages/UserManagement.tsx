
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { RefreshCw, UserPlus, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from "@/integrations/supabase/client";

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
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    status: 'active'
  });
  
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
    
    // Se temos Supabase conectado, buscar usuários de lá também
    fetchUsersFromSupabase();
  }, []);
  
  const fetchUsersFromSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*');
        
      if (error) {
        console.error('Erro ao buscar usuários do Supabase:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Transformar dados do Supabase para o formato esperado pela UI
        const supabaseUsers = data.map(user => ({
          id: user.id,
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          role: user.role,
          status: 'active'  // Assumindo que todos estão ativos por padrão
        }));
        
        setUsers(supabaseUsers);
        localStorage.setItem('appUsers', JSON.stringify(supabaseUsers));
      }
    } catch (error) {
      console.error('Erro ao processar dados do Supabase:', error);
    }
  };

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
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };
  
  const handleRoleChange = (value) => {
    setNewUser(prev => ({ ...prev, role: value }));
  };
  
  const handleStatusChange = (value) => {
    setNewUser(prev => ({ ...prev, status: value }));
  };
  
  const handleAddUser = async () => {
    // Validação básica
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    // Tente adicionar ao Supabase primeiro
    try {
      // Dividir nome e sobrenome
      const nameParts = newUser.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      const { data, error } = await supabase
        .from('users')
        .insert([
          {
            first_name: firstName,
            last_name: lastName,
            email: newUser.email,
            password: newUser.password, // Nota: em um sistema real, a senha seria hasheada
            role: newUser.role,
            username: newUser.email // Usando email como username por padrão
          }
        ])
        .select();
        
      if (error) {
        console.error('Erro ao adicionar usuário ao Supabase:', error);
        // Continua com o fallback para localStorage
      } else if (data) {
        toast({
          title: "Usuário adicionado com sucesso",
          description: `${newUser.name} foi adicionado ao sistema.`
        });
        
        // Atualizar a lista de usuários
        fetchUsersFromSupabase();
        setIsAddUserOpen(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'customer',
          status: 'active'
        });
        return;
      }
    } catch (error) {
      console.error('Erro ao processar adição de usuário:', error);
    }
    
    // Fallback para localStorage se o Supabase falhar
    const newId = Math.max(...users.map(u => u.id), 0) + 1;
    const userToAdd = {
      id: newId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status
    };
    
    const updatedUsers = [...users, userToAdd];
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    
    toast({
      title: "Usuário adicionado com sucesso",
      description: `${newUser.name} foi adicionado ao sistema.`
    });
    
    // Limpar o formulário e fechar o modal
    setIsAddUserOpen(false);
    setNewUser({
      name: '',
      email: '',
      password: '',
      role: 'customer',
      status: 'active'
    });
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
          <div className="flex gap-2">
            <Button onClick={() => setIsAddUserOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" /> Adicionar Usuário
            </Button>
            <Button variant="outline" onClick={() => navigate('/')}>
              Voltar para o menu
            </Button>
          </div>
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
      
      {/* Modal de Adicionar Usuário */}
      <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adicionar Novo Usuário</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                name="name"
                value={newUser.name}
                onChange={handleInputChange}
                placeholder="Digite o nome completo"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={newUser.email}
                onChange={handleInputChange}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={newUser.password}
                onChange={handleInputChange}
                placeholder="Digite a senha"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Função</Label>
              <Select value={newUser.role} onValueChange={handleRoleChange}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrador</SelectItem>
                  <SelectItem value="restaurant_owner">Proprietário</SelectItem>
                  <SelectItem value="chef">Chef</SelectItem>
                  <SelectItem value="waiter">Garçom</SelectItem>
                  <SelectItem value="customer">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={newUser.status} onValueChange={handleStatusChange}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddUser}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
