
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserSwitcherProvider } from "@/context/UserSwitcherContext";
import { CartProvider } from "@/context/CartContext";
import UserSwitcher from "@/components/UserSwitcher";
import Index from "./pages/Index";
import OrderManagement from "./pages/OrderManagement";
import OrderTracking from "./pages/OrderTracking";
import KitchenManagement from "./pages/KitchenManagement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserSwitcherProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/order-management" element={<OrderManagement />} />
              <Route path="/kitchen-management" element={<KitchenManagement />} />
              <Route path="/order-tracking/:orderId?" element={<OrderTracking />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <UserSwitcher />
          </BrowserRouter>
        </CartProvider>
      </UserSwitcherProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
