
import React from 'react';
import OrderManagementComponent from '@/components/OrderManagement';

// Este arquivo atua apenas como um wrapper para o componente real
const OrderManagement = () => {
  const ensureNumericPrice = (price: string | number): number => {
    if (typeof price === 'string') {
      return parseFloat(price) || 0;
    }
    return price || 0;
  };

  const formatPrice = (price: string | number): string => {
    const numericPrice = ensureNumericPrice(price);
    return numericPrice.toFixed(2);
  };

  const calculateTotal = (price: string | number, quantity: number): number => {
    const numericPrice = ensureNumericPrice(price);
    return numericPrice * quantity;
  };

  return <OrderManagementComponent />;
};

export default OrderManagement;
