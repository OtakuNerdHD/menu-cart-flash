
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogClose 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Edit, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
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

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ 
  order, 
  open, 
  onOpenChange,
  currentUserRole
}) => {
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'preparing' | 'ready'>('pending');
  
  const handleSendToKitchen = () => {
    setCurrentStatus('preparing');
    toast({
      title: "Pedido enviado para a cozinha",
      description: `O pedido da ${order.table} foi enviado para preparo`,
    });
  };
  
  const handleReleaseTable = () => {
    toast({
      title: "Mesa liberada",
      description: `A ${order.table} foi liberada com sucesso`,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl flex items-center gap-2">
              {order.table}
              <Button variant="outline" size="icon" className="h-7 w-7">
                <Edit className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogClose className="h-6 w-6 rounded-full opacity-70 ring-offset-background transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </DialogClose>
          </div>
        </DialogHeader>
        
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`px-3 py-1 ${currentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : currentStatus === 'preparing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {currentStatus === 'pending' ? 'Pendente' : 
             currentStatus === 'preparing' ? 'Em produção' : 'Entregue'}
          </Badge>
          <span className="text-gray-600 text-sm">Sendo atendido por {order.assignedTo || "ninguém"}</span>
        </div>
        
        <h3 className="font-bold text-lg mb-2">Itens do Pedido</h3>
        
        <div className="space-y-4 mb-4">
          {order.items.map((item, index) => (
            <div key={index} className="flex items-start gap-3">
              <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                <div className="w-full h-full bg-gray-300 flex items-center justify-center">
                  <Separator className="w-full" />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex justify-between">
                  <h4 className="font-semibold">{item.name}</h4>
                  <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                </div>
                {item.notes && (
                  <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                )}
              </div>
              
              <Button 
                variant="outline" 
                size="icon" 
                className="flex-shrink-0 h-8 w-8"
                onClick={() => {
                  toast({
                    title: "Edição de item",
                    description: "Esta funcionalidade será implementada em breve",
                  });
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        <Separator className="my-4" />
        
        <div className="flex justify-between items-center text-lg font-bold mb-6">
          <span>Total</span>
          <span>R$ {order.total.toFixed(2)}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={handleSendToKitchen}
            disabled={currentStatus !== 'pending'}
          >
            Mandar p/ Cozinha
          </Button>
          
          <Button 
            variant="destructive"
            className="w-full"
            onClick={handleReleaseTable}
          >
            Liberar Mesa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsDialog;
