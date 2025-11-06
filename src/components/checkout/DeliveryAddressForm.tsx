import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { useCart } from '@/context/CartContext';
import { Loader2, CreditCard, Wallet, CreditCardIcon, DollarSign, QrCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DeliveryAddressFormProps } from './DeliveryAddressFormProps';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/integrations/supabase/client';
import { useCheckout } from '@/hooks/useCheckout';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useAuth } from '@/context/AuthContext';

// Payment method type
type PaymentMethod = 'credit' | 'debit' | 'pix' | 'cash' | 'card_delivery';

const DeliveryAddressForm = ({ onSuccess }: DeliveryAddressFormProps) => {
  const { subtotal, cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const { createPreference } = useCheckout();
  const { currentTeam, subdomain } = useMultiTenant();
  const { user } = useAuth();
  const [isCepLoading, setIsCepLoading] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'address' | 'payment'>('address');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('credit');
  const [paymentTab, setPaymentTab] = useState<'online' | 'delivery'>('online');
  const [needChange, setNeedChange] = useState(false);
  const [changeAmount, setChangeAmount] = useState('');
  const deliveryFee = 5;
  const total = subtotal + deliveryFee;
  const [mpLoaded, setMpLoaded] = useState(false);
  const [brickInstance, setBrickInstance] = useState<any>(null);
  const brickMountedRef = useRef(false);
  const [publicKey, setPublicKey] = useState<string>('');
  const [pixPayment, setPixPayment] = useState<any | null>(null);
  
  // Dados de endereço
  const [cep, setCep] = useState('45603652'); // CEP padrão para testes
  const [endereco, setEndereco] = useState('R. Nova');
  const [numero, setNumero] = useState('325');
  const [bairro, setBairro] = useState('Califórnia');
  const [complemento, setComplemento] = useState('');
  const [cidade, setCidade] = useState('Itabuna');
  const [estado, setEstado] = useState('BA');
  
  // Script do Mercado Pago (carrega uma vez)
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => setMpLoaded(true);
    script.onerror = () => setMpLoaded(false);
    document.body.appendChild(script);

    return () => {
      try { brickInstance?.unmount?.(); } catch {}
      setBrickInstance(null);
      brickMountedRef.current = false;
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

  const handleAddressSubmit = () => {
    // Validar dados do endereço
    if (!cep || !endereco || !numero || !bairro || !cidade || !estado) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    setPaymentStep('payment');
  };
  
  // Função centralizada para criar pedido (delivery ou interno)
  const createOrder = async (
    { paymentMethod, paymentInfo, deliveryAddress }: { paymentMethod: PaymentMethod; paymentInfo: string; deliveryAddress: any; },
    options?: { silent?: boolean }
  ): Promise<number | null> => {
    const teamId = currentTeam?.id || null;
    let clientToken = '';
    try {
      clientToken = localStorage.getItem('delliapp_client_token') || '';
      if (!clientToken) {
        // @ts-ignore
        clientToken = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
        localStorage.setItem('delliapp_client_token', clientToken);
      }
    } catch {}
    const baseOrder: any = { total, status: 'pending', delivery_type: 'delivery', payment_method: paymentMethod, client_token: clientToken };
    if (teamId) baseOrder.team_id = teamId;
    if (user?.id) baseOrder.created_by = user.id;
    const orderObj = { ...baseOrder, address: deliveryAddress, table_name: null };
    console.log('Payload orderObj:', orderObj);
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert([orderObj])
        .select('id');
      if (orderError || !orderData || orderData.length === 0) {
        console.error('Supabase error detalhe:', orderError);
        console.log('Order payload:', orderObj);
        throw new Error('Não foi possível criar o pedido');
      }
      const orderId = orderData[0].id as number;
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(cartItems.map(item => ({ product_id: item.id, quantity: item.quantity, price: item.price, notes: item.notes || undefined, order_id: orderId, team_id: teamId || undefined })));
      if (itemsError) {
        console.error("Erro ao criar itens do pedido:", itemsError);
        throw new Error("Não foi possível adicionar os itens ao pedido");
      }
      if (!options?.silent) {
        clearCart();
        if (onSuccess) onSuccess();
        toast({ title: "Pedido realizado!", description: `Seu pedido foi registrado com sucesso. Pagamento: ${paymentInfo}` });
      }
      return orderId;
    } catch (error) {
      console.error("Erro ao processar pedido:", error);
      toast({ title: "Erro ao processar pedido", description: error instanceof Error ? error.message : "Ocorreu um erro ao processar seu pedido", variant: "destructive" });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Busca e cache da public_key por team_slug (apenas quando necessário)
  useEffect(() => {
    const fetchPublicKey = async () => {
      const teamSlug = currentTeam?.slug || subdomain || null;
      if (!teamSlug) return;
      if (publicKey) return; // já cacheado
      try {
        const { data, error } = await supabase.functions.invoke('get-mercadopago-credentials-status' as never, {
          body: { team_slug: teamSlug } as never,
        });
        if (!error && (data as any)?.public_key) {
          setPublicKey((data as any).public_key as string);
          return;
        }
      } catch {}
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/get-mercadopago-credentials-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ team_slug: teamSlug }),
        });
        const js = await res.json();
        if (js?.public_key) setPublicKey(js.public_key as string);
      } catch {}
    };
    fetchPublicKey();
  }, [currentTeam?.slug, subdomain, publicKey]);

  // Montagem do CardForm (somente para cartão)
  useEffect(() => {
    const mountCardForm = async () => {
      if (!mpLoaded || !publicKey) return;
      if (paymentStep !== 'payment' || paymentTab !== 'online') return;
      if (paymentMethod !== 'credit' && paymentMethod !== 'debit') return;
      if (brickMountedRef.current) return; // evita remontagem

      if (!(window as any).MercadoPago) {
        toast({ title: 'Pagamento indisponível', description: 'SDK do Mercado Pago não carregado.', variant: 'destructive' });
        return;
      }

      try {
        const mp = new (window as any).MercadoPago(publicKey, { locale: 'pt-BR' });

        const addressObj = { street: endereco, number: numero, complement: complemento || undefined, neighborhood: bairro, city: cidade, state: estado, zipcode: cep };
        let clientToken = '';
        try {
          clientToken = localStorage.getItem('delliapp_client_token') || '';
          if (!clientToken) {
            clientToken = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;
            localStorage.setItem('delliapp_client_token', clientToken);
          }
        } catch {}

        const teamSlug = currentTeam?.slug || subdomain || null;

        const cardForm = mp.cardForm({
          amount: String(total),
          iframe: true,
          form: {
            id: 'custom-card-form',
            cardNumber: { id: 'custom-card-number', placeholder: 'Número do Cartão' },
            expirationDate: { id: 'custom-expiration', placeholder: 'MM/AA' },
            securityCode: { id: 'custom-cvv', placeholder: 'CVV' },
            cardholderName: { id: 'custom-cardholder', placeholder: 'Nome no Cartão' },
            identificationType: { id: 'custom-doc-type', placeholder: 'Documento' },
            identificationNumber: { id: 'custom-doc-number', placeholder: 'CPF' },
            cardholderEmail: { id: 'custom-email', placeholder: 'Email' },
          },
          callbacks: {
            onFormMounted: (error: any) => {
              if (error) {
                console.warn('Erro ao montar CardForm:', error);
                toast({ title: 'Erro no pagamento', description: 'Não foi possível montar o formulário de cartão.', variant: 'destructive' });
              }
            },
            onSubmit: async (event: any) => {
              event.preventDefault();
              try {
                if (!teamSlug) {
                  toast({
                    title: 'Instância não identificada',
                    description: 'Defina o cliente via subdomínio ou adicione ?client=SLUG na URL (ambiente local).',
                    variant: 'destructive'
                  });
                  throw new Error('Instância do cliente ausente');
                }
                const {
                  paymentMethodId: payment_method_id,
                  issuerId: issuer_id,
                  token,
                  installments,
                  identificationNumber,
                  identificationType,
                  cardholderEmail,
                } = (cardForm as any).getCardFormData();

                const payload: any = {
                  team_slug: teamSlug,
                  transaction_amount: total,
                  payment_method_id: payment_method_id || 'card',
                  token,
                  issuer_id,
                  installments: installments || 1,
                  payer: {
                    email: cardholderEmail,
                    identification: { type: identificationType, number: identificationNumber },
                  },
                  description: 'Pedido Delivery',
                  metadata: {
                    cart_items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity, price: item.price, notes: item.notes || null })),
                    address: addressObj,
                    delivery_type: 'delivery',
                    payment_method: 'card',
                    total,
                    created_by: user?.id || null,
                    client_token: clientToken,
                  },
                };

                const { data, error } = await supabase.functions.invoke('create-mercadopago-payment' as never, { body: payload as never });
                let result = data;
                if (error || !data) {
                  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-mercadopago-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
                    body: JSON.stringify(payload),
                  });
                  result = await res.json();
                  if (!res.ok) throw new Error((result?.error || result?.message || 'Falha ao criar pagamento'));
                }

                // Cria o pedido após pagamento com cartão
                const newId = await createOrder({ paymentMethod: 'card', paymentInfo: 'Cartão', deliveryAddress: addressObj });
                if (newId) {
                  try {
                    const key = 'my_order_ids';
                    const saved = JSON.parse(localStorage.getItem(key) || '[]');
                    const arr = Array.isArray(saved) ? saved : [];
                    if (!arr.includes(newId)) {
                      arr.push(newId);
                      localStorage.setItem(key, JSON.stringify(arr));
                    }
                  } catch {}
                }

                toast({ title: 'Pagamento aprovado', description: 'Seu pedido foi registrado com sucesso.' });
                return result;
              } catch (e) {
                console.error('Erro em pagamento (cartão):', e);
                toast({ title: 'Erro ao processar pagamento', description: e instanceof Error ? e.message : 'Falha ao criar pagamento', variant: 'destructive' });
                throw e;
              }
            },
          },
        });

        setBrickInstance(cardForm);
        brickMountedRef.current = true;
      } catch (error) {
        console.error('Falha ao montar CardForm:', error);
        toast({ title: 'Erro ao iniciar pagamento', description: 'Não foi possível montar o formulário de pagamento.', variant: 'destructive' });
      }
    };

    mountCardForm();
  }, [mpLoaded, publicKey, paymentStep, paymentTab, paymentMethod, total]);

  // Desmonta o CardForm ao sair da aba online, do passo de pagamento ou ao trocar do cartão
  useEffect(() => {
    if (paymentTab !== 'online' || paymentStep !== 'payment' || (paymentMethod !== 'credit' && paymentMethod !== 'debit')) {
      if (brickInstance) {
        setBrickInstance(null);
        brickMountedRef.current = false;
      }
    }
  }, [paymentTab, paymentStep, paymentMethod]);

  const handlePayment = async () => {
    if (paymentTab === 'delivery' && (paymentMethod === 'cash' || paymentMethod === 'card_delivery')) {
      setIsLoading(true);
      const paymentInfo = paymentMethod === 'cash'
        ? (needChange ? `Dinheiro (Troco para R$ ${changeAmount})` : 'Dinheiro (Sem troco)')
        : 'Cartão na entrega';
      const addressObj = { street: endereco, number: numero, complement: complemento || undefined, neighborhood: bairro, city: cidade, state: estado, zipcode: cep };
      const newId = await createOrder({ paymentMethod, paymentInfo, deliveryAddress: addressObj });
      if (newId) {
        try {
          const key = 'my_order_ids';
          const saved = JSON.parse(localStorage.getItem(key) || '[]');
          const arr = Array.isArray(saved) ? saved : [];
          if (!arr.includes(newId)) {
            arr.push(newId);
            localStorage.setItem(key, JSON.stringify(arr));
          }
        } catch {}
      }
    }

    // Fluxo PIX usando formulário customizado
    if (paymentTab === 'online' && paymentMethod === 'pix') {
      setIsLoading(true);
      setPixPayment(null);
      const teamSlug = currentTeam?.slug || subdomain || null;
      if (!teamSlug) {
        toast({
          title: 'Instância não identificada',
          description: 'Defina o cliente via subdomínio ou adicione ?client=SLUG na URL (ambiente local).',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }
      const addressObj = { street: endereco, number: numero, complement: complemento || undefined, neighborhood: bairro, city: cidade, state: estado, zipcode: cep };
      try {
        let clientToken = '';
        try {
          clientToken = localStorage.getItem('delliapp_client_token') || '';
          if (!clientToken) {
            // @ts-ignore
            clientToken = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `${Date.now()}-${Math.random()}`;
            localStorage.setItem('delliapp_client_token', clientToken);
          }
        } catch {}

        const payload: any = {
          team_slug: teamSlug,
          transaction_amount: total,
          payment_method_id: 'pix',
          description: 'Pedido Delivery',
          metadata: {
            cart_items: cartItems.map((item) => ({ product_id: item.id, quantity: item.quantity, price: item.price, notes: item.notes || null })),
            address: addressObj,
            delivery_type: 'delivery',
            payment_method: 'pix',
            total,
            created_by: user?.id || null,
            client_token: clientToken,
          },
        };

        const { data, error } = await supabase.functions.invoke('create-mercadopago-payment' as never, { body: payload as never });
        let result = data;
        if (error || !data) {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/create-mercadopago-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
            body: JSON.stringify(payload),
          });
          result = await res.json();
          if (!res.ok) throw new Error((result?.error || result?.message || 'Falha ao criar pagamento PIX'));
        }

        setPixPayment(result);
        await createOrder({ paymentMethod: 'pix', paymentInfo: 'PIX', deliveryAddress: addressObj }, { silent: true });
      } catch (e) {
        console.error('Erro no PIX:', e);
        toast({ title: 'Erro no PIX', description: e instanceof Error ? e.message : 'Falha ao gerar QR code', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
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

  const handleChangeAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d.,]/g, '');
    setChangeAmount(value);
  };

  const handleTabChange = (value: 'online' | 'delivery') => {
    setPaymentTab(value);
    
    // Atualizar método de pagamento com base na aba selecionada
    if (value === 'online') {
      setPaymentMethod('credit');
    } else {
      setPaymentMethod('card_delivery');
    }
  };

  return (
    <div className="space-y-6">
      {paymentStep === 'address' ? (
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
          
          <div className="pt-4 border-t">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Taxa de entrega</span>
              <span className="font-medium">R$ {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-6">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            onClick={handleAddressSubmit}
            className="w-full bg-menu-primary hover:bg-menu-primary/90"
          >
            Continuar para pagamento
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Forma de pagamento</h3>
          
          <Tabs defaultValue="online" value={paymentTab} onValueChange={(v) => handleTabChange(v as 'online' | 'delivery')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="online">Pagar agora</TabsTrigger>
              <TabsTrigger value="delivery">Pagar na entrega</TabsTrigger>
            </TabsList>
            
             <TabsContent value="online" className="mt-4 space-y-4">
               <RadioGroup 
                 value={paymentMethod} 
                 onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                 className="flex space-x-2"
               >
                 <Card className={`flex-1 p-4 cursor-pointer ${paymentMethod === 'credit' ? 'border-menu-primary ring-2 ring-menu-primary' : ''}`}>
                   <div className="flex flex-col items-center space-y-2">
                     <RadioGroupItem value="credit" id="credit" />
                     <Label htmlFor="credit" className="flex flex-col items-center cursor-pointer text-center">
                       <CreditCard className="h-6 w-6 mb-1" />
                       <span className="text-sm">Crédito</span>
                     </Label>
                   </div>
                 </Card>
                 
                 <Card className={`flex-1 p-4 cursor-pointer ${paymentMethod === 'debit' ? 'border-menu-primary ring-2 ring-menu-primary' : ''}`}>
                   <div className="flex flex-col items-center space-y-2">
                     <RadioGroupItem value="debit" id="debit" />
                     <Label htmlFor="debit" className="flex flex-col items-center cursor-pointer text-center">
                       <CreditCard className="h-6 w-6 mb-1" />
                       <span className="text-sm">Débito</span>
                     </Label>
                   </div>
                 </Card>
                 
                 <Card className={`flex-1 p-4 cursor-pointer ${paymentMethod === 'pix' ? 'border-menu-primary ring-2 ring-menu-primary' : ''}`}>
                   <div className="flex flex-col items-center space-y-2">
                     <RadioGroupItem value="pix" id="pix" />
                     <Label htmlFor="pix" className="flex flex-col items-center cursor-pointer text-center">
                       <QrCode className="h-6 w-6 mb-1" />
                       <span className="text-sm">PIX</span>
                     </Label>
                   </div>
                 </Card>
               </RadioGroup>
              
              {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
                <form id="custom-card-form" className="mt-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Número do Cartão</Label>
                      <div id="custom-card-number" className="border rounded-md p-3 h-12 flex items-center" />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome no Cartão</Label>
                      <input id="custom-cardholder" type="text" className="border rounded-md p-3 h-12 w-full" placeholder="Nome no Cartão" />
                    </div>
                    <div className="space-y-2">
                      <Label>Validade</Label>
                      <div id="custom-expiration" className="border rounded-md p-3 h-12 flex items-center" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <div id="custom-cvv" className="border rounded-md p-3 h-12 flex items-center" />
                    </div>
                    <div className="space-y-2">
                      <Label>Documento</Label>
                      <select id="custom-doc-type" className="border rounded-md p-3 h-12 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <input id="custom-doc-number" type="text" className="border rounded-md p-3 h-12 w-full" placeholder="CPF" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Email</Label>
                      <input id="custom-email" type="email" className="border rounded-md p-3 h-12 w-full" placeholder="Email" />
                    </div>
                  </div>
                  <Button type="submit" className="bg-menu-primary hover:bg-menu-primary/90">Pagar com {paymentMethod === 'credit' ? 'Crédito' : 'Débito'}</Button>
                </form>
              )}
              {paymentMethod === 'pix' && pixPayment && (
                <div className="mt-4 p-4 border rounded-md">
                  <div className="mb-3 font-medium">Escaneie o QR code para pagar via PIX</div>
                  {pixPayment?.point_of_interaction?.transaction_data?.qr_code_base64 && (
                    <img
                      alt="QR Code PIX"
                      className="w-48 h-48 object-contain"
                      src={`data:image/png;base64,${pixPayment.point_of_interaction.transaction_data.qr_code_base64}`}
                    />
                  )}
                  {pixPayment?.point_of_interaction?.transaction_data?.qr_code && (
                    <div className="mt-3">
                      <Label>Chave PIX (copia e cola)</Label>
                      <div className="text-sm break-all mt-1">
                        {pixPayment.point_of_interaction.transaction_data.qr_code}
                      </div>
                    </div>
                  )}
                  {pixPayment?.point_of_interaction?.transaction_data?.ticket_url && (
                    <div className="mt-3">
                      <a
                        href={pixPayment.point_of_interaction.transaction_data.ticket_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-menu-primary underline"
                      >
                        Abrir comprovante
                      </a>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="delivery" className="mt-4 space-y-4">
              <RadioGroup 
                value={paymentMethod} 
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                className="space-y-3"
              >
                <Card className={`p-4 cursor-pointer ${paymentMethod === 'card_delivery' ? 'border-menu-primary ring-2 ring-menu-primary' : ''}`}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="card_delivery" id="card_delivery" />
                    <Label htmlFor="card_delivery" className="flex items-center cursor-pointer">
                      <CreditCardIcon className="h-4 w-4 mr-2" />
                      <span>Cartão na entrega</span>
                    </Label>
                  </div>
                </Card>
                
                <div>
                  <Card className={`p-4 cursor-pointer ${paymentMethod === 'cash' ? 'border-menu-primary ring-2 ring-menu-primary' : ''}`}>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="cash" id="cash" />
                      <Label htmlFor="cash" className="flex items-center cursor-pointer">
                        <DollarSign className="h-4 w-4 mr-2" />
                        <span>Dinheiro</span>
                      </Label>
                    </div>
                  </Card>
                  
                  {paymentMethod === 'cash' && (
                    <div className="mt-3 pl-2">
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="needChange"
                          checked={needChange}
                          onChange={(e) => setNeedChange(e.target.checked)}
                          className="mr-2"
                        />
                        <Label htmlFor="needChange">Precisa de troco?</Label>
                      </div>
                      
                      {needChange && (
                        <div className="space-y-1">
                          <Label htmlFor="changeAmount">Troco para quanto?</Label>
                          <Input
                            id="changeAmount"
                            value={changeAmount}
                            onChange={handleChangeAmountChange}
                            placeholder="50,00"
                            className="w-full"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </RadioGroup>
            </TabsContent>
          </Tabs>
          
          <div className="pt-4 border-t">
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-600">Taxa de entrega</span>
              <span className="font-medium">R$ {deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-6">
              <span className="font-bold text-lg">Total</span>
              <span className="font-bold text-lg">R$ {total.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPaymentStep('address')}
              className="flex-1"
            >
              Voltar
            </Button>
            
            <Button
              onClick={handlePayment}
              className="flex-1 bg-menu-primary hover:bg-menu-primary/90"
              disabled={isLoading || (paymentTab === 'online' && (paymentMethod === 'credit' || paymentMethod === 'debit'))}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                (paymentTab === 'online' && (paymentMethod === 'credit' || paymentMethod === 'debit') ? 'Use o formulário acima' : 'Finalizar Pedido')
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryAddressForm;
