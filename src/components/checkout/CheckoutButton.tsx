import React from 'react';
import { Button } from '@/components/ui/button';
import { useCheckout } from '@/hooks/useCheckout';

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
  title?: string;
  disabled?: boolean;
  className?: string;
  onSuccess?: (preference: any) => void;
  onError?: (error: Error) => void;
};

const CheckoutButton: React.FC<Props> = ({ orderId, total, items, title = 'Pagar com Mercado Pago', disabled, className, onSuccess, onError }) => {
  const { createPreference } = useCheckout();

  const handleClick = async () => {
    try {
      const list = items && items.length > 0 ? items : [{ title: `Pedido #${orderId}` , quantity: 1, unit_price: total, currency_id: 'BRL' }];
      const pref = await createPreference(list as any, { external_reference: String(orderId) });
      if (onSuccess && pref) onSuccess(pref);
    } catch (e: any) {
      if (onError) onError(e);
      else console.warn('Falha no checkout:', e);
    }
  };

  return (
    <Button onClick={handleClick} disabled={disabled} className={className}>
      {title}
    </Button>
  );
};

export default CheckoutButton;
