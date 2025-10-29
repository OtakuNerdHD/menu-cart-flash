import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, UtensilsCrossed, CheckCircle, ClipboardList, Filter } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import KitchenOrderDetails from '@/components/KitchenOrderDetails';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';

const KitchenManagement = () => {
  const { currentUser } = useUserSwitcher();
  const { isSuperAdmin } = useAuth();
  const { getOrders } = useSupabaseWithMultiTenant();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('preparing');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [queueFilter, setQueueFilter] = useState<'all' | 'store' | 'delivery'>('all');
  const [inProgressFilter, setInProgressFilter] = useState<'all' | 'store' | 'delivery'>('all');
  const [readyFilter, setReadyFilter] = useState<'all' | 'store' | 'delivery'>('all');
  const [pickedUpFilter, setPickedUpFilter] = useState<'all' | 'store' | 'delivery'>('all');
  const navigate = useNavigate();
  
  const isKitchenStaff = isSuperAdmin || ['admin', 'restaurant_owner', 'chef'].includes(currentUser?.role || '');

  // Se não for funcionário da cozinha, mostrar mensagem de acesso negado
  if (!isKitchenStaff) {
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
                Esta página é destinada apenas para funcionários da cozinha.
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
  
  const handleStartPreparation = async (orderId: number) => {
    try {
      // Atualizar no Supabase primeiro
      await supabase
        .from('orders')
        .update({ 
          status: 'in_progress',
          assigned_to: currentUser?.name || null 
        })
        .eq('id', orderId);
      
      // Atualizar estado local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'in_progress', assignedTo: currentUser?.name || null }
            : order
        )
      );
      
      const orderTable = orders.find(o => o.id === orderId)?.table;
      toast({
        title: "Preparo iniciado",
        description: `Você começou a preparar o pedido de ${orderTable}`,
      });
      
      // Fechar o modal se estiver aberto
      setDetailsOpen(false);
    } catch (error) {
      console.error('Erro ao iniciar preparo:', error);
      toast({
        title: "Erro ao iniciar preparo",
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  };
  
  const handleFinishPreparation = async (orderId: number) => {
    try {
      // Atualizar no Supabase primeiro
      await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);
      
      // Atualizar estado local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'ready' }
            : order
        )
      );
      
      const orderTable = orders.find(o => o.id === orderId)?.table;
      toast({
        title: "Pedido pronto",
        description: `O pedido de ${orderTable} está pronto para entrega`,
      });
      
      // Fechar o modal se estiver aberto
      setDetailsOpen(false);
    } catch (error) {
      console.error('Erro ao finalizar preparo:', error);
      toast({
        title: "Erro ao finalizar preparo",
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  };
  
  const handlePickedUp = async (orderId: number) => {
    try {
      // Atualizar no Supabase primeiro
      await supabase
        .from('orders')
        .update({ status: 'picked_up' })
        .eq('id', orderId);
      
      // Atualizar estado local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'picked_up' }
            : order
        )
      );
      
      const orderTable = orders.find(o => o.id === orderId)?.table;
      toast({
        title: "Pedido retirado",
        description: `O pedido de ${orderTable} foi retirado com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao marcar como retirado:', error);
      toast({
        title: "Erro ao marcar como retirado",
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive'
      });
    }
  };
  
  const handleOpenDetails = async (order: typeof orders[0]) => {
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .select('order_id, quantity, price, notes, product_id')
        .eq('order_id', order.id);
      if (itemsError || !itemsData) throw itemsError;
      const productIds = Array.from(new Set(itemsData.map(item => item.product_id)));
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('id, name, image_url')
        .in('id', productIds);
      if (productsError || !productsData) throw productsError;
      const productMap: Record<number, { name: string; image_url?: string }> = {};
      productsData.forEach(p => { productMap[p.id] = { name: p.name, image_url: p.image_url ?? undefined }; });
      const fetchedItems = itemsData.map(item => ({
        name: productMap[item.product_id]?.name || 'Produto Desconhecido',
        image: productMap[item.product_id]?.image_url,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes || undefined
      }));
      setSelectedOrder({ ...order, items: fetchedItems });
      setDetailsOpen(true);
    } catch (e) {
      console.error('Erro ao carregar detalhes do pedido:', e);
      toast({ title: 'Erro ao carregar detalhes', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    }
  };
  
  const handleCancelOrder = (orderId: number) => {
    setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
  };

  // Pedidos na fila (inclui pedidos 'queued' = 'pending' do delivery e 'preparing' do fluxo interno)
  // Exibir todos os pedidos sem filtrar por status, para garantir que todos apareçam
  const allOrders = orders;
  // Restaurando variáveis queuedOrders, inProgressOrders, readyOrders e pickedUpOrders filtrando o array orders conforme o status, sem alterar layout ou UX.
  const queuedOrders = orders.filter(order => {
    const statusMatch = order.status === 'preparing' || order.status === 'queued' || order.status === 'pending';
    if (!statusMatch) return false;
    if (queueFilter === 'all') return true;
    if (queueFilter === 'store' && !order.isDelivery) return true;
    if (queueFilter === 'delivery' && order.isDelivery) return true;
    return false;
  });
  const inProgressOrders = orders.filter(order => {
    const statusMatch = order.status === 'in_progress';
    if (!statusMatch) return false;
    if (inProgressFilter === 'all') return true;
    if (inProgressFilter === 'store' && !order.isDelivery) return true;
    if (inProgressFilter === 'delivery' && order.isDelivery) return true;
    return false;
  });
  const readyOrders = orders.filter(order => {
    const statusMatch = order.status === 'ready';
    if (!statusMatch) return false;
    if (readyFilter === 'all') return true;
    if (readyFilter === 'store' && !order.isDelivery) return true;
    if (readyFilter === 'delivery' && order.isDelivery) return true;
    return false;
  });
  const pickedUpOrders = orders.filter(order => {
    const statusMatch = order.status === 'picked_up';
    if (!statusMatch) return false;
    if (pickedUpFilter === 'all') return true;
    if (pickedUpFilter === 'store' && !order.isDelivery) return true;
    if (pickedUpFilter === 'delivery' && order.isDelivery) return true;
    return false;
  });

  const fetchOrders = async () => {
    try {
      console.log('Buscando pedidos da cozinha...');
      
      // Usar o hook multi-tenant para buscar pedidos
      // Buscar pedidos com status específicos da cozinha
      const result = await getOrders({ 
        status: undefined // Não filtrar por status específico, buscar todos
      });
      
      // Verificar se o resultado é válido e extrair os dados
      let ordersData: any[] = [];
      if (result && Array.isArray(result)) {
        ordersData = result;
      } else if (result && typeof result === 'object' && 'data' in result && Array.isArray(result.data)) {
        ordersData = result.data;
      } else {
        console.warn('Dados de pedidos inválidos:', result);
        setOrders([]);
        return;
      }
      
      console.log('Pedidos encontrados:', ordersData.length);
      
      if (ordersData.length === 0) {
        setOrders([]);
        return;
      }
      
      // Filtrar apenas pedidos relevantes para a cozinha
      const kitchenRelevantOrders = ordersData.filter(order => 
        order && order.status && ['preparing', 'in_progress', 'ready', 'picked_up', 'pending'].includes(order.status)
      );
      
      console.log('Pedidos relevantes para cozinha:', kitchenRelevantOrders.length);
      
      setOrders(kitchenRelevantOrders.map(order => {
        // Os itens já vêm incluídos pela consulta com join
        const orderItems = order.order_items?.map((item: any) => ({
          name: item.name || 'Produto Desconhecido',
          quantity: item.quantity,
          price: item.price,
          notes: item.notes || undefined,
          image: item.image_url
        })) || [];
          
        return {
          ...order,
          items: orderItems
        };
      }));
    } catch (e) {
      console.error('Erro ao buscar pedidos:', e);
      toast({ title: 'Erro ao buscar pedidos', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
      
      // Fallback para localStorage se houver erro
      const kitchenOrders = JSON.parse(localStorage.getItem('kitchenOrders') || '[]');
      setOrders(kitchenOrders);
    }
  };
  
  useEffect(() => {
    // Carregar estado dos filtros do localStorage quando o componente montar
    const loadFilterStates = () => {
      try {
        const savedFilters = localStorage.getItem(`kitchen_filters_${currentUser?.id}`);
        if (savedFilters) {
          const settings = JSON.parse(savedFilters);
          setQueueFilter(settings.queueFilter || 'all');
          setInProgressFilter(settings.inProgressFilter || 'all');
          setReadyFilter(settings.readyFilter || 'all');
          setPickedUpFilter(settings.pickedUpFilter || 'all');
        }
      } catch (e) {
        console.error('Erro ao processar filtros:', e);
      }
    };
    
    if (currentUser?.id) {
      loadFilterStates();
    }
    
    fetchOrders();
  }, [currentUser?.id]);
  
  // Função para salvar um estado de filtro no localStorage
  const saveFilterState = (tabName: string, filterValue: 'all' | 'store' | 'delivery') => {
    if (!currentUser?.id) return;
    
    try {
      // Buscar configurações atuais do localStorage
      const savedFilters = localStorage.getItem(`kitchen_filters_${currentUser.id}`);
      const currentSettings = savedFilters ? JSON.parse(savedFilters) : {};
      
      const updatedSettings = { 
        ...currentSettings,
        [tabName + 'Filter']: filterValue
      };
      
      // Salvar configurações atualizadas
      localStorage.setItem(`kitchen_filters_${currentUser.id}`, JSON.stringify(updatedSettings));
    } catch (e) {
      console.error('Erro ao processar salvamento de filtro:', e);
    }
  };
  
  // Handlers para cada filtro de tab
  const handleQueueFilterChange = (value: 'all' | 'store' | 'delivery') => {
    setQueueFilter(value);
    saveFilterState('queue', value);
  };
  
  const handleInProgressFilterChange = (value: 'all' | 'store' | 'delivery') => {
    setInProgressFilter(value);
    saveFilterState('inProgress', value);
  };
  
  const handleReadyFilterChange = (value: 'all' | 'store' | 'delivery') => {
    setReadyFilter(value);
    saveFilterState('ready', value);
  };
  
  const handlePickedUpFilterChange = (value: 'all' | 'store' | 'delivery') => {
    setPickedUpFilter(value);
    saveFilterState('pickedUp', value);
  };

  const renderOrderCard = (order: typeof orders[0]) => (
    <Card key={order.id} className="overflow-hidden mb-4">
      <div className={`h-2 ${
        order.status === 'preparing' || order.status === 'queued' ? 'bg-yellow-500' : 
        order.status === 'in_progress' ? 'bg-blue-500' : 
        order.status === 'ready' ? 'bg-green-500' : 'bg-gray-500'
      }`}></div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2">
            #{order.id} {!order.isDelivery && order.table && <span className="font-medium">Mesa {order.table}</span>}
            {order.isDelivery && (
              <Badge className="bg-indigo-100 text-indigo-800">Delivery</Badge>
            )}
          </CardTitle>
          <Badge className={`${
            order.status === 'preparing' || order.status === 'queued' ? 'bg-yellow-100 text-yellow-800' : 
            order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
            order.status === 'ready' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {order.status === 'preparing' || order.status === 'queued' ? 'Na fila' : 
             order.status === 'in_progress' ? 'Em preparo' : 
             order.status === 'ready' ? 'Pronto' : 'Retirado'}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          {new Date(order.createdAt).toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Itens</h4>
            <ul className="space-y-2">
              {order.items.map((item, index) => (
                <li key={index} className="flex flex-col">
                  <div className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.notes && (
                    <span className="text-xs text-red-500 italic">{item.notes}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
          
          <Separator />
          
          <div className="pt-2 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total: R$ {order.total.toFixed(2)}</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={() => handleOpenDetails(order)}
              >
                <ClipboardList className="h-4 w-4" />
                Detalhes
              </Button>
            </div>
            
            {(order.status === 'preparing' || order.status === 'queued') && (
              <Button 
                className="w-full"
                onClick={() => handleStartPreparation(order.id)}
              >
                Iniciar Preparo
              </Button>
            )}
            
            {order.status === 'in_progress' && (
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => handleFinishPreparation(order.id)}
              >
                Marcar como Pronto
              </Button>
            )}
            
            {order.status === 'ready' && (
              <Button 
                className="w-full"
                variant="outline"
                onClick={() => handlePickedUp(order.id)}
              >
                Confirmar Retirada
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Gerenciamento de Cozinha</h1>
          <Button variant="outline" onClick={() => navigate('/order-management')}>
            Ver Mesas
          </Button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="preparing" className="flex items-center gap-2">
              Na Fila
              {queuedOrders.length > 0 && (
                <Badge variant="outline" className="ml-1">{queuedOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="flex items-center gap-2">
              Em Preparo
              {inProgressOrders.length > 0 && (
                <Badge variant="outline" className="ml-1">{inProgressOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="ready" className="flex items-center gap-2">
              Prontos
              {readyOrders.length > 0 && (
                <Badge variant="outline" className="ml-1">{readyOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="picked_up" className="flex items-center gap-2">
              Retirados
              {pickedUpOrders.length > 0 && (
                <Badge variant="outline" className="ml-1">{pickedUpOrders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="preparing" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pedidos na Fila</h2>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2 items-center">
                    <Filter className="h-4 w-4" />
                    {queueFilter === 'all' ? 'Todos os Pedidos' : 
                     queueFilter === 'store' ? 'Pedidos da Loja' : 'Pedidos Delivery'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar Pedidos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={queueFilter} onValueChange={(v) => handleQueueFilterChange(v as 'all' | 'store' | 'delivery')}>
                    <DropdownMenuRadioItem value="all">Todos os Pedidos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="store">Pedidos da Loja</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="delivery">Pedidos Delivery</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {queuedOrders.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Não há pedidos na fila no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {queuedOrders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="in_progress" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pedidos em Preparo</h2>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2 items-center">
                    <Filter className="h-4 w-4" />
                    {inProgressFilter === 'all' ? 'Todos os Pedidos' : 
                     inProgressFilter === 'store' ? 'Pedidos da Loja' : 'Pedidos Delivery'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar Pedidos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={inProgressFilter} onValueChange={(v) => handleInProgressFilterChange(v as 'all' | 'store' | 'delivery')}>
                    <DropdownMenuRadioItem value="all">Todos os Pedidos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="store">Pedidos da Loja</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="delivery">Pedidos Delivery</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {inProgressOrders.length === 0 ? (
              <div className="text-center py-8">
                <UtensilsCrossed className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Não há pedidos em preparo no momento</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inProgressOrders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ready" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pedidos Prontos</h2>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2 items-center">
                    <Filter className="h-4 w-4" />
                    {readyFilter === 'all' ? 'Todos os Pedidos' : 
                     readyFilter === 'store' ? 'Pedidos da Loja' : 'Pedidos Delivery'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar Pedidos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={readyFilter} onValueChange={(v) => handleReadyFilterChange(v as 'all' | 'store' | 'delivery')}>
                    <DropdownMenuRadioItem value="all">Todos os Pedidos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="store">Pedidos da Loja</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="delivery">Pedidos Delivery</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {readyOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Não há pedidos prontos para retirada</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {readyOrders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="picked_up" className="mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Pedidos Retirados</h2>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex gap-2 items-center">
                    <Filter className="h-4 w-4" />
                    {pickedUpFilter === 'all' ? 'Todos os Pedidos' : 
                     pickedUpFilter === 'store' ? 'Pedidos da Loja' : 'Pedidos Delivery'}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filtrar Pedidos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={pickedUpFilter} onValueChange={(v) => handlePickedUpFilterChange(v as 'all' | 'store' | 'delivery')}>
                    <DropdownMenuRadioItem value="all">Todos os Pedidos</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="store">Pedidos da Loja</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="delivery">Pedidos Delivery</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {pickedUpOrders.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Não há pedidos retirados recentemente</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pickedUpOrders.map(renderOrderCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Detalhes do Pedido */}
      {selectedOrder && (
        <KitchenOrderDetails
          order={selectedOrder}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onStartPreparation={handleStartPreparation}
          onFinishPreparation={handleFinishPreparation}
          onCancelOrder={handleCancelOrder}
        />
      )}
    </div>
  );
};

export default KitchenManagement;
