
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useCart } from '@/context/CartContext';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DeliveryAddressForm = () => {
  const { subtotal, items, clearCart } = useCart();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isCepLoading, setIsCepLoading] = useState(false);
  
  // Dados de endereço
  const [cep, setCep] = useState('');
  const [endereco, setEndereco] = useState('');
  const [numero, setNumero] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  
  // Script do Mercado Pago
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    document.body.appendChild(script);
    
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Função para buscar endereço pelo CEP
  const buscarEnderecoPorCep = async () => {
    if (!cep || cep.length !== 8) {
      toast({
        title: "CEP inválido",
        description: "Por favor, insira um CEP válido com 8 dígitos.",
        variant: "destructive"
      });
      return;
    }
    
    setIsCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Não foi possível encontrar o endereço para este CEP.",
          variant: "destructive"
        });
      } else {
        setEndereco(data.logradouro);
        setBairro(data.bairro);
        setCidade(data.localidade);
        setEstado(data.uf);
      }
    } catch (error) {
      console.error('Erro ao buscar CEP:', error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao buscar o endereço. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsCepLoading(false);
    }
  };

  const handleDeliveryOrder = async () => {
    // Validar dados do endereço
    if (!cep || !endereco || !numero || !bairro || !cidade || !estado) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Aqui integramos com o Mercado Pago
      // Normalmente, enviaríamos os dados para um endpoint de backend
      // No caso de implementação front-end, podemos simular o processo
      
      // Esta implementação é apenas um exemplo
      // Em uma implementação real, você enviaria os dados para seu backend
      // que então criaria a preferência no Mercado Pago
      
      const mp = new window.MercadoPago('TEST-45feae2e-291e-4f2b-8db5-a03d6893a185', {
        locale: 'pt-BR'
      });
      
      // Simulando sucesso de pagamento após 2 segundos
      setTimeout(() => {
        // Em implementação real, isso seria manipulado por callbacks do Mercado Pago
        const orderId = `ORDER-${Math.floor(Math.random() * 1000000)}`;
        
        // Redirecionar para a página de acompanhamento
        clearCart();
        navigate(`/order-tracking/${orderId}`);
        
        toast({
          title: "Pedido realizado!",
          description: `Seu pedido #${orderId} foi processado com sucesso.`,
        });
        
        setIsLoading(false);
      }, 2000);
      
    } catch (error) {
      console.error('Erro no checkout:', error);
      toast({
        title: "Erro no pagamento",
        description: "Ocorreu um erro ao processar seu pagamento. Tente novamente.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    setCep(value);
  };

  const handleCepBlur = () => {
    if (cep.length === 8) {
      buscarEnderecoPorCep();
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <div className="flex">
              <Input
                id="cep"
                placeholder="00000000"
                value={cep}
                onChange={handleCepChange}
                onBlur={handleCepBlur}
                maxLength={8}
                className="flex-1"
                disabled={isCepLoading}
              />
              {isCepLoading && (
                <div className="ml-2 flex items-center">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 space-y-2">
            <Label htmlFor="endereco">Endereço</Label>
            <Input
              id="endereco"
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
              placeholder="Rua, Avenida, etc"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="numero">Número</Label>
            <Input
              id="numero"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="123"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bairro">Bairro</Label>
            <Input
              id="bairro"
              value={bairro}
              onChange={(e) => setBairro(e.target.value)}
              placeholder="Bairro"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento (opcional)</Label>
            <Input
              id="complemento"
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              placeholder="Apto, Bloco, etc"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="cidade">Cidade</Label>
            <Input
              id="cidade"
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              placeholder="Cidade"
              readOnly
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Input
              id="estado"
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              placeholder="UF"
              readOnly
            />
          </div>
        </div>
      </div>
      
      <div className="pt-4 border-t">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Taxa de entrega</span>
          <span className="font-medium">R$ 5.00</span>
        </div>
        <div className="flex justify-between mb-6">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-lg">R$ {(subtotal + 5).toFixed(2)}</span>
        </div>
      </div>

      <Button
        onClick={handleDeliveryOrder}
        className="w-full bg-menu-primary hover:bg-menu-primary/90"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          'Pagar'
        )}
      </Button>
      
      {/* Área onde o Mercado Pago irá renderizar o formulário de pagamento */}
      <div id="mercadopago-checkout" className="mt-4"></div>
    </div>
  );
};

export default DeliveryAddressForm;
