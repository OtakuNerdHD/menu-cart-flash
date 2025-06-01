
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useAuth } from '@/context/AuthContext';
import { useSubdomain } from '@/hooks/useSubdomain';

const TableOrderForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const [tableName, setTableName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { cartItems, clearCart, getCartTotal } = useCart();
  const navigate = useNavigate();
  const { currentTeam } = useMultiTenant();
  const { user } = useAuth();
  const { subdomain, isAdminMode } = useSubdomain();

  const handleTableOrder = async () => {
    if (!tableName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o nome da mesa.",
        variant: "destructive",
      });
      return;
    }

    if (cartItems.length === 0) {
      toast({
        title: "Erro",
        description: "Seu carrinho está vazio.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Determinar team_id baseado no subdomínio
      let teamId = null;
      
      if (!isAdminMode && currentTeam?.id) {
        teamId = currentTeam.id;
        console.log('Usando team_id do subdomínio:', teamId);
        
        // Configurar o current_setting no Supabase para RLS
        const { error: settingError } = await supabase.rpc('set_current_team_id', {
          team_id: teamId.toString()
        });
        
        if (settingError) {
          console.warn('Erro ao configurar team_id no Supabase:', settingError);
        }
      } else {
        console.log('Modo admin ou sem team - permitindo pedido sem team_id');
      }
      
      const total = getCartTotal();
      
      // Preparar payload do pedido
      const orderPayload: any = {
        total,
        delivery_type: 'table',
        table_name: tableName,
        status: 'pending',
        restaurant_id: 1
      };

      // Adicionar team_id apenas se determinado
      if (teamId) {
        orderPayload.team_id = teamId;
      }

      // Adicionar user_id apenas se usuário estiver logado
      if (user?.id) {
        orderPayload.user_id = user.id;
      }

      console.log('Criando pedido com payload:', orderPayload);

      // Criar o pedido
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .single();

      if (orderError) {
        console.error('Erro ao criar pedido:', orderError);
        throw new Error('Não foi possível criar o pedido');
      }

      console.log('Pedido criado com sucesso:', order);

      // Preparar itens do pedido
      const orderItems = cartItems.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        team_id: teamId
      }));

      console.log('Criando itens do pedido:', orderItems);

      // Criar os itens do pedido
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Erro ao criar itens do pedido:', itemsError);
        throw new Error('Não foi possível criar os itens do pedido');
      }

      console.log('Itens do pedido criados com sucesso');

      // Salvar no localStorage para compatibilidade offline
      const orderData = {
        id: order.id,
        items: cartItems,
        total,
        tableName,
        timestamp: new Date().toISOString()
      };
      
      const existingOrders = JSON.parse(localStorage.getItem('tableOrders') || '[]');
      existingOrders.push(orderData);
      localStorage.setItem('tableOrders', JSON.stringify(existingOrders));

      toast({
        title: "Pedido realizado!",
        description: `Seu pedido para a mesa ${tableName} foi enviado com sucesso.`,
      });

      clearCart();
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro ao processar pedido:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar seu pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Label htmlFor="table-number">Número da Mesa</Label>
        <Input
          id="table-number"
          placeholder="Ex: Mesa 5"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
        />
      </div>

      <div className="pt-4 border-t">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">R$ {getCartTotal().toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-6">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-lg">R$ {getCartTotal().toFixed(2)}</span>
        </div>
      </div>

      <Button
        onClick={handleTableOrder}
        className="w-full bg-menu-primary hover:bg-menu-primary/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Processando..." : "Finalizar Pedido"}
      </Button>
    </div>
  );
};

export default TableOrderForm;
