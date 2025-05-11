import React, { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const KitchenManagement = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [searchOrder, setSearchOrder] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Função auxiliar para gerenciar o tipo de produtos
  const ensureProductData = (product: any) => {
    if (!product) return null;
    return {
      name: typeof product === 'object' && product.name ? product.name : '',
      price: typeof product === 'object' && product.price ? product.price : 0,
      image_url: typeof product === 'object' && product.image_url ? product.image_url : ''
    };
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ kitchen_status: newStatus })
        .eq('id', orderId);

      if (error) {
        console.error('Erro ao atualizar status do pedido:', error);
        toast({
          title: "Erro ao atualizar status",
          description: "Não foi possível atualizar o status do pedido.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Status atualizado",
        description: "O status do pedido foi atualizado com sucesso.",
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar status do pedido:', error);
      toast({
        title: "Erro ao atualizar status",
        description: "Ocorreu um erro ao atualizar o status do pedido.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'yyyy-MM-dd', { locale: ptBR });
  };

  const fetchData = async () => {
    try {
      const { data: ordersData, error } = await supabase
        .from('orders')
        .select('*, items_json')
        .eq('kitchen_status', 'na_fila')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar pedidos:', error);
        return;
      }

      setOrders(ordersData || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const renderOrderItems = (items: any[]) => {
    return items.map((item, index) => {
      const productData = ensureProductData(item.product);
      if (!productData) return null;

      return (
        <div key={index} className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 bg-gray-200 rounded-md overflow-hidden">
              {productData.image_url && (
                <img 
                  src={productData.image_url} 
                  alt={productData.name} 
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <p className="font-medium">{productData.name}</p>
              <p className="text-sm text-gray-500">
                R$ {productData.price.toFixed(2)} × {item.quantity}
              </p>
            </div>
          </div>
          <p className="font-medium">
            R$ {(productData.price * item.quantity).toFixed(2)}
          </p>
        </div>
      );
    });
  };

  const filteredOrders = orders.filter(order => {
    const orderDate = new Date(order.created_at);
    const isSameDate = selectedDate ? formatDate(orderDate) === formatDate(selectedDate) : true;
    const matchesSearch = order.id.toLowerCase().includes(searchOrder.toLowerCase());
    return isSameDate && matchesSearch;
  });

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gerenciamento da Cozinha</h1>

      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="h-10 w-[200px] justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                ) : (
                  <span>Selecionar data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                locale={ptBR}
                selected={selectedDate}
                onSelect={setSelectedDate}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Input
            type="text"
            placeholder="Buscar pedido..."
            value={searchOrder}
            onChange={(e) => setSearchOrder(e.target.value)}
          />
        </div>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map(order => (
            <div key={order.id} className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-semibold mb-2">Pedido #{order.id}</h2>
              <p className="text-gray-600 mb-2">
                Data: {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
              </p>
              <div className="mb-4">
                <h3 className="text-md font-semibold mb-2">Itens:</h3>
                {renderOrderItems(order.items_json)}
              </div>
              <div className="flex justify-between">
                <Button
                  onClick={() => handleStatusChange(order.id, 'em_preparo')}
                  disabled={isLoading}
                >
                  Em Preparo
                </Button>
                <Button
                  onClick={() => handleStatusChange(order.id, 'pronto')}
                  disabled={isLoading}
                >
                  Pronto
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>Nenhum pedido encontrado para a data selecionada.</p>
      )}
    </div>
  );
};

export default KitchenManagement;
