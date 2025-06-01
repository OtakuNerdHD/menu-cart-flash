import React, { useState, useEffect } from 'react';
import { useTeam } from '@/context/TeamContext';
import { useSupabaseWithTeam } from '@/hooks/useSupabaseWithTeam';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useSubdomain } from '@/hooks/useSubdomain';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { supabase } from '@/integrations/supabase/client';
import TeamSelector from '@/components/TeamSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 
  Users, 
  Store, 
  ShoppingCart, 
  TrendingUp, 
  Settings,
  Eye,
  Edit,
  Trash2,
  Plus
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TeamStats {
  totalRestaurants: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}

interface Restaurant {
  id: number; // Alterado de string para number
  name: string;
  description?: string;
  team_id: string;
  created_at: string;
  updated_at?: string; // Tornando opcional
}

interface Product {
  id: number; // Alterado de string para number
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  available: boolean;
  category?: string;
  restaurant_id: number; // Alterado de string para number
  created_at: string;
  updated_at?: string; // Tornando opcional
}

interface Order {
  id: number; // Alterado de string para number
  total_amount: number;
  status: string;
  created_at: string;
  updated_at?: string; // Tornando opcional
  user_id?: number; // Alterado de string para number ou null
  restaurant_id: number; // Alterado de string para number
}

const DashboardSAAS = () => {
  const { teamId, isReady } = useTeam();
  const { teamSupabase } = useSupabaseWithTeam();
  const { isAdminMode, isLoading: multiTenantLoading } = useMultiTenant();
  const { isAdminMode: isSubdomainAdmin, isLoading: subdomainLoading } = useSubdomain();
  const { createTeam } = useSupabaseWithMultiTenant();
  const { toast } = useToast();
  const [stats, setStats] = useState<TeamStats>({
    totalRestaurants: 0,
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0
  });
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isNewRestaurantModalOpen, setIsNewRestaurantModalOpen] = useState(false);
  const [newRestaurantForm, setNewRestaurantForm] = useState({
    name: '',
    slug: '',
    email: '',
    phone: '',
    password: '',
    generatePassword: false,
    plan: 'inicial'
  });

  // Verificar se está em modo admin geral (local ou app.delliapp.com.br)
  const isGeneralAdmin = React.useMemo(() => {
    const hostname = window.location.hostname;
    // Modo admin local (desenvolvimento)
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
    // Modo admin geral (produção - app.delliapp.com.br)
    const isAppDomain = hostname === 'app.delliapp.com.br';
    
    return isLocal || isAppDomain || isSubdomainAdmin;
  }, [isSubdomainAdmin]);

  useEffect(() => {
    if (!multiTenantLoading && !subdomainLoading && (isGeneralAdmin || (isReady && teamId && teamSupabase))) {
      loadDashboardData();
    }
  }, [isReady, teamId, teamSupabase, multiTenantLoading, subdomainLoading, isGeneralAdmin]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      let restaurantsData: Restaurant[] = [];
      let productsData: Product[] = [];
      let ordersData: Order[] = [];

      if (isGeneralAdmin) {
        // Modo admin geral - carregar todos os dados sem filtro de team
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          console.log('Carregando dados em modo admin geral (app.delliapp.com.br ou localhost)...');
          
          const [restaurantsResult, productsResult, ordersResult] = await Promise.all([
            supabase.from('restaurants').select('*'),
            supabase.from('products').select('*'),
            supabase.from('orders').select('*')
          ]);

          console.log('Resultados obtidos:', { 
            restaurants: restaurantsResult, 
            products: productsResult, 
            orders: ordersResult 
          });

          if (restaurantsResult.error) {
            console.error('Erro ao carregar restaurantes:', restaurantsResult.error);
          }
          
          if (productsResult.error) {
            console.error('Erro ao carregar produtos:', productsResult.error);
          }
          
          if (ordersResult.error) {
            console.error('Erro ao carregar pedidos:', ordersResult.error);
          }

          restaurantsData = restaurantsResult.data || [];
          productsData = productsResult.data || [];
          ordersData = ordersResult.data || [];
          
          // Se não houver dados no modo admin geral, criar dados fictícios para teste
          if (restaurantsData.length === 0 && productsData.length === 0 && ordersData.length === 0) {
            console.log('Nenhum dado encontrado no modo admin geral, criando dados fictícios para teste...');
            
            // Dados fictícios para teste
            restaurantsData = [
              { 
                id: 1, 
                name: 'Restaurante Teste 1', 
                description: 'Descrição do restaurante teste 1', 
                team_id: '1',
                created_at: new Date().toISOString()
              },
              { 
                id: 2, 
                name: 'Restaurante Teste 2', 
                description: 'Descrição do restaurante teste 2', 
                team_id: '1',
                created_at: new Date().toISOString()
              }
            ];
            
            productsData = [
              { 
                id: 1, 
                name: 'Produto Teste 1', 
                description: 'Descrição do produto teste 1', 
                price: 19.90, 
                available: true, 
                category: 'Categoria 1',
                restaurant_id: 1,
                created_at: new Date().toISOString()
              },
              { 
                id: 2, 
                name: 'Produto Teste 2', 
                description: 'Descrição do produto teste 2', 
                price: 29.90, 
                available: true, 
                category: 'Categoria 2',
                restaurant_id: 1,
                created_at: new Date().toISOString()
              }
            ];
            
            ordersData = [
              { 
                id: 1, 
                total_amount: 19.90, 
                status: 'concluído', 
                created_at: new Date().toISOString(),
                restaurant_id: 1
              },
              { 
                id: 2, 
                total_amount: 29.90, 
                status: 'em andamento', 
                created_at: new Date().toISOString(),
                restaurant_id: 1
              }
            ];
          }
        } catch (error) {
          console.error('Erro ao carregar dados do Supabase:', error);
          toast({
            title: 'Erro ao carregar dados',
            description: 'Ocorreu um erro ao carregar os dados. Carregando dados fictícios para teste.',
            variant: 'destructive'
          });
          
          // Dados fictícios em caso de erro
          restaurantsData = [
            { 
              id: 1, 
              name: 'Restaurante Teste (Fallback)', 
              description: 'Descrição do restaurante teste', 
              team_id: '1',
              created_at: new Date().toISOString()
            }
          ];
          
          productsData = [
            { 
              id: 1, 
              name: 'Produto Teste (Fallback)', 
              description: 'Descrição do produto teste', 
              price: 19.90, 
              available: true, 
              category: 'Categoria 1',
              restaurant_id: 1,
              created_at: new Date().toISOString()
            }
          ];
          
          ordersData = [
            { 
              id: 1, 
              total_amount: 19.90, 
              status: 'concluído', 
              created_at: new Date().toISOString(),
              restaurant_id: 1
            }
          ];
        }
      } else if (teamSupabase) {
        // Modo team normal - usar o hook com filtro
        const [restaurantsResult, productsResult, ordersResult] = await Promise.all([
          teamSupabase.getRestaurants(),
          teamSupabase.getProducts(),
          teamSupabase.getOrders()
        ]);

        restaurantsData = restaurantsResult || [];
        productsData = productsResult || [];
        ordersData = ordersResult || [];
      }

      setRestaurants(restaurantsData);
      setProducts(productsData);
      setOrders(ordersData);

      // Calcular estatísticas
      const totalRevenue = ordersData.reduce((sum, order) => sum + (order.total_amount || 0), 0);
      
      setStats({
        totalRestaurants: restaurantsData.length,
        totalProducts: productsData.length,
        totalOrders: ordersData.length,
        totalRevenue
      });

      console.log('Dashboard carregado com sucesso:', {
        restaurants: restaurantsData.length,
        products: productsData.length,
        orders: ordersData.length,
        revenue: totalRevenue
      });
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      toast({
        title: 'Erro ao carregar dashboard',
        description: 'Ocorreu um erro ao carregar os dados do dashboard.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para gerar slug automaticamente
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/-+/g, '-') // Remove hífens duplicados
      .trim();
  };

  // Função para gerar senha temporária
  const generateTempPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Função para lidar com mudanças no formulário
  const handleFormChange = (field: string, value: string | boolean) => {
    setNewRestaurantForm(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-gerar slug quando o nome muda
      if (field === 'name' && typeof value === 'string') {
        updated.slug = generateSlug(value);
      }
      
      // Gerar senha temporária se a opção estiver marcada
      if (field === 'generatePassword' && value === true) {
        updated.password = generateTempPassword();
      }
      
      return updated;
    });
  };

  // Função para validar o formulário
  const validateForm = () => {
    const { name, slug, email, phone, password, generatePassword } = newRestaurantForm;
    
    if (!name.trim()) {
      toast({ title: 'Erro', description: 'Nome do restaurante é obrigatório', variant: 'destructive' });
      return false;
    }
    
    if (!slug.trim()) {
      toast({ title: 'Erro', description: 'Slug é obrigatório', variant: 'destructive' });
      return false;
    }
    
    if (!email.trim() || !email.includes('@')) {
      toast({ title: 'Erro', description: 'Email válido é obrigatório', variant: 'destructive' });
      return false;
    }
    
    if (!phone.trim()) {
      toast({ title: 'Erro', description: 'Telefone é obrigatório', variant: 'destructive' });
      return false;
    }
    
    if (!generatePassword && !password.trim()) {
      toast({ title: 'Erro', description: 'Senha é obrigatória ou marque para gerar automaticamente', variant: 'destructive' });
      return false;
    }
    
    return true;
  };

  // Função para criar novo restaurante
  const handleCreateRestaurant = async () => {
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      
      // Usar o hook multi-tenant que já tem as configurações RLS corretas
      const teamData = {
        name: newRestaurantForm.name,
        slug: newRestaurantForm.slug,
        settings: {
          plan: newRestaurantForm.plan,
          contact: {
            email: newRestaurantForm.email,
            phone: newRestaurantForm.phone
          }
        }
      };
      
      console.log('Criando restaurante com dados:', teamData);
      const team = await createTeam(teamData);
      
      if (!team) {
        toast({ 
          title: 'Erro', 
          description: 'Erro ao criar estabelecimento', 
          variant: 'destructive' 
        });
        setLoading(false);
        return;
      }
      
      // Criar usuário no auth (se necessário)
      // Nota: Em produção, você pode querer usar a API Admin do Supabase
      // Por enquanto, vamos apenas salvar as informações do responsável
      
      toast({ 
        title: 'Sucesso!', 
        description: `Estabelecimento "${newRestaurantForm.name}" criado com sucesso!\nAcesso: https://${newRestaurantForm.slug}.delliapp.com.br` 
      });
      
      // Resetar formulário e fechar modal
      setNewRestaurantForm({
        name: '',
        slug: '',
        email: '',
        phone: '',
        password: '',
        generatePassword: false,
        plan: 'inicial'
      });
      setIsNewRestaurantModalOpen(false);
      
      // Recarregar dados
      loadDashboardData();
      
    } catch (error) {
      console.error('Erro ao criar restaurante:', error);
      toast({ 
        title: 'Erro', 
        description: 'Erro inesperado ao criar estabelecimento', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  if (multiTenantLoading || subdomainLoading || (!isGeneralAdmin && !isReady)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard SAAS</h1>
              <p className="text-gray-600">Gerencie seus clientes e teams</p>
            </div>
            <TeamSelector className="" />
          </div>
          
          {isGeneralAdmin ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Modo:</span>
                <Badge variant="secondary" className="bg-green-100 text-green-800">Admin Geral (Local)</Badge>
                <span className="text-sm text-green-700 ml-2">Acesso total a todos os dados</span>
              </div>
            </div>
          ) : teamId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">Team Ativo:</span>
                <Badge variant="secondary">{teamId}</Badge>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Restaurantes</CardTitle>
              <Store className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRestaurants}</div>
              <p className="text-xs text-muted-foreground">Total de estabelecimentos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Produtos</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">Itens no cardápio</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">Total de pedidos</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">Receita total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Content */}
        <Tabs defaultValue="restaurants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="restaurants">Restaurantes</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>
          
          <TabsContent value="restaurants">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Restaurantes do Team</CardTitle>
                    <CardDescription>Gerencie os restaurantes deste team</CardDescription>
                  </div>
                  <Dialog open={isNewRestaurantModalOpen} onOpenChange={setIsNewRestaurantModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Restaurante
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>Cadastrar Novo Estabelecimento</DialogTitle>
                        <DialogDescription>
                          Crie um novo cliente/tenant do SaaS. O estabelecimento terá acesso através do subdomínio gerado.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        {/* Nome do Restaurante */}
                        <div className="grid gap-2">
                          <Label htmlFor="name">Nome do Restaurante *</Label>
                          <Input
                            id="name"
                            value={newRestaurantForm.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            placeholder="Ex: Padaria do João"
                          />
                        </div>
                        
                        {/* Slug */}
                        <div className="grid gap-2">
                          <Label htmlFor="slug">Slug (Subdomínio) *</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id="slug"
                              value={newRestaurantForm.slug}
                              onChange={(e) => handleFormChange('slug', e.target.value)}
                              placeholder="padaria-joao"
                            />
                            <span className="text-sm text-gray-500">.delliapp.com.br</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            URL de acesso: https://{newRestaurantForm.slug || 'seu-slug'}.delliapp.com.br
                          </p>
                        </div>
                        
                        {/* Email e Telefone */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email do Responsável *</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newRestaurantForm.email}
                              onChange={(e) => handleFormChange('email', e.target.value)}
                              placeholder="joao@padaria.com"
                            />
                          </div>
                          
                          <div className="grid gap-2">
                            <Label htmlFor="phone">Telefone *</Label>
                            <Input
                              id="phone"
                              value={newRestaurantForm.phone}
                              onChange={(e) => handleFormChange('phone', e.target.value)}
                              placeholder="(11) 99999-9999"
                            />
                          </div>
                        </div>
                        
                        {/* Senha */}
                        <div className="grid gap-2">
                          <Label htmlFor="password">Senha</Label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="generatePassword"
                                checked={newRestaurantForm.generatePassword}
                                onChange={(e) => handleFormChange('generatePassword', e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor="generatePassword" className="text-sm">
                                Gerar senha temporária automaticamente
                              </Label>
                            </div>
                            
                            {!newRestaurantForm.generatePassword && (
                              <Input
                                id="password"
                                type="password"
                                value={newRestaurantForm.password}
                                onChange={(e) => handleFormChange('password', e.target.value)}
                                placeholder="Digite uma senha"
                              />
                            )}
                            
                            {newRestaurantForm.generatePassword && newRestaurantForm.password && (
                              <div className="p-2 bg-gray-50 rounded border">
                                <p className="text-sm text-gray-600">Senha gerada:</p>
                                <p className="font-mono text-sm">{newRestaurantForm.password}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Plano */}
                        <div className="grid gap-2">
                          <Label htmlFor="plan">Plano *</Label>
                          <Select value={newRestaurantForm.plan} onValueChange={(value) => handleFormChange('plan', value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um plano" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inicial">Plano Inicial</SelectItem>
                              <SelectItem value="delivery-standard">Plano Delivery Standard</SelectItem>
                              <SelectItem value="seu-app">Plano Seu APP</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Descrição do plano */}
                          <div className="text-xs text-gray-500 mt-1">
                            {newRestaurantForm.plan === 'inicial' && (
                              <p>Funcionalidades básicas (em definição)</p>
                            )}
                            {newRestaurantForm.plan === 'delivery-standard' && (
                              <p>Funcionalidades de delivery (em definição)</p>
                            )}
                            {newRestaurantForm.plan === 'seu-app' && (
                              <p>Acesso completo ao sistema (exceto dashboard SaaS)</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsNewRestaurantModalOpen(false)}
                          disabled={loading}
                        >
                          Cancelar
                        </Button>
                        <Button 
                          onClick={handleCreateRestaurant}
                          disabled={loading}
                        >
                          {loading ? 'Criando...' : 'Criar Estabelecimento'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando restaurantes...</p>
                  </div>
                ) : restaurants.length === 0 ? (
                  <div className="text-center py-8">
                    <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum restaurante encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {restaurants.map((restaurant) => (
                      <div key={restaurant.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{restaurant.name}</h3>
                          <p className="text-sm text-gray-500">{restaurant.description}</p>
                          <Badge variant="outline" className="mt-1">
                            Team: {restaurant.team_id}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="products">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Produtos do Team</CardTitle>
                    <CardDescription>Gerencie os produtos deste team</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando produtos...</p>
                  </div>
                ) : products.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum produto encontrado</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.slice(0, 6).map((product) => (
                      <div key={product.id} className="border rounded-lg p-4">
                        <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                          {product.image_url ? (
                            <img 
                              src={product.image_url} 
                              alt={product.name}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <ShoppingCart className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <h3 className="font-medium mb-1">{product.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{product.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-green-600">
                            {formatCurrency(product.price)}
                          </span>
                          <Badge variant={product.available ? "default" : "secondary"}>
                            {product.available ? "Disponível" : "Indisponível"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {products.length > 6 && (
                  <div className="text-center mt-4">
                    <Button variant="outline">
                      Ver todos os {products.length} produtos
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle>Pedidos Recentes</CardTitle>
                <CardDescription>Últimos pedidos do team</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Carregando pedidos...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Nenhum pedido encontrado</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.slice(0, 10).map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">Pedido #{order.id.toString().slice(0, 8)}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(order.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(order.total_amount || 0)}</p>
                          <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                            {order.status || 'Pendente'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>{isGeneralAdmin ? 'Configurações do Sistema' : 'Configurações do Team'}</CardTitle>
                <CardDescription>
                  {isGeneralAdmin ? 'Gerencie as configurações globais do sistema' : 'Gerencie as configurações deste team'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium mb-2">
                        {isGeneralAdmin ? 'Informações do Sistema' : 'Informações do Team'}
                      </h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {isGeneralAdmin ? (
                        <>
                          <p><strong>Modo:</strong> Admin Geral (Ambiente Local)</p>
                          <p><strong>Hostname:</strong> {window.location.hostname}</p>
                          <p><strong>Total de Restaurantes:</strong> {stats.totalRestaurants}</p>
                          <p><strong>Total de Produtos:</strong> {stats.totalProducts}</p>
                          <p><strong>Total de Pedidos:</strong> {stats.totalOrders}</p>
                          <p><strong>Receita Total:</strong> {formatCurrency(stats.totalRevenue)}</p>
                        </>
                      ) : (
                        <>
                          <p><strong>ID do Team:</strong> {teamId}</p>
                          <p><strong>Total de Restaurantes:</strong> {stats.totalRestaurants}</p>
                          <p><strong>Total de Produtos:</strong> {stats.totalProducts}</p>
                          <p><strong>Total de Pedidos:</strong> {stats.totalOrders}</p>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-medium mb-2">Ações</h3>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={loadDashboardData}>
                        <Settings className="h-4 w-4 mr-2" />
                        Recarregar Dados
                      </Button>
                      <Button variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações Avançadas
                      </Button>
                      {isGeneralAdmin && (
                        <Button variant="outline" className="bg-green-50 hover:bg-green-100">
                          <Users className="h-4 w-4 mr-2" />
                          Gerenciar Teams
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default DashboardSAAS;