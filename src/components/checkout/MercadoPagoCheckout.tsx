import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { CreditCard, Wallet } from 'lucide-react';

export type CheckoutItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

type Props = {
  orderId: number | string;
  total: number;
  items?: CheckoutItem[];
  onSuccess?: (payment: any) => void;
  onError?: (error: Error) => void;
};

const MercadoPagoCheckout: React.FC<Props> = ({ orderId, total, items, onSuccess, onError }) => {
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'pix'>('credit');
  const [loading, setLoading] = useState(false);
  const [mpLoaded, setMpLoaded] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [pixData, setPixData] = useState<any>(null);
  const { toast } = useToast();
  const { currentTeam, supabase } = useSupabaseWithMultiTenant();

  // Carregar public key do team
  useEffect(() => {
    const fetchPublicKey = async () => {
      if (!currentTeam?.id) return;
      
      const { data } = await supabase
        .from('team_payment_credentials')
        .select('public_key')
        .eq('team_id', currentTeam.id)
        .eq('provider', 'mercadopago')
        .eq('status', 'valid')
        .maybeSingle();
      
      if (data?.public_key) {
        setPublicKey(data.public_key);
      }
    };
    
    fetchPublicKey();
  }, [currentTeam, supabase]);

  // Carregar SDK do Mercado Pago
  useEffect(() => {
    if (!publicKey) return;

    const script = document.createElement('script');
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.async = true;
    script.onload = () => {
      setMpLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [publicKey]);

  const handlePixPayment = async () => {
    if (!currentTeam?.slug) {
      toast({ title: 'Erro', description: 'Instância não identificada', variant: 'destructive' });
      return;
    }

    setLoading(true);
    setPixData(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-mercadopago-payment', {
        body: {
          team_slug: currentTeam.slug,
          transaction_amount: total,
          payment_method_id: 'pix',
          description: `Pedido #${orderId}`,
          payer: {
            email: 'cliente@exemplo.com'
          },
          metadata: {
            order_id: String(orderId)
          }
        }
      });

      if (error) throw error;

      if (data?.status === 'pending' && data?.point_of_interaction?.transaction_data) {
        setPixData(data);
        
        toast({ 
          title: 'PIX Gerado!', 
          description: 'Escaneie o QR Code ou copie o código' 
        });

        if (onSuccess) onSuccess(data);
      } else {
        throw new Error('Falha ao gerar PIX');
      }
    } catch (err: any) {
      console.error('Erro no pagamento PIX:', err);
      toast({ 
        title: 'Erro no Pagamento', 
        description: err.message || 'Falha ao processar PIX', 
        variant: 'destructive' 
      });
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };

  const renderCardForm = (type: 'credit' | 'debit') => {
    if (!mpLoaded || !publicKey) {
      return <p className="text-muted-foreground">Carregando...</p>;
    }

    return (
      <div className="space-y-4">
        <div id={`cardPayment${type}`} className="min-h-[300px]"></div>
        <Button 
          onClick={() => handleMercadoPagoPayment(type)} 
          disabled={loading} 
          className="w-full"
        >
          {loading ? 'Processando...' : `Pagar com ${type === 'credit' ? 'Crédito' : 'Débito'}`}
        </Button>
      </div>
    );
  };

  const handleMercadoPagoPayment = async (type: 'credit' | 'debit') => {
    setLoading(true);
    toast({ title: 'Implementação pendente', description: 'Formulário de cartão em desenvolvimento' });
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finalizar Pagamento</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: R$ {total.toFixed(2)}
        </p>
      </CardHeader>
      <CardContent>
        <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="credit">
              <CreditCard className="w-4 h-4 mr-2" />
              Crédito
            </TabsTrigger>
            <TabsTrigger value="debit">
              <CreditCard className="w-4 h-4 mr-2" />
              Débito
            </TabsTrigger>
            <TabsTrigger value="pix">
              <Wallet className="w-4 h-4 mr-2" />
              Pix
            </TabsTrigger>
          </TabsList>

          <TabsContent value="credit">{renderCardForm('credit')}</TabsContent>
          <TabsContent value="debit">{renderCardForm('debit')}</TabsContent>

          <TabsContent value="pix" className="space-y-4">
            {!pixData ? (
              <Button 
                onClick={handlePixPayment} 
                disabled={loading} 
                className="w-full"
              >
                {loading ? 'Gerando PIX...' : 'Gerar QR Code PIX'}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded">
                  <img 
                    src={`data:image/png;base64,${pixData.point_of_interaction.transaction_data.qr_code_base64}`} 
                    alt="QR Code PIX" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Código Copia e Cola:</p>
                  <div className="flex gap-2">
                    <input 
                      value={pixData.point_of_interaction.transaction_data.qr_code} 
                      readOnly 
                      className="flex-1 px-3 py-2 text-xs font-mono bg-muted rounded border"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(pixData.point_of_interaction.transaction_data.qr_code);
                        toast({ title: 'Copiado!', description: 'Código PIX copiado para área de transferência' });
                      }}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MercadoPagoCheckout;
