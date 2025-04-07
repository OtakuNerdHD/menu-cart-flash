
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, Upload, User, Eye, EyeOff } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface UserFormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  role: 'admin' | 'restaurant_owner' | 'waiter' | 'chef' | 'delivery_person' | 'customer';
  avatarUrl: string | null;
}

// Lista de usuários fictícia
const initialUsers = [
  {
    id: '1',
    firstName: 'João',
    lastName: 'Silva',
    email: 'joao@exemplo.com',
    phone: '(11) 98765-4321',
    role: 'admin',
    avatarUrl: null
  },
  {
    id: '2',
    firstName: 'Maria',
    lastName: 'Oliveira',
    email: 'maria@exemplo.com',
    phone: '(11) 91234-5678',
    role: 'chef',
    avatarUrl: null
  },
  {
    id: '3',
    firstName: 'Pedro',
    lastName: 'Santos',
    email: 'pedro@exemplo.com',
    phone: '(11) 99876-5432',
    role: 'waiter',
    avatarUrl: null
  }
];

const UserManagement = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserSwitcher();
  const [users, setUsers] = useState(initialUsers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentUser2, setCurrentUser2] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formState, setFormState] = useState<UserFormState>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    avatarUrl: null
  });
  
  // Verifica se o usuário tem permissão
  const isAdminOrOwner = ['admin', 'restaurant_owner'].includes(currentUser?.role || '');

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
                Esta página é destinada apenas para administradores e proprietários.
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
  
  const resetForm = () => {
    setFormState({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
      avatarUrl: null
    });
  };
  
  const handleAddUser = () => {
    resetForm();
    setCurrentUser2(null);
    setShowAddEditDialog(true);
  };
  
  const handleEditUser = (user: any) => {
    setCurrentUser2(user);
    setFormState({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      password: '',
      confirmPassword: '',
      role: user.role,
      avatarUrl: user.avatarUrl
    });
    setShowAddEditDialog(true);
  };
  
  const handleDeleteUser = (user: any) => {
    setCurrentUser2(user);
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    if (!currentUser2) return;
    
    setUsers(users.filter(u => u.id !== currentUser2.id));
    toast({
      title: "Usuário excluído",
      description: `${currentUser2.firstName} ${currentUser2.lastName} foi removido com sucesso`,
    });
    setShowDeleteDialog(false);
    setCurrentUser2(null);
  };
  
  const handleSubmitUser = async () => {
    // Validação básica
    if (!formState.firstName || !formState.lastName || !formState.email) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    // Validação de senha para novos usuários
    if (!currentUser2 && (!formState.password || formState.password !== formState.confirmPassword)) {
      toast({
        title: "Erro na senha",
        description: currentUser2 
          ? "As senhas não coincidem." 
          : "A senha é obrigatória e deve ser confirmada corretamente.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      // Aqui seria uma chamada de API para cadastrar/atualizar o usuário
      // Simulando a resposta da API
      
      if (currentUser2) {
        // Atualiza usuário existente
        setUsers(users.map(u => u.id === currentUser2.id ? {
          ...currentUser2,
          firstName: formState.firstName,
          lastName: formState.lastName,
          email: formState.email,
          phone: formState.phone,
          role: formState.role,
          avatarUrl: formState.avatarUrl
        } : u));
        
        toast({
          title: "Usuário atualizado",
          description: `${formState.firstName} ${formState.lastName} foi atualizado com sucesso`,
        });
      } else {
        // Adiciona novo usuário
        const newUser = {
          id: Date.now().toString(),
          firstName: formState.firstName,
          lastName: formState.lastName,
          email: formState.email,
          phone: formState.phone,
          role: formState.role,
          avatarUrl: formState.avatarUrl
        };
        
        setUsers([...users, newUser]);
        
        toast({
          title: "Usuário adicionado",
          description: `${formState.firstName} ${formState.lastName} foi adicionado com sucesso`,
        });
      }
      
      setShowAddEditDialog(false);
      resetForm();
      setCurrentUser2(null);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar o usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Simular upload para protótipo
    try {
      // Aqui seria o upload para o storage
      // Por enquanto usamos URL.createObjectURL para simular
      const avatarUrl = URL.createObjectURL(file);
      setFormState(prev => ({ ...prev, avatarUrl }));
      
      toast({
        title: "Avatar carregado",
        description: "Imagem carregada com sucesso",
      });
    } catch (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      toast({
        title: "Erro ao carregar imagem",
        description: "Não foi possível carregar a imagem. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Filtra usuários pela pesquisa
  const filteredUsers = users.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Tradução dos papéis de usuário
  const translateRole = (role: string) => {
    const roles: Record<string, string> = {
      'admin': 'Administrador',
      'restaurant_owner': 'Dono',
      'waiter': 'Garçom',
      'chef': 'Cozinheiro',
      'delivery_person': 'Entregador',
      'customer': 'Cliente'
    };
    return roles[role] || role;
  };
  
  // Cores para os badges de papéis
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'restaurant_owner':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'waiter':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'chef':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'delivery_person':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Usuários</h1>
            <p className="text-gray-600">Gerencie os usuários do sistema</p>
          </div>
          <Button 
            onClick={handleAddUser}
            className="mt-4 md:mt-0 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar Usuário
          </Button>
        </div>
        
        {/* Filtro de pesquisa */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Pesquisar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        {/* Lista de usuários */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Usuário</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Telefone</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Função</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Avatar className="mr-3">
                        <AvatarImage src={user.avatarUrl || undefined} />
                        <AvatarFallback>{user.firstName[0]}{user.lastName[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.phone || '—'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                      {translateRole(user.role)}
                    </Badge>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUser(user)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">Nenhum usuário encontrado.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Modal para adicionar/editar usuário */}
      <Dialog open={showAddEditDialog} onOpenChange={setShowAddEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentUser2 ? 'Editar Usuário' : 'Adicionar Novo Usuário'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="flex flex-col items-center mb-4">
              <div className="mb-4">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formState.avatarUrl || undefined} />
                  <AvatarFallback className="text-2xl">
                    {formState.firstName ? formState.firstName[0] : ''}
                    {formState.lastName ? formState.lastName[0] : ''}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Label htmlFor="avatar" className="cursor-pointer inline-flex items-center px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors">
                <Upload className="h-4 w-4 mr-2" /> Carregar foto
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </Label>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome*</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formState.firstName}
                  onChange={handleInputChange}
                  placeholder="Nome"
                />
              </div>
              
              <div>
                <Label htmlFor="lastName">Sobrenome*</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formState.lastName}
                  onChange={handleInputChange}
                  placeholder="Sobrenome"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="email">Email*</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formState.email}
                  onChange={handleInputChange}
                  placeholder="email@exemplo.com"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formState.phone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="col-span-2 relative">
                <Label htmlFor="password">{currentUser2 ? 'Nova Senha (deixe em branco para manter)' : 'Senha*'}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formState.password}
                    onChange={handleInputChange}
                    placeholder="Senha"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="col-span-2 relative">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formState.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="Confirme a senha"
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="role">Função*</Label>
                <select
                  id="role"
                  name="role"
                  value={formState.role}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="restaurant_owner">Dono</option>
                  <option value="admin">Administrador</option>
                  <option value="waiter">Garçom</option>
                  <option value="chef">Cozinheiro</option>
                  <option value="delivery_person">Entregador</option>
                  <option value="customer">Cliente</option>
                </select>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitUser}>
              {currentUser2 ? 'Salvar Alterações' : 'Adicionar Usuário'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmação para exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir o usuário "{currentUser2?.firstName} {currentUser2?.lastName}"? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
