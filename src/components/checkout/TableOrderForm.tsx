
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/CartContext';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const TableOrderForm = () => {
  const [tableName, setTableName] = useState('');
  const [existingTables, setExistingTables] = useState<string[]>([]);
  const { clearCart, subtotal, cartItems } = useCart();
  const navigate = useNavigate();

  // Carrega as mesas existentes do localStorage
  useEffect(() => {
    const storedOrders = localStorage.getItem('tableOrders');
    if (storedOrders) {
      try {
        const parsedOrders = JSON.parse(storedOrders);
        const tableNames = [...new Set(parsedOrders.map((order: any) => order.table.toLowerCase()))];
        setExistingTables(tableNames);
      } catch (error) {
        console.error('Erro ao carregar mesas existentes:', error);
      }
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o nome/número da mesa",
        variant: "destructive"
      });
      return;
    }
    
    // Normaliza o nome da mesa removendo espaços extras e tornando case insensitive
    const normalizedTableName = tableName.trim();
    
    // Verifica se já existe uma mesa com esse nome (ignorando case)
    const existingOrders = JSON.parse(localStorage.getItem('tableOrders') || '[]');
    const existingTableNames = existingOrders.map((order: any) => order.table.toLowerCase());
    
    let orderToUpdate = null;
    let orderId = Date.now(); // ID padrão para novos pedidos
    
    // Se já existe uma mesa com esse nome, vamos adicionar ao pedido existente
    for (let i = 0; i < existingOrders.length; i++) {
      if (existingOrders[i].table.toLowerCase() === normalizedTableName.toLowerCase()) {
        // Usa o nome exatamente como está armazenado
        orderToUpdate = existingOrders[i];
        orderId = orderToUpdate.id;
        break;
      }
    }
    
    // Em uma implementação real, este objeto seria enviado para o backend
    const newOrder = {
      id: orderId,
      table: orderToUpdate ? orderToUpdate.table : normalizedTableName, // Mantém o mesmo nome se for uma mesa existente
      status: 'pending',
      items: cartItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        notes: item.notes
      })),
      total: subtotal * 1.1, // Com taxa de serviço
      createdAt: new Date().toISOString(),
      assignedTo: null
    };

    // Se estamos atualizando uma mesa existente, remover a mesa antiga
    let updatedOrders = existingOrders.filter((order: any) => 
      order.table.toLowerCase() !== normalizedTableName.toLowerCase()
    );
    
    // Adicionar o novo pedido
    updatedOrders.push(newOrder);
    
    localStorage.setItem('tableOrders', JSON.stringify(updatedOrders));
    
    toast({
      title: "Pedido realizado!",
      description: `Seu pedido foi enviado para a ${newOrder.table}`,
    });
    
    clearCart();
    
    // Redirecionar para a página de acompanhamento do pedido
    navigate(`/order-tracking/${newOrder.id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="tableName">Nome/Número da Mesa</Label>
        <Input
          id="tableName"
          placeholder="Ex: Mesa 10"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          className="w-full"
          required
        />
        {existingTables.length > 0 && (
          <div className="text-sm text-gray-500">
            <p>Mesas já em uso: {existingTables.slice(0, 3).join(', ')}
            {existingTables.length > 3 ? ` e mais ${existingTables.length - 3}...` : ''}</p>
          </div>
        )}
      </div>
      
      <div className="pt-4 border-t">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Taxa de serviço (10%)</span>
          <span className="font-medium">R$ {(subtotal * 0.1).toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-6">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-lg">R$ {(subtotal * 1.1).toFixed(2)}</span>
        </div>
      </div>

      <Button
        type="submit"
        className="w-full bg-menu-primary hover:bg-menu-primary/90"
      >
        Finalizar pedido
      </Button>
    </form>
  );
};

export default TableOrderForm;
