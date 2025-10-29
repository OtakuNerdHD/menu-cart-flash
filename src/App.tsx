
import React, { useMemo, Suspense } from 'react';

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { UserSwitcherProvider } from "@/context/UserSwitcherContext";
import { CartProvider } from "@/context/CartContext";
import { TeamProvider } from "@/context/TeamContext";
import { MultiTenantProvider, useMultiTenant } from "@/context/MultiTenantContext";
import { AuthProvider } from "@/context/AuthContext";
import { ClientProvider, useClient } from "@/context/ClientContext";
import UserSwitcher from "@/components/UserSwitcher";
import Header from "@/components/Header";
import Index from "./pages/Index";
import OrderManagement from "./pages/OrderManagement";
import OrderTracking from "./pages/OrderTracking";
import KitchenManagement from "./pages/KitchenManagement";
import ProductManagement from "./pages/ProductManagement";
import ProductDetail from "./pages/ProductDetail";
import Combos from "./pages/Combos";
import UserManagement from "./pages/UserManagement";
import ApiManagement from "./pages/ApiManagement";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Cart from "./components/Cart";
import DashboardSAAS from "./pages/DashboardSAAS";
import MobileBottomNav from "@/components/navigation/MobileBottomNav";

const queryClient = new QueryClient();

// Componente para gerenciar rotas baseado no modo (admin vs cliente)
const AppRouter = () => {
  const { client, isLoading, error, isAdminMode } = useClient();

  // Verificar se está em ambiente local
  const isLocalEnvironment = useMemo(() => {
    const hostname = window.location.hostname;
    return (hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  // Mostrar tela de carregamento enquanto busca dados do cliente
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-lg">Carregando...</p>
        </div>
      </div>
    );
  }

  // Mostrar erro se cliente não foi encontrado (apenas em modo cliente)
  if (!isAdminMode && error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Cliente não encontrado</h1>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500 mt-2">Verifique se o subdomínio está correto.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header />
      <Routes>
        {isAdminMode ? (
          // Rotas do modo admin (acesso completo)
          <>
            <Route path="/" element={<Index />} />
            <Route path="/order-management" element={<OrderManagement />} />
            <Route path="/kitchen-management" element={<KitchenManagement />} />
            <Route path="/order-tracking/:orderId?" element={<OrderTracking />} />
            <Route path="/combos" element={<Combos />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/product-management" element={<ProductManagement />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/api-management" element={<ApiManagement />} />
            <Route path="/dashboard-saas" element={<DashboardSAAS />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </>
        ) : (
          // Rotas do modo cliente (filtradas por tenant)
          <>
            <Route path="/" element={<Index />} />
            <Route path="/order-management" element={<OrderManagement />} />
            <Route path="/kitchen-management" element={<KitchenManagement />} />
            <Route path="/order-tracking/:orderId?" element={<OrderTracking />} />
            <Route path="/combos" element={<Combos />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/product-management" element={<ProductManagement />} />
            <Route path="/user-management" element={<UserManagement />} />
            <Route path="/api-management" element={<ApiManagement />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
      {/* UserSwitcher temporariamente desabilitado */}
      <Cart />
      <MobileBottomNav />
    </>
  );
};

// Componente de fallback para carregamento
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
      <p className="mt-4 text-lg">Carregando aplicação...</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MultiTenantProvider>
            <ClientProvider>
              <TeamProvider>
                <CartProvider>
                  <UserSwitcherProvider>
                    <AppRouter />
                  </UserSwitcherProvider>
                </CartProvider>
              </TeamProvider>
            </ClientProvider>
          </MultiTenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
