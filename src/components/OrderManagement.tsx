
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Order {
  id: number;
  user_id?: string;
  restaurant_id?: number;
  table_id?: number;
  status: string;
  total_amount?: number;
  total?: number;
  payment_status?: string;
  created_at: string;
  order_items?: OrderItem[];
}

interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price?: number;
  price?: number;
  notes?: string;
}

const OrderManagement = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { currentTeam, isAdminMode } = useMultiTenant();

  const fetchOrders = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from('orders')
        .select(`
          *,
          order_items(*)
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtro de team se não for modo admin
      if (!isAdminMode && currentTeam) {
        query = query.eq('team_id', currentTeam.id);
      }

      // Aplicar filtro de status se selecionado
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar pedidos:', error);
        toast({
          title: "Erro ao carregar pedidos",
          description: "Não foi possível carregar os pedidos. Tente novamente.",
          variant: "destructive"
        });
        return;
      }

      // Verificar se data é um array antes de usar map
      if (Array.isArray(data)) {
        const mappedOrders: Order[] = data.map(order => ({
          id: order.id,
          user_id: order.user_id,
          restaurant_id: order.restaurant_id,
          table_id: order.table_id,
          status: order.status || 'pending',
          total_amount: order.total_amount || order.total || 0,
          payment_status: order.payment_status || 'pending',
          created_at: order.created_at,
          order_items: Array.isArray(order.order_items) ? order.order_items : []
        }));
        setOrders(mappedOrders);
      } else {
        console.error('Dados retornados não são um array:', data);
        setOrders([]);
      }
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: "Erro ao carregar pedidos",
        description: "Erro inesperado ao carregar pedidos.",
        variant: "destructive"
      });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      let query = supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      // Aplicar filtro de team se não for modo admin
      if (!isAdminMode && currentTeam) {
        query = query.eq('team_id', currentTeam.id);
      }

      const { error } = await query;

      if (error) {
        console.error('Erro ao atualizar status:', error);
        toast({
          title: "Erro ao atualizar pedido",
          description: "Não foi possível atualizar o status do pedido.",
          variant: "destructive"
        });
        return;
      }

      // Atualizar o estado local
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );

      toast({
        title: "Status atualizado",
        description: `Pedido #${orderId} foi atualizado para ${getStatusLabel(newStatus)}.`,
      });
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: "Erro ao atualizar pedido",
        description: "Erro inesperado ao atualizar o pedido.",
        variant: "destructive"
      });
    }
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      preparing: 'Preparando',
      ready: 'Pronto',
      delivered: 'Entregue',
      cancelled: 'Cancelado'
    };
    return statusLabels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'preparing':
        return <Package className="h-4 w-4" />;
      case 'ready':
        return <CheckCircle className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, currentTeam, isAdminMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Gerenciamento de Pedidos</h1>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="preparing">Preparando</SelectItem>
            <SelectItem value="ready">Pronto</SelectItem>
            <SelectItem value="delivered">Entregue</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {orders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum pedido encontrado
            </h3>
            <p className="text-gray-500 text-center">
              {statusFilter === 'all' 
                ? 'Não há pedidos para exibir no momento.'
                : `Não há pedidos com status "${getStatusLabel(statusFilter)}".`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Pedido #{order.id}
                      <Badge className={getStatusColor(order.status)}>
                        {getStatusIcon(order.status)}
                        {getStatusLabel(order.status)}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      {new Date(order.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      R$ {(order.total_amount || 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mesa: {order.table_id || 'N/A'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Itens do pedido:</h4>
                    <div className="space-y-2">
                      {order.order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                          <div>
                            <span className="font-medium">
                              {item.quantity}x Produto #{item.product_id}
                            </span>
                            {item.notes && (
                              <p className="text-sm text-gray-600">
                                Observações: {item.notes}
                              </p>
                            )}
                          </div>
                          <span className="font-medium">
                            R$ {((item.unit_price || item.price || 0) * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'preparing')}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Iniciar Preparo
                      </Button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'ready')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Marcar como Pronto
                      </Button>
                    )}
                    
                    {order.status === 'ready' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Marcar como Entregue
                      </Button>
                    )}
                    
                    {!['delivered', 'cancelled'].includes(order.status) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateOrderStatus(order.id, 'cancelled')}
                      >
                        Cancelar Pedido
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrderManagement;
