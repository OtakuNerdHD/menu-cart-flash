import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Clock, User } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  image_url?: string;
}

interface OrderProps {
  id: number;
  table: string;
  status: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  assignedTo: string | null;
}

interface OrderDetailsDialogProps {
  order: OrderProps;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserRole: string;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ order, open, onOpenChange, currentUserRole }) => {
  const [status, setStatus] = useState(order.status);
  
  // Item placeholders para quando não há imagem
  const itemPlaceholders = [
    "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
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
  
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'delivered';
      default:
        return currentStatus;
    }
  };
  
  const handleUpdateStatus = async () => {
    const newStatus = getNextStatus(status);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', order.id);

      if (error) throw error;
      
      setStatus(newStatus);
      toast({
        title: "Status atualizado",
        description: `Pedido atualizado para ${getStatusText(newStatus)}`
      });
      
      if (newStatus === 'delivered') {
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status do pedido",
        variant: "destructive"
      });
    }
  };
  
  const canUpdateStatus = ['admin', 'restaurant_owner', 'waiter'].includes(currentUserRole);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            <span>Pedido para {order.table}</span>
            <Badge className={getStatusColor(status)}>
              {getStatusText(status)}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              {new Date(order.createdAt).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
            
            {order.assignedTo && (
              <>
                <span className="mx-1">•</span>
                <User className="h-4 w-4" />
                <span>Atendido por: {order.assignedTo}</span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Itens do pedido</h3>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {order.items.map((item, index) => (
                <div key={index} className="flex items-start gap-3 py-2 border-b border-gray-100">
                  <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden">
                    <img
                      src={item.image_url || itemPlaceholders[index % itemPlaceholders.length]}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback para imagem padrão se a imagem não carregar
                        (e.target as HTMLImageElement).src = itemPlaceholders[index % itemPlaceholders.length];
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.quantity}x {item.name}</span>
                      <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-red-500 mt-1">{item.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <Separator />
          
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>R$ {order.total.toFixed(2)}</span>
          </div>
          
          {canUpdateStatus && status !== 'delivered' && (
            <Button 
              className="w-full" 
              onClick={handleUpdateStatus}
            >
              {status === 'pending' && 'Iniciar Preparo'}
              {status === 'preparing' && 'Marcar como Pronto'}
              {status === 'ready' && 'Confirmar Entrega'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
