
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, UtensilsCrossed, CheckCircle } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { toast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';

// Dados de exemplo - futuramente virão da API
const mockOrders = [
  {
    id: 1,
    table: 'Mesa 10',
    status: 'queued',
    items: [
      { name: 'X-Burguer', quantity: 2, price: 15.90, notes: 'Sem ketchup' },
      { name: 'Batata Frita', quantity: 1, price: 10.50 }
    ],
    total: 42.30,
    createdAt: new Date().toISOString(),
    assignedTo: null
  },
  {
    id: 2,
    table: 'Mesa 5',
    status: 'in_progress',
    items: [
      { name: 'Pizza Margherita', quantity: 1, price: 35.90 },
      { name: 'Refrigerante', quantity: 2, price: 6.00 }
    ],
    total: 47.90,
    createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 min atrás
    assignedTo: 'João'
  },
  {
    id: 3,
    table: 'Mesa 3',
    status: 'ready',
    items: [
      { name: 'Salada Caesar', quantity: 1, price: 25.90 },
      { name: 'Água sem gás', quantity: 1, price: 5.00 }
    ],
    total: 30.90,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min atrás
    assignedTo: 'João'
  }
];

const KitchenManagement = () => {
  const { currentUser } = useUserSwitcher();
  const [orders, setOrders] = useState(mockOrders);
  const [activeTab, setActiveTab] = useState('queued');
  const navigate = useNavigate();
  
  const isKitchenStaff = ['admin', 'restaurant_owner', 'chef'].includes(currentUser?.role || '');

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
  
  const handleStartPreparation = (orderId: number) => {
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
  };
  
  const handleFinishPreparation = (orderId: number) => {
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
  };
  
  const handlePickedUp = (orderId: number) => {
    setOrders(prevOrders =>
      prevOrders.map(order =>
        order.id === orderId
          ? { ...order, status: 'picked_up' }
          : order
      )
    );
    
    toast({
      title: "Pedido retirado",
      description: `O pedido da ${orders.find(o => o.id === orderId)?.table} foi retirado com sucesso`,
    });
    
    // Remover o pedido após algum tempo para limpar a interface
    setTimeout(() => {
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
    }, 3000);
  };

  const queuedOrders = orders.filter(order => order.status === 'queued');
  const inProgressOrders = orders.filter(order => order.status === 'in_progress');
  const readyOrders = orders.filter(order => order.status === 'ready');

  const renderOrderCard = (order: typeof orders[0]) => (
    <Card key={order.id} className="overflow-hidden mb-4">
      <div className={`h-2 ${
        order.status === 'queued' ? 'bg-yellow-500' : 
        order.status === 'in_progress' ? 'bg-blue-500' : 
        'bg-green-500'
      }`}></div>
      
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle>{order.table}</CardTitle>
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
          
          <div className="pt-2">
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
          <h1 className="text-2xl font-bold">Gerenciamento de Cozinha</h1>
          <Button variant="outline" onClick={() => navigate('/order-management')}>
            Ver Mesas
          </Button>
        </div>
        
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
      </div>
    </div>
  );
};

export default KitchenManagement;
