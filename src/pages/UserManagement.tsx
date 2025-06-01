import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { RefreshCw, UserPlus, X, User, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ImageUpload from '@/components/ImageUpload';
import { useAuth } from '@/context/AuthContext';

// Interface para perfil do Supabase
interface Profile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  role?: 'admin' | 'restaurant_owner' | 'manager' | 'waiter' | 'chef' | 'delivery_person' | 'customer' | 'visitor' | null;
  avatar_url?: string | null;
}

// Definindo o tipo AppUser para corresponder à estrutura usada no componente
interface AppUser {
  id: string | number; // ID pode ser string (do Supabase) ou número (do mock)
  full_name: string;
  email: string;
  role: 'admin' | 'restaurant_owner' | 'manager' | 'waiter' | 'chef' | 'delivery_person' | 'customer' | 'visitor';
  status: 'active' | 'inactive';
  photo_url: string;
}

// Mock de dados de usuários
const mockUsers: AppUser[] = [
  { id: 1, full_name: 'João Silva', email: 'joao@email.com', role: 'waiter', status: 'active', photo_url: '' },
  { id: 2, full_name: 'Maria Souza', email: 'maria@email.com', role: 'chef', status: 'active', photo_url: '' },
  { id: 3, full_name: 'Carlos Pereira', email: 'carlos@email.com', role: 'customer', status: 'active', photo_url: '' },
  { id: 4, full_name: 'Ana Oliveira', email: 'ana@email.com', role: 'waiter', status: 'inactive', photo_url: '' },
];

// Mock de usuários extras que podem ser "descobertos" ao atualizar
const extraUsers: AppUser[] = [
  { id: 5, full_name: 'Roberto Alves', email: 'roberto@email.com', role: 'customer', status: 'active', photo_url: '' },
  { id: 6, full_name: 'Fernanda Lima', email: 'fernanda@email.com', role: 'chef', status: 'active', photo_url: '' },
];

const UserManagement = () => {
  const { currentUser } = useUserSwitcher();
  const [users, setUsers] = useState<AppUser[]>(mockUsers); // Tipar o estado users
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [extraUsersAdded, setExtraUsersAdded] = useState(false);
  const navigate = useNavigate();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [currentUser2Edit, setCurrentUser2Edit] = useState<any>(null);
  const [newUser, setNewUser] = useState<Omit<AppUser, 'id'> & { password: string }>({
    full_name: '',
    email: '',
    role: 'customer',
    status: 'active',
    photo_url: '',
    password: ''
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
        .from('profiles')
        .select('*');
        
      if (error) {
        console.error('Erro ao buscar usuários do Supabase:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const supabaseUsers: AppUser[] = data.map((user: Profile) => ({
          id: user.id,
          full_name: user.full_name || user.email || 'Nome não disponível',
          email: user.email || 'Email não disponível',
          role: (user.role as AppUser['role']) || 'customer',
          status: 'active' as const,
          photo_url: user.avatar_url || ''
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
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (isEditUserOpen) {
      setCurrentUser2Edit((prev: any) => ({ ...prev, [name]: value }));
    } else {
      setNewUser(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleRoleChange = (value: string) => {
    if (isEditUserOpen) {
      setCurrentUser2Edit((prev: any) => ({ ...prev, role: value }));
    } else {
      setNewUser(prev => ({ ...prev, role: value as AppUser['role'] }));
    }
  };
  
  const handleStatusChange = (value: string) => {
    if (isEditUserOpen) {
      setCurrentUser2Edit((prev: any) => ({ ...prev, status: value }));
    } else {
      setNewUser(prev => ({ ...prev, status: value as AppUser['status'] }));
    }
  };
  
  const handleImageUpload = (url: string) => {
    if (isEditUserOpen) {
      setCurrentUser2Edit((prev: any) => ({ ...prev, photo_url: url }));
    } else {
      setNewUser(prev => ({ ...prev, photo_url: url }));
    }
  };
  
  const handleEditUser = (user: AppUser) => {
    setCurrentUser2Edit(user);
    setIsEditUserOpen(true);
  };
  
  const handleSaveEditUser = async () => {
    if (!currentUser2Edit) return;
    
    try {
      // Tentar atualizar no Supabase
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: currentUser2Edit.full_name,
          email: currentUser2Edit.email,
          role: currentUser2Edit.role,
          avatar_url: currentUser2Edit.photo_url
        })
        .eq('id', currentUser2Edit.id);
        
      if (error) {
        console.error('Erro ao atualizar usuário no Supabase:', error);
        // Continuar com fallback para localStorage
      } else {
        toast({
          title: "Usuário atualizado com sucesso",
          description: `${currentUser2Edit.full_name} foi atualizado.`
        });
        
        fetchUsersFromSupabase();
        setIsEditUserOpen(false);
        setCurrentUser2Edit(null);
        return;
      }
    } catch (error) {
      console.error('Erro ao processar atualização de usuário:', error);
    }
    
    // Fallback para localStorage
    const updatedUsers = users.map(user => 
      user.id === currentUser2Edit.id ? currentUser2Edit : user
    );
    
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    
    toast({
      title: "Usuário atualizado com sucesso",
      description: `${currentUser2Edit.full_name} foi atualizado.`
    });
    
    setIsEditUserOpen(false);
    setCurrentUser2Edit(null);
  };
  
  const handleAddUser = async () => {
    // Validação básica
    if (!newUser.full_name || !newUser.email || !newUser.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }
    
    // Criar usuário usando a autenticação nativa do Supabase
    try {
      // Primeiro, criar o usuário na autenticação
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            role: newUser.role,
            avatar_url: newUser.photo_url
          }
        }
      });
      
      if (authError) {
        console.error('Erro ao criar usuário na autenticação:', authError);
        throw authError;
      }
      
      // Se o usuário foi criado com sucesso, o perfil será criado automaticamente via trigger
      // ou podemos criar manualmente se necessário
      if (authData.user) {
        // Aguardar um pouco para o trigger criar o perfil
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar se o perfil foi criado, se não, criar manualmente
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single();
          
        if (profileError && profileError.code === 'PGRST116') {
          // Perfil não existe, criar manualmente
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              email: newUser.email,
              full_name: newUser.full_name,
              role: newUser.role,
              avatar_url: newUser.photo_url
            });
            
          if (insertError) {
            console.error('Erro ao criar perfil:', insertError);
            throw insertError;
          }
        }
      }
      
      // Se chegou até aqui, o usuário foi criado com sucesso
      console.log('Usuário criado com sucesso na autenticação do Supabase');
      
      toast({
        title: "Usuário adicionado com sucesso",
        description: `${newUser.full_name} foi adicionado ao sistema.`
      });
      
      // Recarregar usuários do Supabase para garantir sincronização
      await fetchUsersFromSupabase();
      setIsAddUserOpen(false);
      setNewUser({
        full_name: '',
        email: '',
        password: '',
        role: 'customer',
        status: 'active',
        photo_url: ''
      });
      return;
    } catch (error) {
      console.error('Erro ao processar adição de usuário:', error);
    }
    
    // Fallback para localStorage se o Supabase falhar
    const newId = Math.max(...users.map(u => typeof u.id === 'number' ? u.id : 0), 0) + 1;
    const userToAdd: AppUser = {
      id: newId,
      full_name: newUser.full_name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      photo_url: newUser.photo_url
    };
    
    const updatedUsers = [...users, userToAdd];
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    
    toast({
      title: "Usuário adicionado com sucesso",
      description: `${newUser.full_name} foi adicionado ao sistema.`
    });
    
    // Limpar o formulário e fechar o modal
    setIsAddUserOpen(false);
    setNewUser({
      full_name: '',
      email: '',
      password: '',
      role: 'customer',
      status: 'active',
      photo_url: ''
    });
  };
  
  const toggleUserStatus = (userId: string | number) => {
    const updatedUsers = users.map(user => {
      if (user.id === userId) {
        const newStatus: AppUser['status'] = user.status === 'active' ? 'inactive' : 'active';
        return { ...user, status: newStatus };
      }
      return user;
    });
    
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));
    
    const user = users.find(u => u.id === userId);
    const newStatus = user?.status === 'active' ? 'inactive' : 'active';
    
    toast({
      title: "Status atualizado",
      description: `${user?.full_name} agora está ${newStatus === 'active' ? 'ativo' : 'inativo'}.`
    });
    
    // Tentar atualizar no Supabase também
    try {
      // Vamos adicionar um campo 'status' na tabela profiles se necessário
      // Por enquanto, mantemos apenas o controle local
      supabase
        .from('profiles')
        .update({ 
          // Se você quiser persistir o status, adicione um campo 'status' na tabela profiles
          // status: newStatus
        })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) {
            console.error('Erro ao atualizar status no Supabase:', error);
          }
        });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
    }
  };

  const handleDeleteUser = async (userId: string | number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // Confirmar exclusão
    if (!window.confirm(`Tem certeza que deseja excluir o usuário ${user.full_name}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      // Para excluir um usuário do Supabase Auth, precisamos usar a API de administração
      // Por enquanto, vamos apenas remover o perfil da tabela profiles
      // Em produção, você deve usar a API de administração do Supabase para deletar o usuário da autenticação
      
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Erro ao excluir perfil do Supabase:', error);
        throw error;
      }
      
      toast({
        title: "Usuário excluído com sucesso",
        description: `${user.full_name} foi removido do sistema.`
      });
      
      // Atualizar a lista de usuários
      await fetchUsersFromSupabase();
      return;
    } catch (error) {
      console.error('Erro ao processar exclusão de usuário:', error);
    }

    // Fallback para localStorage se o Supabase falhar
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem('appUsers', JSON.stringify(updatedUsers));

    toast({
      title: "Usuário excluído com sucesso",
      description: `${user.full_name} foi removido do sistema.`
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
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.photo_url} alt={user.full_name} />
                  <AvatarFallback className="bg-menu-primary text-white">
                    {user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-base">{user.full_name}</CardTitle>
                  <CardDescription className="text-xs">{user.email}</CardDescription>
                </div>
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
                  <Button 
                    className="w-full" 
                    variant={user.status === 'active' ? 'default' : 'outline'}
                    onClick={() => toggleUserStatus(user.id)}
                  >
                    {user.status === 'active' ? 'Desativar' : 'Ativar'}
                  </Button>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleEditUser(user)}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="destructive" 
                      className="flex-1"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  </div>
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
              <Label htmlFor="photo_url">Foto de Perfil</Label>
              <ImageUpload
                onImageUpload={handleImageUpload}
                value={newUser.photo_url}
                label="Selecionar foto de perfil"
                maxSizeInMB={2}
                acceptedFileTypes="image/*"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                name="full_name"
                value={newUser.full_name}
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
            <Button variant="outline" onClick={() => setIsAddUserOpen(false)} type="button">Cancelar</Button>
            <Button onClick={handleAddUser} type="button">Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de Editar Usuário */}
      <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          {currentUser2Edit && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit_photo_url">Foto de Perfil</Label>
                <ImageUpload
                  onImageUpload={handleImageUpload}
                  value={currentUser2Edit.photo_url}
                  label="Selecionar foto de perfil"
                  maxSizeInMB={2}
                  acceptedFileTypes="image/*"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_name">Nome Completo</Label>
                <Input
                  id="edit_name"
                  name="full_name"
                  value={currentUser2Edit.full_name}
                  onChange={handleInputChange}
                  placeholder="Digite o nome completo"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input
                  id="edit_email"
                  name="email"
                  type="email"
                  value={currentUser2Edit.email}
                  onChange={handleInputChange}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit_role">Função</Label>
                <Select value={currentUser2Edit.role} onValueChange={handleRoleChange}>
                  <SelectTrigger id="edit_role">
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
                <Label htmlFor="edit_status">Status</Label>
                <Select value={currentUser2Edit.status} onValueChange={handleStatusChange}>
                  <SelectTrigger id="edit_status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserOpen(false)} type="button">Cancelar</Button>
            <Button onClick={handleSaveEditUser} type="button">Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
