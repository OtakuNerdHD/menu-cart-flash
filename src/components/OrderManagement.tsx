
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Clock, User, Utensils, RefreshCw } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { Dialog } from '@/components/ui/dialog';
import OrderDetailsDialog from '@/components/OrderDetailsDialog';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'preparing':
      return 'bg-blue-100 text-blue-800';
    case 'ready':
      return 'bg-green-100 text-green-800';
    case 'delivered':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusText = (status) => {
  switch (status) {
    case 'pending':
      return 'Pendente';
    case 'preparing':
      return 'Em preparo';
    case 'ready':
      return 'Pronto';
    case 'delivered':
      return 'Entregue';
    default:
      return 'Desconhecido';
  }
};

const OrderManagement = () => {
  const { currentUser } = useUserSwitcher();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  
  const isStaff = ['admin', 'restaurant_owner', 'waiter', 'chef'].includes(currentUser?.role || '');

  useEffect(() => {
    fetchOrders();

    // Configurar a escuta em tempo real para atualizações na tabela de pedidos
    const ordersSubscription = supabase
      .channel('orders-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders'
      }, () => {
        console.log('Detectada alteração em pedidos, atualizando...');
        fetchOrders();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      // Buscar pedidos do Supabase
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*');

      if (error) {
        console.error('Erro ao buscar pedidos:', error);
        loadOrdersFromLocalStorage();
        return;
      }

      if (ordersData && ordersData.length > 0) {
        console.log("Pedidos recuperados do Supabase:", ordersData);
        
        // Buscar os itens de cada pedido
        const processedOrders = await Promise.all(
          ordersData.map(async (order) => {
            // Buscar itens do pedido
            const { data: orderItemsData, error: orderItemsError } = await supabase
              .from('order_items')
              .select(`
                *,
                product:product_id (*)
              `)
              .eq('order_id', order.id);
            
            if (orderItemsError) {
              console.error('Erro ao buscar itens do pedido:', orderItemsError);
              return null;
            }

            // Processar os itens do pedido
            const items = Array.isArray(orderItemsData) ? orderItemsData.map(item => {
              const product = item.product || {};
              return {
                name: product.name || "Produto não disponível",
                quantity: item.quantity || 1,
                price: item.price || product.price || 0,
                notes: item.notes || "",
                image_url: product.image_url || null
              };
            }) : [];

            return {
              id: order.id,
              table: order.table_name || `Mesa ${order.table_id || 'Desconhecida'}`,
              status: order.status || 'pending',
              items: items,
              total: order.total || items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
              createdAt: order.created_at || new Date().toISOString(),
              assignedTo: order.assigned_to || null
            };
          })
        );

        // Filtrar pedidos nulos (que podem ter ocorrido devido a erros)
        const validOrders = processedOrders.filter(order => order !== null);
        
        setOrders(validOrders);
        // Atualizar também o localStorage como backup
        localStorage.setItem('tableOrders', JSON.stringify(validOrders));
      } else {
        console.log("Nenhum pedido encontrado no Supabase");
        // Buscar os pedidos salvos no localStorage como fallback
        loadOrdersFromLocalStorage();
      }
    } catch (error) {
      console.error('Erro ao processar pedidos:', error);
      // Buscar os pedidos salvos no localStorage como fallback
      loadOrdersFromLocalStorage();
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrdersFromLocalStorage = () => {
    const storedOrders = localStorage.getItem('tableOrders');
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (error) {
        console.error('Erro ao carregar pedidos do localStorage:', error);
      }
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchOrders();
    setTimeout(() => {
      toast({
        title: "Atualizado",
        description: "Lista de pedidos atualizada com sucesso",
      });
      setIsRefreshing(false);
    }, 800);
  };

  // Se não for funcionário, mostrar mensagem de acesso negado
  if (!isStaff) {
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
                Esta página é destinada apenas para funcionários do restaurante.
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
  
  const handleAssignTable = async (orderId) => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ assigned_to: currentUser.name })
        .eq('id', orderId);

      if (error) {
        throw error;
      }

      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, assignedTo: currentUser.name } 
            : order
        )
      );
      
      toast({
        title: "Mesa assumida com sucesso",
        description: `Você é o responsável pela ${orders.find(o => o.id === orderId)?.table}`,
      });
    } catch (error) {
      console.error('Erro ao assumir mesa:', error);
      toast({
        title: "Erro ao assumir mesa",
        description: "Não foi possível assumir a mesa. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  const handleOpenDetails = (order) => {
    setSelectedOrder(order);
    setShowDetails(true);
  };
  
  const handleKitchenManagement = () => {
    navigate('/kitchen-management');
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Gerenciamento de Pedidos / Mesas</h1>
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
          {['admin', 'restaurant_owner', 'chef'].includes(currentUser?.role || '') && (
            <Button onClick={handleKitchenManagement}>
              Acessar Cozinha
            </Button>
          )}
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-menu-primary"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-2xl font-semibold text-gray-600">Nenhum pedido encontrado</h2>
            <p className="mt-2 text-gray-500">
              Não há pedidos ativos no momento
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.map(order => (
              <Card key={order.id} className="overflow-hidden">
                <div className={`h-2 ${order.status === 'pending' ? 'bg-yellow-500' : order.status === 'preparing' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle>{order.table}</CardTitle>
                    <Badge className={getStatusColor(order.status)}>
                      {getStatusText(order.status)}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </CardDescription>
                  {order.assignedTo ? (
                    <div className="mt-1 text-sm flex items-center gap-1 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Atendido por: {order.assignedTo}</span>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm flex items-center gap-1 text-yellow-600">
                      <User className="w-4 h-4" />
                      <span>Atendimento pendente</span>
                    </div>
                  )}
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Itens</h4>
                      <ul className="space-y-2">
                        {order.items.map((item, index) => (
                          <li key={index} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between font-medium">
                      <span>Total</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                    </div>
                    
                    <div className="pt-3 space-y-2">
                      {currentUser?.role === 'waiter' && (
                        <>
                          <Button 
                            className="w-full" 
                            variant={order.status === 'ready' ? 'default' : 'outline'}
                            onClick={() => order.assignedTo ? handleOpenDetails(order) : handleAssignTable(order.id)}
                          >
                            {!order.assignedTo ? 'Assumir mesa' : order.status === 'ready' ? 'Entregar pedido' : 'Verificar status'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleOpenDetails(order)}
                          >
                            Ver detalhes
                          </Button>
                        </>
                      )}
                      
                      {currentUser?.role === 'chef' && (
                        <div className="space-y-2">
                          <Button 
                            className="w-full" 
                            variant={order.status === 'pending' ? 'default' : 'outline'}
                            onClick={handleKitchenManagement}
                          >
                            {order.status === 'pending' ? 'Iniciar preparo' : 
                             order.status === 'preparing' ? 'Marcar como pronto' : 'Ver detalhes'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleOpenDetails(order)}
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      )}
                      
                      {(currentUser?.role === 'admin' || currentUser?.role === 'restaurant_owner') && (
                        <div className="space-y-2">
                          <Button 
                            className="w-full"
                            onClick={() => !order.assignedTo ? handleAssignTable(order.id) : handleOpenDetails(order)}
                          >
                            {!order.assignedTo ? 'Assumir mesa' : 'Alterar status'}
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleOpenDetails(order)}
                          >
                            Ver detalhes
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedOrder && (
        <OrderDetailsDialog 
          order={selectedOrder}
          open={showDetails}
          onOpenChange={setShowDetails}
          currentUserRole={currentUser?.role || ''}
        />
      )}
    </div>
  );
};

export default OrderManagement;
