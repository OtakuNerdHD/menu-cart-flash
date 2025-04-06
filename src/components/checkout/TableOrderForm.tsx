
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/CartContext';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

const TableOrderForm = () => {
  const [tableName, setTableName] = useState('');
  const { clearCart, subtotal, cartItems } = useCart();
  const navigate = useNavigate();

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
    
    // Aqui seria a chamada para a API para registrar o pedido no sistema
    // Por enquanto, vamos apenas mostrar um toast de sucesso
    
    toast({
      title: "Pedido realizado!",
      description: `Seu pedido foi enviado para a mesa ${tableName}`,
    });
    
    clearCart();
    
    // Aqui você pode redirecionar para uma página de acompanhamento de pedido
    navigate("/order-management");
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
