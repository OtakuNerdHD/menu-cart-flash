
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
import { Edit, X, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  notes?: string;
  image?: string;
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
  const [currentStatus, setCurrentStatus] = useState<'pending' | 'preparing' | 'ready' | 'delivered'>('pending');
  const [localOrder, setLocalOrder] = useState<OrderProps>(order);
  const [activeTab, setActiveTab] = useState('pending');
  const [editingTable, setEditingTable] = useState(false);
  const [newTableName, setNewTableName] = useState(order.table);
  
  const canEdit = ['admin', 'restaurant_owner', 'waiter'].includes(currentUserRole);
  
  // Item placeholders - em produção isso viria de um banco de imagens
  const itemPlaceholders = [
    "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38"
  ];
  
  const handleSendToKitchen = () => {
    setCurrentStatus('preparing');
    setActiveTab('preparing');
    toast({
      title: "Pedido enviado para a cozinha",
      description: `O pedido da ${localOrder.table} foi enviado para preparo`,
    });
  };
  
  const handleReleaseTable = () => {
    toast({
      title: "Mesa liberada",
      description: `A ${localOrder.table} foi liberada com sucesso`,
    });
    onOpenChange(false);
  };
  
  const handleEditTableName = () => {
    if (editingTable) {
      setLocalOrder(prev => ({...prev, table: newTableName}));
      toast({
        title: "Nome da mesa atualizado",
        description: `Mesa renomeada para ${newTableName}`,
      });
      setEditingTable(false);
    } else {
      setEditingTable(true);
    }
  };
  
  const handleEditItem = (index: number) => {
    toast({
      title: "Edição de item",
      description: "Esta funcionalidade será implementada em breve",
    });
  };
  
  const handleRemoveItem = (index: number) => {
    if (currentStatus === 'pending') {
      const newItems = [...localOrder.items];
      const removedItem = newItems[index];
      newItems.splice(index, 1);
      
      const newTotal = localOrder.total - (removedItem.price * removedItem.quantity);
      
      setLocalOrder({
        ...localOrder,
        items: newItems,
        total: newTotal
      });
      
      toast({
        title: "Item removido",
        description: `${removedItem.name} foi removido do pedido`,
      });
    } else {
      toast({
        title: "Não é possível remover",
        description: "Pedidos em preparo ou entregues não podem ser editados",
        variant: "destructive"
      });
    }
  };

  const getPendingItems = () => localOrder.items.filter((_, i) => 
    currentStatus === 'pending' || i % 3 === 0
  );
  
  const getPreparingItems = () => localOrder.items.filter((_, i) => 
    currentStatus !== 'pending' && i % 3 === 1
  );
  
  const getDeliveredItems = () => localOrder.items.filter((_, i) => 
    currentStatus === 'delivered' || (currentStatus === 'ready' && i % 3 === 2)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle className="text-2xl flex items-center gap-2">
              {!editingTable ? (
                <>
                  {localOrder.table}
                  {canEdit && (
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={handleEditTableName}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Input 
                    value={newTableName} 
                    onChange={(e) => setNewTableName(e.target.value)}
                    className="h-9 w-40"
                    autoFocus
                  />
                  <Button variant="outline" size="sm" onClick={handleEditTableName}>
                    Salvar
                  </Button>
                </div>
              )}
            </DialogTitle>
          </div>
        </DialogHeader>
        
        <div className="flex items-center gap-2 mb-4">
          <Badge className={`px-3 py-1 ${currentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' : currentStatus === 'preparing' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
            {currentStatus === 'pending' ? 'Pendente' : 
             currentStatus === 'preparing' ? 'Em produção' : 'Entregue'}
          </Badge>
          <span className="text-gray-600 text-sm">Sendo atendido por {localOrder.assignedTo || "ninguém"}</span>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="pending">Pendente</TabsTrigger>
            <TabsTrigger value="preparing">Em produção</TabsTrigger>
            <TabsTrigger value="delivered">Entregue</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            <h3 className="font-bold text-lg mb-2">Itens Pendentes</h3>
            <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
              {getPendingItems().map((item, index) => (
                <div key={`pending-${index}`} className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                    <img 
                      src={item.image || itemPlaceholders[index % itemPlaceholders.length]} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-semibold">{item.name}</h4>
                      <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                    {item.notes && (
                      <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                    )}
                    <div className="mt-1">
                      <span className="text-sm text-gray-600">Qtd: {item.quantity}</span>
                    </div>
                  </div>
                  
                  {canEdit && currentStatus === 'pending' && (
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="flex-shrink-0 h-8 w-8"
                        onClick={() => handleEditItem(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="flex-shrink-0 h-8 w-8 text-red-500 hover:text-red-700"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="preparing" className="mt-4">
            <h3 className="font-bold text-lg mb-2">Itens em Preparo</h3>
            <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
              {currentStatus === 'pending' ? (
                <p className="text-gray-500 text-center py-4">
                  Não há itens em preparo. Envie o pedido para a cozinha primeiro.
                </p>
              ) : (
                getPreparingItems().map((item, index) => (
                  <div key={`preparing-${index}`} className="flex items-start gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      <img 
                        src={item.image || itemPlaceholders[(index + 1) % itemPlaceholders.length]} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-semibold">{item.name}</h4>
                        <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      )}
                      <div className="mt-1">
                        <span className="text-sm text-gray-600">Qtd: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="delivered" className="mt-4">
            <h3 className="font-bold text-lg mb-2">Itens Entregues</h3>
            <div className="space-y-4 mb-4 max-h-64 overflow-y-auto">
              {currentStatus !== 'ready' && currentStatus !== 'delivered' ? (
                <p className="text-gray-500 text-center py-4">
                  Não há itens entregues ainda.
                </p>
              ) : (
                getDeliveredItems().map((item, index) => (
                  <div key={`delivered-${index}`} className="flex items-start gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-md overflow-hidden flex-shrink-0">
                      <img 
                        src={item.image || itemPlaceholders[(index + 2) % itemPlaceholders.length]} 
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <h4 className="font-semibold">{item.name}</h4>
                        <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                      )}
                      <div className="mt-1">
                        <span className="text-sm text-gray-600">Qtd: {item.quantity}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
        
        <Separator className="my-4" />
        
        <div className="flex justify-between items-center text-lg font-bold mb-6">
          <span>Total</span>
          <span>R$ {localOrder.total.toFixed(2)}</span>
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
