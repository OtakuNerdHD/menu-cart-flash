
import React from 'react';
import OrderManagementComponent from '@/components/OrderManagement';
import { useTenantRoleGuard } from '@/hooks/useTenantRoleGuard';

// Este arquivo atua apenas como um wrapper para o componente real
const OrderManagement = () => {

  //__ROLE_GUARD_INSERT_HERE__
  const allowed = useTenantRoleGuard(['dono','admin','cozinha','garcom']);
  if (!allowed) return null;
  return <OrderManagementComponent />;
};

export default OrderManagement;
