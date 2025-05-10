
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, UtensilsCrossed, CheckCircle, ClipboardList, RefreshCw } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import KitchenOrderDetails from '@/components/KitchenOrderDetails';
import { supabase } from '@/integrations/supabase/client';

const KitchenManagement = () => {
  const { currentUser } = useUserSwitcher();
  const [orders, setOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('queued');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const isKitchenStaff = ['admin', 'restaurant_owner', 'chef'].includes(currentUser?.role || '');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Buscar pedidos do Supabase
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product:product_id(name, price, image_url)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pedidos da cozinha:', error);
        setIsLoading(false);
        return;
      }

      if (ordersData && ordersData.length > 0) {
        // Formatar os dados dos pedidos para a cozinha
        const formattedOrders = ordersData.map(order => {
          // Mapear status do pedido para status da cozinha
          let kitchenStatus;
          switch (order.status) {
            case 'pending':
              kitchenStatus = 'queued';
              break;
            case 'preparing':
              kitchenStatus = 'in_progress';
              break;
            case 'ready':
            case 'delivered':
              kitchenStatus = 'ready';
              break;
            default:
              kitchenStatus = 'queued';
          }
          
          return {
            id: order.id,
            table: order.table_name || `Mesa ${order.table_id || 'Desconhecida'}`,
            status: kitchenStatus,
            items: order.order_items.map(item => ({
              name: item.product?.name || 'Produto não encontrado',
              quantity: item.quantity,
              price: item.price || item.product?.price || 0,
              notes: item.notes,
              image_url: item.product?.image_url
            })),
            total: order.total,
            createdAt: order.created_at,
            assignedTo: order.assigned_to,
            isDelivery: order.delivery_type === 'delivery',
            customer: order.address ? {
              name: order.address.name,
              phone: order.address.phone,
              address: `${order.address.street}, ${order.address.number} - ${order.address.neighborhood}, ${order.address.city} - ${order.address.state}`
            } : null
          };
        });

        setOrders(formattedOrders);
      }
    } catch (error) {
      console.error('Erro ao processar pedidos da cozinha:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
  
  const handleStartPreparation = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'preparing',
          assigned_to: currentUser?.name || null
        })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'in_progress', assignedTo: currentUser?.name || null }
            : order
        )
      );
      
      toast({
        title: "Preparo iniciado",
        description: `Você começou a preparar o pedido da ${orders.find(o => o.id === orderId)?.table}`,
      });
    } catch (error) {
      console.error('Erro ao iniciar preparo:', error);
      toast({
        title: "Erro ao iniciar preparo",
        description: "Não foi possível iniciar o preparo. Tente novamente.",
        variant: "destructive"
      });
    }
    
    // Fechar o modal se estiver aberto
    setDetailsOpen(false);
  };
  
  const handleFinishPreparation = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'ready' })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: 'ready' }
            : order
        )
      );
      
      toast({
        title: "Pedido pronto",
        description: `O pedido da ${orders.find(o => o.id === orderId)?.table} está pronto para entrega`,
      });
    } catch (error) {
      console.error('Erro ao finalizar preparo:', error);
      toast({
        title: "Erro ao finalizar preparo",
        description: "Não foi possível marcar o pedido como pronto. Tente novamente.",
        variant: "destructive"
      });
    }
    
    // Fechar o modal se estiver aberto
    setDetailsOpen(false);
  };
  
  const handlePickedUp = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'delivered' })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      toast({
        title: "Pedido entregue",
        description: `O pedido foi marcado como entregue com sucesso`,
      });
    } catch (error) {
      console.error('Erro ao marcar pedido como entregue:', error);
      toast({
        title: "Erro ao marcar como entregue",
        description: "Não foi possível marcar o pedido como entregue. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };
  
  const handleCancelOrder = async (orderId) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      toast({
        title: "Pedido cancelado",
        description: `O pedido #${orderId} foi cancelado`,
        variant: "destructive"
      });
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast({
        title: "Erro ao cancelar pedido",
        description: "Não foi possível cancelar o pedido. Tente novamente.",
        variant: "destructive"
      });
    }
    
    setDetailsOpen(false);
  };

  const queuedOrders = orders.filter(order => order.status === 'queued');
  const inProgressOrders = orders.filter(order => order.status === 'in_progress');
  const readyOrders = orders.filter(order => order.status === 'ready');

  const renderOrderCard = (order) => (
    <Card key={order.id} className="overflow-hidden mb-4">
      <div className={`h-2 ${
        order.status === 'queued' ? 'bg-yellow-500' : 
        order.status === 'in_progress' ? 'bg-blue-500' : 
        'bg-green-500'
      }`}></div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="flex items-center gap-2">
            {order.table}
            {order.isDelivery && (
              <Badge className="bg-indigo-100 text-indigo-800">Delivery</Badge>
            )}
          </CardTitle>
          <Badge className={`${
            order.status === 'queued' ? 'bg-yellow-100 text-yellow-800' : 
            order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 
            'bg-green-100 text-green-800'
          }`}>
            {order.status === 'queued' ? 'Na fila' : 
             order.status === 'in_progress' ? 'Em preparo' : 
             'Pronto'}
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
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                  {item.notes && (
                    <span className="text-xs text-red-500">{item.notes}</span>
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
            
            {order.status === 'queued' && (
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Gerenciamento de Cozinha</h1>
            <Button 
              size="icon"
              variant="outline"
              onClick={fetchOrders}
              className="rounded-full h-8 w-8"
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button variant="outline" onClick={() => navigate('/order-management')}>
            Ver Mesas
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-menu-primary"></div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="queued" className="flex items-center gap-2">
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
            </TabsList>
            
            <TabsContent value="queued" className="mt-4">
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
          </Tabs>
        )}
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
