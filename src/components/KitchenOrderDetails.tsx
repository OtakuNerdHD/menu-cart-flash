import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogClose
} from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ClipboardList, Phone, MapPin, CircleAlert, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  image?: string;
}

interface OrderProps {
  id: number;
  table?: string;
  table_name?: string;
  status: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  created_at?: string;
  assignedTo: string | null;
  isDelivery?: boolean;
  order_type?: 'in_store' | 'delivery' | 'pickup';
  customer?: {
    name?: string;
    phone?: string;
    address?: string;
  };
  deliveryFee?: number;
  delivery_address?: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  } | null;
}

interface KitchenOrderDetailsProps {
  order: OrderProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStartPreparation?: (orderId: number) => void;
  onFinishPreparation?: (orderId: number) => void;
  onCancelOrder?: (orderId: number) => void;
}

const KitchenOrderDetails: React.FC<KitchenOrderDetailsProps> = ({
  order,
  open,
  onOpenChange,
  onStartPreparation,
  onFinishPreparation,
  onCancelOrder
}) => {
  const [currentStatus, setCurrentStatus] = useState(order.status);
  const isMobile = useIsMobile();
  
  // Item placeholders - em produção isso viria de um banco de imagens
  const itemPlaceholders = [
    "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
  ];

  const handleStartPreparation = () => {
    if (onStartPreparation) {
      onStartPreparation(order.id);
    }
    setCurrentStatus('in_progress');
    toast({
      title: "Preparo iniciado",
      description: `Você começou a preparar o pedido #${order.id}`
    });
  };

  const handleFinishPreparation = () => {
    if (onFinishPreparation) {
      onFinishPreparation(order.id);
    }
    setCurrentStatus('ready');
    toast({
      title: "Pedido pronto",
      description: `O pedido #${order.id} está pronto para entrega`
    });
  };

  const handleCancelOrder = () => {
    if (onCancelOrder) {
      onCancelOrder(order.id);
    }
    onOpenChange(false);
    toast({
      title: "Pedido cancelado",
      description: `O pedido #${order.id} foi cancelado`,
      variant: "destructive"
    });
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'queued':
      case 'pending':
      case 'preparing':
        return 'Pendente';
      case 'in_progress':
        return 'Em preparo';
      case 'ready':
        return 'Pronto';
      case 'delivered':
      case 'completed':
        return 'Entregue';
      case 'picked_up':
        return 'Retirado';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
      case 'pending':
      case 'preparing':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-green-100 text-green-800';
      case 'delivered':
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    
    const date = new Date(dateString);
    
    // Verificar se a data é válida
    if (isNaN(date.getTime())) {
      // Tentar formatos alternativos comuns
      const alternativeDate = new Date(dateString.replace(' ', 'T'));
      if (isNaN(alternativeDate.getTime())) {
        return 'Data inválida';
      }
    }
    
    const now = new Date();
    
    // Se for hoje, mostrar "há X minutos/horas"
    if (date.toDateString() === now.toDateString()) {
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / 60000);
      
      if (diffMins < 1) return 'agora mesmo';
      if (diffMins < 60) return `há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
      
      const diffHours = Math.floor(diffMins / 60);
      return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    }
    
    // Se for outro dia, mostrar a data
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const subtotal = order.total - (order.deliveryFee || 0);

  return (
    <>
      {/* Desktop: mantém Dialog centralizado e layout original */}
      {!isMobile && (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(currentStatus)}>
                    {getStatusText(currentStatus)}
                  </Badge>
                  <DialogTitle className="text-2xl flex items-center gap-2">
                    {order.order_type === 'delivery' ? 'Pedido Delivery' : (order.table_name || order.table || 'Mesa')}
                    {order.order_type === 'delivery' && (
                      <Badge className="bg-indigo-100 text-indigo-800">Delivery</Badge>
                    )}
                    {order.order_type === 'pickup' && (
                      <Badge className="bg-orange-100 text-orange-800">Retirada</Badge>
                    )}
                    {order.order_type === 'in_store' && (
                      <Badge className="bg-green-100 text-green-800">Mesa</Badge>
                    )}
                  </DialogTitle>
                </div>
                <span className="text-sm text-gray-500">
                    {formatTime(order.created_at || order.createdAt)}
                  </span>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Coluna da esquerda - Itens do Pedido */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <ClipboardList className="h-5 w-5 text-gray-600" />
                  <h2 className="text-xl font-semibold">Itens do Pedido</h2>
                </div>

                <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                        <img
                          src={item.image || itemPlaceholders[index % itemPlaceholders.length]}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between">
                          <div>
                            {item.quantity > 1 && (
                              <span className="font-medium text-lg mr-1">{item.quantity}x</span>
                            )}
                            <span className="font-semibold">{item.name}</span>
                          </div>
                          <span className="font-medium text-sm">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.notes && (
                          <p className="text-sm text-red-500 italic mt-1">{item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <Separator className="my-4" />
                
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-sm">R$ {subtotal.toFixed(2)}</span>
                  </div>
                  
                  {(order.order_type === 'delivery') && order.deliveryFee && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600">Taxa de entrega</span>
                      <span className="text-sm">R$ {order.deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between font-bold text-base mt-2">
                    <span>Total</span>
                    <span>R$ {order.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              {/* Coluna da direita - Detalhes do Cliente */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  {order.order_type === 'delivery' ? (
                    <>
                      <Badge className="bg-indigo-100 text-indigo-800 px-2 py-1">Delivery</Badge>
                      <h2 className="text-xl font-semibold">Detalhes do Cliente</h2>
                    </>
                  ) : order.order_type === 'in_store' ? (
                    <>
                      <Badge className="bg-blue-100 text-blue-800 px-2 py-1">Cliente local</Badge>
                      <h2 className="text-xl font-semibold">{order.table_name || order.table || 'Mesa'}</h2>
                    </>
                  ) : (
                    <>
                      <Badge className="bg-green-100 text-green-800 px-2 py-1">Retirada</Badge>
                      <h2 className="text-xl font-semibold">Detalhes da Retirada</h2>
                    </>
                  )}
                </div>
                
                {order.order_type === 'delivery' && (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-md">
                    <div>
                      <h3 className="font-medium">{order.customer?.name || 'Cliente Delivery'}</h3>
                    </div>
                    
                    {order.customer?.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-600" />
                        <span>{order.customer.phone}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500 text-sm">Aguardando estrutura</span>
                      </div>
                    )}
                    
                    {order.customer?.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                        <span>{order.customer.address}</span>
                      </div>
                    )}
                    
                    {order.delivery_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                        <span>
                          {order.delivery_address.street}, {order.delivery_address.number}
                          {order.delivery_address.complement && ` - ${order.delivery_address.complement}`}
                          <br />
                          {order.delivery_address.neighborhood} - {order.delivery_address.city}/{order.delivery_address.state}
                          <br />
                          CEP: {order.delivery_address.zipcode}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {order.order_type === 'in_store' && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p>Cliente em loja: {order.table_name || order.table || 'Mesa'}</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Pedido para consumo no local.
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-500 text-sm">Aguardando estrutura</span>
                    </div>
                  </div>
                )}
                
                {order.order_type === 'pickup' && (
                  <div className="bg-gray-50 p-4 rounded-md">
                    <p className="font-medium">Retirada em loja</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Cliente retirará o pedido no balcão.
                    </p>
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800">
                        <strong>Aguardando estrutura:</strong> Informações do cliente serão adicionadas em breve.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="mt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <CircleAlert className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Status do Pedido</h2>
                  </div>
                  
                  <Badge className={`${getStatusColor(currentStatus)} text-base px-3 py-1`}>
                    {getStatusText(currentStatus)}
                  </Badge>
                  
                  {order.assignedTo && (
                    <p className="mt-2 text-sm text-gray-600">
                      Atribuído a: <span className="font-semibold">{order.assignedTo}</span>
                    </p>
                  )}
                </div>

                <div className="mt-6 space-y-3">
                  {(currentStatus === 'queued' || currentStatus === 'pending') && (
                    <Button 
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={handleStartPreparation}
                    >
                      Iniciar preparo
                    </Button>
                  )}
                  
                  {currentStatus === 'in_progress' && (
                    <Button 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={handleFinishPreparation}
                    >
                      Marcar como pronto
                    </Button>
                  )}
                  
                  <Button 
                    variant="destructive" 
                    className="w-full" 
                    onClick={handleCancelOrder}
                  >
                    Cancelar pedido
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Mostrar ID do pedido */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <ClipboardList className="h-4 w-4" />
              <span>Pedido #{order.id}</span>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Mobile: bottom sheet (90%–100% height), arrastar para fechar + botão X */}
      {isMobile && (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="min-h-[90vh] max-h-[100vh]">
            <DrawerHeader className="border-b relative">
              <DrawerTitle>Pedido #{order.id}</DrawerTitle>
              <DrawerClose asChild>
                <button aria-label="Fechar" className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </DrawerClose>
            </DrawerHeader>
            {/* Conteúdo idêntico ao desktop, apenas dentro do Drawer com scroll interno */}
            <div className="p-4 overflow-y-auto min-h-[calc(90vh-88px)] max-h-[calc(100vh-88px)]">
              {/* Cabeçalho do conteúdo */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(currentStatus)}>
                    {getStatusText(currentStatus)}
                  </Badge>
                  <span className="text-sm text-gray-500">{formatTime(order.created_at || order.createdAt)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coluna da esquerda - Itens do Pedido */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <ClipboardList className="h-5 w-5 text-gray-600" />
                    <h2 className="text-xl font-semibold">Itens do Pedido</h2>
                  </div>

                  <div className="space-y-5 max-h-[300px] overflow-y-auto pr-2">
                    {order.items.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                          <img
                            src={item.image || itemPlaceholders[index % itemPlaceholders.length]}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex justify-between">
                            <div>
                              {item.quantity > 1 && (
                                <span className="font-medium text-lg mr-1">{item.quantity}x</span>
                              )}
                              <span className="font-semibold">{item.name}</span>
                            </div>
                            <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                          {item.notes && (
                            <p className="text-sm text-red-500 italic mt-1">{item.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span>R$ {subtotal.toFixed(2)}</span>
                    </div>
                    
                    {(order.order_type === 'delivery') && order.deliveryFee && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Taxa de entrega</span>
                        <span>R$ {order.deliveryFee.toFixed(2)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold text-lg mt-2">
                      <span>Total</span>
                      <span>R$ {order.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                
                {/* Coluna da direita - Detalhes do Cliente */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    {order.order_type === 'delivery' ? (
                      <>
                        <Badge className="bg-indigo-100 text-indigo-800 px-2 py-1">Delivery</Badge>
                        <h2 className="text-xl font-semibold">Detalhes do Cliente</h2>
                      </>
                    ) : order.order_type === 'in_store' ? (
                      <>
                        <Badge className="bg-blue-100 text-blue-800 px-2 py-1">Cliente local</Badge>
                        <h2 className="text-xl font-semibold">{order.table_name || order.table || 'Mesa'}</h2>
                      </>
                    ) : (
                      <>
                        <Badge className="bg-green-100 text-green-800 px-2 py-1">Retirada</Badge>
                        <h2 className="text-xl font-semibold">Detalhes da Retirada</h2>
                      </>
                    )}
                  </div>
                  
                  {order.order_type === 'delivery' && (
                    <div className="space-y-3 bg-gray-50 p-4 rounded-md">
                      <div>
                        <h3 className="font-medium">{order.customer?.name || 'Cliente Delivery'}</h3>
                      </div>
                      
                      {order.customer?.phone ? (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-600" />
                          <span>{order.customer.phone}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-500 text-sm">Aguardando estrutura</span>
                        </div>
                      )}
                      
                      {order.customer?.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                          <span>{order.customer.address}</span>
                        </div>
                      )}
                      
                      {order.delivery_address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-gray-600 mt-1" />
                          <span>
                            {order.delivery_address.street}, {order.delivery_address.number}
                            {order.delivery_address.complement && ` - ${order.delivery_address.complement}`}
                            <br />
                            {order.delivery_address.neighborhood} - {order.delivery_address.city}, {order.delivery_address.state}
                            <br />
                            CEP: {order.delivery_address.zipcode}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {order.order_type === 'in_store' && (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p>Cliente em loja: {order.table_name || order.table || 'Mesa'}</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Pedido para consumo no local.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500 text-sm">Aguardando estrutura</span>
                      </div>
                    </div>
                  )}
                  
                  {order.order_type === 'pickup' && (
                    <div className="bg-gray-50 p-4 rounded-md">
                      <p className="font-medium">Retirada em loja</p>
                      <p className="text-sm text-gray-500 mt-2">
                        Cliente retirará o pedido no balcão.
                      </p>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <p className="text-sm text-yellow-800">
                          <strong>Aguardando estrutura:</strong> Informações do cliente serão adicionadas em breve.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CircleAlert className="h-5 w-5 text-gray-600" />
                      <h2 className="text-lg font-semibold">Status do Pedido</h2>
                    </div>
                    
                    <Badge className={`${getStatusColor(currentStatus)} text-base px-3 py-1`}>
                      {getStatusText(currentStatus)}
                    </Badge>
                    
                    {order.assignedTo && (
                      <p className="mt-2 text-sm text-gray-600">
                        Atribuído a: <span className="font-semibold">{order.assignedTo}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-6 space-y-3">
                    {(currentStatus === 'queued' || currentStatus === 'pending') && (
                      <Button 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        onClick={handleStartPreparation}
                      >
                        Iniciar preparo
                      </Button>
                    )}
                    
                    {currentStatus === 'in_progress' && (
                      <Button 
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={handleFinishPreparation}
                      >
                        Marcar como pronto
                      </Button>
                    )}
                    
                    <Button 
                      variant="destructive" 
                      className="w-full" 
                      onClick={handleCancelOrder}
                    >
                      Cancelar pedido
                    </Button>
                  </div>
                </div>
              </div>

              {/* Mostrar ID do pedido */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ClipboardList className="h-4 w-4" />
                <span>Pedido #{order.id}</span>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
};

export default KitchenOrderDetails;
