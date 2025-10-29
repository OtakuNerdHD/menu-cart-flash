
import React, { useState, useEffect } from 'react';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Building, Users, ShoppingBag, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Team {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings?: any;
  created_at: string;
  updated_at: string;
}

interface SupabaseProduct {
  id: number;
  name: string;
  description?: string;
  price: number;
  category?: string;
  available: boolean;
  team_id: string;
  restaurant_id: number;
  created_at?: string;
  updated_at?: string;
  featured?: boolean;
  gallery?: string[];
  ingredients?: string;
  note_hint?: string;
  rating?: number;
  review_count?: number;
  image_url?: string;
  images?: string[];
  nutritional_info?: any;
}

const DashboardSAAS = () => {
  const { getTeams, createTeam, updateTeam, deleteTeam, getProducts, isAdminMode } = useSupabaseWithMultiTenant();
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<SupabaseProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    adminFirstName: '',
    adminLastName: '',
    adminTaxId: '',
    adminPhone1: '',
    adminPhone2: '',
    adminEmail: '',
    adminPassword: ''
  });

  // Dialog de admin (visualizar/editar)
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [adminViewTeam, setAdminViewTeam] = useState<Team | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [adminForm, setAdminForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone1: '',
    phone2: '',
    tax_id: ''
  });

  // Dialog de credenciais de pagamento (por cliente)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentTeam, setPaymentTeam] = useState<Team | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    provider: 'mercadopago',
    public_key: '',
    access_token: '',
    test_mode: true,
  });

  // Verificar se está no modo admin
  if (!isAdminMode) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Acesso Negado
            </h3>
            <p className="text-gray-500 text-center">
              Esta página é exclusiva para administradores gerais.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchTeams = async () => {
    try {
      const data = await getTeams();
      setTeams(data || []);
    } catch (error: any) {
      console.error('Erro ao buscar teams:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: error.message || "Não foi possível carregar a lista de clientes.",
        variant: "destructive"
      });
    }
  };

  const openPaymentDialog = (team: Team) => {
    setPaymentTeam(team);
    setIsPaymentDialogOpen(true);
    setPaymentForm({ provider: 'mercadopago', public_key: '', access_token: '', test_mode: true });
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentTeam) return;
    setPaymentLoading(true);
    try {
      const payload = {
        team_slug: paymentTeam.slug,
        provider: paymentForm.provider,
        public_key: paymentForm.public_key,
        access_token: paymentForm.access_token,
        test_mode: paymentForm.test_mode,
      } as never;
      const { error, data } = await supabase.functions.invoke('set-mercadopago-credentials' as never, { body: payload });
      if (error) {
        toast({ title: 'Erro ao salvar credenciais', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Credenciais salvas', description: 'Mercado Pago validado e salvo para este cliente.' });
        setIsPaymentDialogOpen(false);
      }
    } catch (err: any) {
      toast({ title: 'Erro inesperado', description: err?.message ?? String(err), variant: 'destructive' });
    } finally {
      setPaymentLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      // Mapear os dados para garantir que todos os campos necessários estejam presentes
      const mappedProducts: SupabaseProduct[] = (data || []).map((product: any) => ({
        id: product.id,
        name: product.name || '',
        description: product.description || '',
        price: product.price || 0,
        category: product.category || '',
        available: product.available !== false,
        team_id: product.team_id || '',
        restaurant_id: product.restaurant_id || 0,
        created_at: product.created_at || new Date().toISOString(),
        updated_at: product.updated_at || new Date().toISOString(),
        featured: product.featured || false,
        gallery: product.gallery || [],
        ingredients: product.ingredients || '',
        note_hint: product.note_hint || '',
        rating: product.rating || 0,
        review_count: product.review_count || 0,
        image_url: product.image_url || '',
        images: product.images || [],
        nutritional_info: product.nutritional_info || null
      }));
      setProducts(mappedProducts);
    } catch (error: any) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: "Erro ao carregar produtos",
        description: error.message || "Não foi possível carregar os produtos.",
        variant: "destructive"
      });
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const newTeam = await createTeam(formData);
      
      toast({
        title: "Cliente criado com sucesso",
        description: `O cliente "${formData.name}" foi criado.`,
      });

      // Vincular o admin informado como owner/admin deste tenant
      try {
        if (formData.adminEmail && formData.slug) {
          const { error: linkErr } = await (supabase as any).rpc('saas_register_owner', {
            team_slug: formData.slug,
            owner_email: formData.adminEmail
          });
          if (linkErr) {
            console.warn('Falha ao registrar owner/admin do cliente:', linkErr);
            toast({ title: 'Aviso: owner não vinculado', description: 'Não foi possível vincular o admin como owner deste cliente agora.', variant: 'destructive' });
          } else {
            toast({ title: 'Owner vinculado', description: 'O admin informado foi vinculado como owner/admin deste cliente.' });
          }
        }
      } catch (linkException: any) {
        console.warn('Exceção ao registrar owner/admin:', linkException);
      }

      // Provisionar usuário admin do cliente (Edge Function, com service role)
      try {
        const payload = {
          team_slug: formData.slug,
          admin: {
            email: formData.adminEmail,
            password: formData.adminPassword,
            first_name: formData.adminFirstName,
            last_name: formData.adminLastName,
            phone1: formData.adminPhone1,
            phone2: formData.adminPhone2,
            tax_id: formData.adminTaxId
          },
          confirm: true,
          role: 'owner'
        } as never;
        const { error: fnError, data: fnData } = await supabase.functions.invoke('provision-team-admin' as never, { body: payload });
        if (fnError) {
          console.warn('Falha ao provisionar admin do cliente:', fnError);
          toast({
            title: 'Aviso: usuário admin não foi provisionado automaticamente',
            description: 'Você pode configurar o admin depois em "Admin do Cliente".',
          });
        } else {
          console.log('Admin provisionado:', fnData);
          toast({
            title: 'Admin do cliente criado',
            description: 'O usuário admin da instância foi provisionado.',
          });
        }
      } catch (provisionError: any) {
        console.warn('Erro ao chamar função provision-team-admin:', provisionError);
      }

      // Limpar formulário e fechar dialog
      setFormData({ 
        name: '', slug: '', description: '',
        adminFirstName: '', adminLastName: '', adminTaxId: '',
        adminPhone1: '', adminPhone2: '', adminEmail: '', adminPassword: ''
      });
      setIsDialogOpen(false);
      
      // Recarregar lista de teams
      await fetchTeams();
    } catch (error: any) {
      console.error('Erro ao criar team:', error);
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Não foi possível criar o cliente. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;

    setIsEditing(true);

    try {
      await updateTeam(editingTeam.id, formData);
      
      toast({
        title: "Cliente atualizado com sucesso",
        description: `O cliente "${formData.name}" foi atualizado.`,
      });

      // Limpar formulário e fechar dialog
      setFormData({ 
        name: '', slug: '', description: '',
        adminFirstName: '', adminLastName: '', adminTaxId: '',
        adminPhone1: '', adminPhone2: '', adminEmail: '', adminPassword: ''
      });
      setEditingTeam(null);
      setIsDialogOpen(false);
      
      // Recarregar lista de teams
      await fetchTeams();
    } catch (error: any) {
      console.error('Erro ao atualizar team:', error);
      toast({
        title: "Erro ao atualizar cliente",
        description: error.message || "Não foi possível atualizar o cliente. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      await deleteTeam(teamId);
      
      toast({
        title: "Cliente removido com sucesso",
        description: `O cliente "${teamName}" foi removido.`,
      });
      
      // Recarregar lista de teams
      await fetchTeams();
    } catch (error: any) {
      console.error('Erro ao deletar team:', error);
      toast({
        title: "Erro ao remover cliente",
        description: error.message || "Não foi possível remover o cliente. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const openEditDialog = (team: Team) => {
    setEditingTeam(team);
    setFormData({
      name: team.name,
      slug: team.slug,
      description: team.description || '',
      adminFirstName: '',
      adminLastName: '',
      adminTaxId: '',
      adminPhone1: '',
      adminPhone2: '',
      adminEmail: '',
      adminPassword: ''
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTeam(null);
    setFormData({ name: '', slug: '', description: '', adminFirstName: '', adminLastName: '', adminTaxId: '', adminPhone1: '', adminPhone2: '', adminEmail: '', adminPassword: '' });
    setIsDialogOpen(true);
  };

  const openAdminDialog = async (team: Team) => {
    setAdminViewTeam(team);
    setIsAdminDialogOpen(true);
    setAdminLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc('get_team_admin_profile', { team_slug: team.slug });
      if (error) {
        console.warn('Falha ao carregar admin do cliente:', error);
        toast({ title: 'Não foi possível carregar dados do admin', description: error.message, variant: 'destructive' });
      } else if (data && Array.isArray(data) && data.length > 0) {
        const row = data[0] as any;
        setAdminUserId(row.user_id);
        setAdminForm({
          email: row.email ?? '',
          first_name: row.first_name ?? '',
          last_name: row.last_name ?? '',
          phone1: row.phone1 ?? '',
          phone2: row.phone2 ?? '',
          tax_id: row.tax_id ?? ''
        });
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminViewTeam || !adminUserId) return;
    setAdminLoading(true);
    try {
      const { error } = await (supabase as any).rpc('update_team_admin_profile', {
        team_slug: adminViewTeam.slug,
        p_user_id: adminUserId,
        p_first_name: adminForm.first_name,
        p_last_name: adminForm.last_name,
        p_phone1: adminForm.phone1,
        p_phone2: adminForm.phone2,
        p_tax_id: adminForm.tax_id,
        set_role: null
      });
      if (error) {
        toast({ title: 'Erro ao atualizar admin', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Admin atualizado', description: 'Dados do administrador foram salvos.' });
        setIsAdminDialogOpen(false);
      }
    } finally {
      setAdminLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTeams(), fetchProducts()]);
      setLoading(false);
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard SAAS</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Editar Cliente' : 'Criar Novo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingTeam 
                  ? 'Atualize as informações do cliente.'
                  : 'Preencha as informações para criar um novo cliente (restaurante).'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={editingTeam ? handleEditTeam : handleCreateTeam} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={handleNameChange}
                  placeholder="Ex: Restaurante do João"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Slug (Subdomínio)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="Ex: restaurante-joao"
                  required
                />
                <p className="text-sm text-gray-500">
                  Este será o subdomínio: {formData.slug}.delliapp.com.br
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (Opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do restaurante..."
                  rows={3}
                />
              </div>

              {!editingTeam && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Dados do Admin da Instância</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input value={formData.adminFirstName} onChange={(e) => setFormData(prev => ({ ...prev, adminFirstName: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Sobrenome</Label>
                      <Input value={formData.adminLastName} onChange={(e) => setFormData(prev => ({ ...prev, adminLastName: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF/CNPJ</Label>
                      <Input value={formData.adminTaxId} onChange={(e) => setFormData(prev => ({ ...prev, adminTaxId: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone 1</Label>
                      <Input value={formData.adminPhone1} onChange={(e) => setFormData(prev => ({ ...prev, adminPhone1: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone 2 (opcional)</Label>
                      <Input value={formData.adminPhone2} onChange={(e) => setFormData(prev => ({ ...prev, adminPhone2: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>E-mail</Label>
                      <Input type="email" value={formData.adminEmail} onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha</Label>
                      <Input type="password" value={formData.adminPassword} onChange={(e) => setFormData(prev => ({ ...prev, adminPassword: e.target.value }))} required />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">O e-mail será confirmado automaticamente.</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isCreating || isEditing}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={isCreating || isEditing}
                >
                  {editingTeam 
                    ? (isEditing ? 'Atualizando...' : 'Atualizar Cliente')
                    : (isCreating ? 'Criando...' : 'Criar Cliente')
                  }
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{products.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Teams */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {teams.length === 0 ? (
            <div className="text-center py-8">
              <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum cliente cadastrado
              </h3>
              <p className="text-gray-500 mb-4">
                Comece criando seu primeiro cliente (restaurante).
              </p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Primeiro Cliente
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{team.name}</h3>
                      <Badge variant="secondary">{team.slug}</Badge>
                    </div>
                    {team.description && (
                      <p className="text-sm text-gray-600 mb-2">{team.description}</p>
                    )}
                    <div className="text-xs text-gray-500">
                      Criado em: {new Date(team.created_at).toLocaleDateString('pt-BR')}
                    </div>
                    <div className="text-xs text-gray-500">
                      URL: https://{team.slug}.delliapp.com.br
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openPaymentDialog(team)}
                      title="Configurar Pagamentos"
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAdminDialog(team)}
                    >
                      Admin do Cliente
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditDialog(team)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover Cliente</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja remover o cliente "{team.name}"?
                            Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteTeam(team.id, team.name)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Admin do Cliente */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Admin do Cliente {adminViewTeam ? `(${adminViewTeam.name})` : ''}</DialogTitle>
            <DialogDescription>Visualize e edite os dados do administrador da instância.</DialogDescription>
          </DialogHeader>
          {adminLoading ? (
            <div className="py-8 text-center">Carregando...</div>
          ) : (
            <form onSubmit={handleUpdateAdmin} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={adminForm.email} disabled />
                </div>
                <div className="space-y-2">
                  <Label>CPF/CNPJ</Label>
                  <Input value={adminForm.tax_id} onChange={(e) => setAdminForm(prev => ({ ...prev, tax_id: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={adminForm.first_name} onChange={(e) => setAdminForm(prev => ({ ...prev, first_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Sobrenome</Label>
                  <Input value={adminForm.last_name} onChange={(e) => setAdminForm(prev => ({ ...prev, last_name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone 1</Label>
                  <Input value={adminForm.phone1} onChange={(e) => setAdminForm(prev => ({ ...prev, phone1: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone 2</Label>
                  <Input value={adminForm.phone2} onChange={(e) => setAdminForm(prev => ({ ...prev, phone2: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAdminDialogOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={adminLoading}>Salvar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Credenciais de Pagamento */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[520px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configurar Pagamentos {paymentTeam ? `(${paymentTeam.name})` : ''}</DialogTitle>
            <DialogDescription>Informe as credenciais do Mercado Pago deste cliente. As chaves serão validadas e armazenadas com criptografia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSavePayment} className="space-y-4">
            <div className="space-y-2">
              <Label>Public Key</Label>
              <Input
                value={paymentForm.public_key}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, public_key: e.target.value }))}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Access Token</Label>
              <Input
                type="password"
                value={paymentForm.access_token}
                onChange={(e) => setPaymentForm(prev => ({ ...prev, access_token: e.target.value }))}
                placeholder="APP_USR-xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input id="test_mode" type="checkbox" checked={paymentForm.test_mode} onChange={(e) => setPaymentForm(prev => ({ ...prev, test_mode: e.target.checked }))} />
              <Label htmlFor="test_mode">Modo de teste</Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)} disabled={paymentLoading}>Cancelar</Button>
              <Button type="submit" disabled={paymentLoading}>{paymentLoading ? 'Salvando...' : 'Validar e Salvar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardSAAS;
