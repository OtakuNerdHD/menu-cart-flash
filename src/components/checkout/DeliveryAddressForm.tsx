
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { useCart } from '@/context/CartContext';

interface Address {
  cep: string;
  logradouro: string;
  numero: string;
  bairro: string;
  complemento: string;
  localidade: string;
  uf: string;
}

const DeliveryAddressForm = () => {
  const { currentUser } = useUserSwitcher();
  const { subtotal } = useCart();
  const [loading, setLoading] = useState(false);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [address, setAddress] = useState<Address>({
    cep: '',
    logradouro: '',
    numero: '',
    bairro: '',
    complemento: '',
    localidade: '',
    uf: '',
  });

  // Função para consultar CEP
  const fetchAddressByCep = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "O CEP informado não foi encontrado",
          variant: "destructive",
        });
        return;
      }
      
      setAddress({
        ...address,
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
      });
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description: "Ocorreu um erro ao buscar o endereço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Efeito para buscar o CEP quando digitado
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (address.cep.replace(/\D/g, '').length === 8) {
        fetchAddressByCep(address.cep.replace(/\D/g, ''));
      }
    }, 700);
    
    return () => clearTimeout(timeoutId);
  }, [address.cep]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove qualquer caractere que não seja número
    const newCep = e.target.value.replace(/\D/g, '');
    setAddress({ ...address, cep: newCep });
  };

  const handleProceedToPayment = () => {
    // Validar se todos os campos obrigatórios estão preenchidos
    if (!address.cep || !address.logradouro || !address.numero || !address.bairro) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Aqui você redirecionaria para a página de pagamento do Mercado Pago
    toast({
      title: "Prosseguindo para pagamento",
      description: "Você será redirecionado para a página de pagamento",
    });
    
    // Exemplo de redirecionamento (implementar depois)
    // window.location.href = '/checkout/payment';
  };

  return (
    <div className="space-y-6">
      {currentUser?.role === 'customer' && !useNewAddress && (
        <div className="mb-6">
          <h4 className="text-base font-medium mb-3">Endereço salvo</h4>
          <Card className="p-4">
            <RadioGroup defaultValue="savedAddress" className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="savedAddress" id="savedAddress" checked={!useNewAddress} 
                  onClick={() => setUseNewAddress(false)} />
                <Label htmlFor="savedAddress">Usar endereço salvo</Label>
              </div>
              <p className="text-sm text-gray-500 pl-6">
                Rua Exemplo, 123 - Centro<br />
                São Paulo, SP - 01001-000
              </p>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="newAddress" id="newAddress" checked={useNewAddress} 
                  onClick={() => setUseNewAddress(true)} />
                <Label htmlFor="newAddress">Adicionar novo endereço</Label>
              </div>
            </RadioGroup>
          </Card>
        </div>
      )}

      {(useNewAddress || currentUser?.role !== 'customer') && (
        <div className="space-y-4">
          <h4 className="text-base font-medium">Novo endereço</h4>
          
          <div className="space-y-2">
            <Label htmlFor="cep">CEP*</Label>
            <div className="relative">
              <Input
                id="cep"
                placeholder="00000000"
                maxLength={8}
                value={address.cep}
                onChange={handleCepChange}
                className="pr-10"
                required
              />
              {loading && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="logradouro">Endereço*</Label>
            <Input
              id="logradouro"
              placeholder="Rua, Avenida, etc."
              value={address.logradouro}
              onChange={(e) => setAddress({ ...address, logradouro: e.target.value })}
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="numero">Número*</Label>
              <Input
                id="numero"
                placeholder="123"
                value={address.numero}
                onChange={(e) => setAddress({ ...address, numero: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bairro">Bairro*</Label>
              <Input
                id="bairro"
                placeholder="Centro"
                value={address.bairro}
                onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="complemento">Complemento</Label>
            <Input
              id="complemento"
              placeholder="Apto, Bloco, etc."
              value={address.complemento}
              onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
            />
          </div>
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="flex justify-between mb-2">
          <span className="text-gray-600">Subtotal</span>
          <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between mb-4">
          <span className="text-gray-600">Taxa de entrega</span>
          <span className="font-medium">R$ 5.00</span>
        </div>
        <div className="flex justify-between mb-6">
          <span className="font-bold text-lg">Total</span>
          <span className="font-bold text-lg">R$ {(subtotal + 5).toFixed(2)}</span>
        </div>
      </div>

      <Button
        onClick={handleProceedToPayment}
        className="w-full bg-menu-primary hover:bg-menu-primary/90"
      >
        Continuar para pagamento
      </Button>
    </div>
  );
};

export default DeliveryAddressForm;
