
import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Clock, User, Utensils } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';

// Dados de exemplo - futuramente virão da API
const mockOrders = [
  {
    id: 1,
    table: 'Mesa 10',
    status: 'pending',
    items: [
      { name: 'X-Burguer', quantity: 2, price: 15.90 },
      { name: 'Batata Frita', quantity: 1, price: 10.50 }
    ],
    total: 42.30,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    table: 'Mesa 5',
    status: 'preparing',
    items: [
      { name: 'Pizza Margherita', quantity: 1, price: 35.90 },
      { name: 'Refrigerante', quantity: 2, price: 6.00 }
    ],
    total: 47.90,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min atrás
  }
];

const getStatusColor = (status: string) => {
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

const getStatusText = (status: string) => {
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
  
  const isStaff = ['admin', 'restaurant_owner', 'waiter', 'chef'].includes(currentUser?.role || '');

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
              <Button className="mt-4" onClick={() => window.location.href = '/'}>
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
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Pedidos / Mesas</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockOrders.map(order => (
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
                      <Button className="w-full" variant={order.status === 'ready' ? 'default' : 'outline'}>
                        {order.status === 'ready' ? 'Entregar pedido' : 'Verificar status'}
                      </Button>
                    )}
                    
                    {currentUser?.role === 'chef' && (
                      <Button className="w-full" variant={order.status === 'pending' ? 'default' : 'outline'}>
                        {order.status === 'pending' ? 'Iniciar preparo' : 
                         order.status === 'preparing' ? 'Marcar como pronto' : 'Ver detalhes'}
                      </Button>
                    )}
                    
                    {(currentUser?.role === 'admin' || currentUser?.role === 'restaurant_owner') && (
                      <div className="space-y-2">
                        <Button className="w-full">
                          Alterar status
                        </Button>
                        <Button variant="outline" className="w-full">
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
      </div>
    </div>
  );
};

export default OrderManagement;
