
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { UserSwitcherProvider } from "@/context/UserSwitcherContext";
import UserSwitcher from "@/components/UserSwitcher";
import Index from "./pages/Index";
import OrderManagement from "./pages/OrderManagement";
import OrderTracking from "./pages/OrderTracking";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserSwitcherProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/order-management" element={<OrderManagement />} />
            <Route path="/order-tracking/:orderId?" element={<OrderTracking />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <UserSwitcher />
        </BrowserRouter>
      </UserSwitcherProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
