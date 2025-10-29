
import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Menu, LogOut, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Link, useNavigate } from 'react-router-dom';
import TenantIndicator from '@/components/TenantIndicator';
import { toast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  restaurant_owner: 'Proprietário',
  chef: 'Chef',
  waiter: 'Garçom',
  delivery: 'Entregador',
  customer: 'Cliente',
};

const getMetadataString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const Header = () => {
  const { totalItems, toggleCart } = useCart();
  const { user, currentUser, signOut } = useAuth();
  const { isAdminMode } = useMultiTenant();
  const navigate = useNavigate();

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = user?.app_metadata as Record<string, unknown> | undefined;

  const userRole = currentUser?.role
    ?? getMetadataString(appMetadata?.['role'])
    ?? getMetadataString(metadata?.['role']);

  const displayName = currentUser?.full_name
    ?? getMetadataString(metadata?.['full_name'])
    ?? currentUser?.email
    ?? user?.email
    ?? 'Usuário';

  const displayEmail = currentUser?.email
    ?? getMetadataString(metadata?.['email'])
    ?? user?.email;

  const roleLabel = userRole ? ROLE_LABELS[userRole] ?? userRole : null;

  const isAdminOrOwner = userRole === 'admin' || userRole === 'restaurant_owner';

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema.",
      });
      
      // Redirecionar para a homepage após logout
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro ao fazer logout",
        description: "Houve um problema ao desconectar. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  return (
    <header className="fixed top-0 z-50 w-full bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="flex flex-col h-full">
                <nav className="flex flex-col gap-4">
                  {user ? (
                    <>
                      <div className="flex items-start gap-4 py-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-semibold text-gray-900">
                            {displayName}
                          </span>
                          {displayEmail && (
                            <span className="text-sm text-gray-500">
                              {displayEmail}
                            </span>
                          )}
                          {roleLabel && (
                            <Badge variant="secondary" className="w-fit px-3 py-1 text-xs capitalize">
                              {roleLabel}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Separator />
                    </>
                  ) : null}

                  <Link to="/" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                    Home
                  </Link>

                  {!user ? (
                    <Link to="/login" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                      Login / Cadastro
                    </Link>
                  ) : (
                    <>
                      <Link to="/order-tracking" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                        Acompanhar Pedido
                      </Link>

                      {/* Páginas visíveis apenas para Garçons, Chef, Admin e Dono */}
                      {['waiter', 'chef', 'admin', 'restaurant_owner'].includes(userRole || '') && (
                        <Link to="/order-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                          Pedidos
                        </Link>
                      )}

                      {/* Páginas visíveis apenas para Chef, Admin e Dono */}
                      {['chef', 'admin', 'restaurant_owner'].includes(userRole || '') && (
                        <Link to="/kitchen-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                          Cozinha
                        </Link>
                      )}

                      {/* Páginas visíveis apenas para Admin e Dono */}
                      {isAdminOrOwner && (
                        <>
                          <Link to="/product-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                            Produtos
                          </Link>
                          <Link to="/user-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                            Usuários
                          </Link>
                          <Link to="/api-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                            APIs
                          </Link>
                        </>
                      )}

                      {/* Dashboard SAAS apenas para admins no modo admin */}
                      {isAdminMode && userRole === 'admin' && (
                        <Link to="/dashboard-saas" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                          Dashboard SAAS
                        </Link>
                      )}

                      <Separator className="my-2" />

                      <Button 
                        variant="ghost" 
                        onClick={handleLogout}
                        className="justify-start text-lg font-medium hover:text-red-600 py-2 gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sair
                      </Button>
                    </>
                  )}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
          <a href="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-menu-primary">Cardápio<span className="text-menu-accent">Digital</span></h1>
          </a>
        </div>
        
        <div className="flex items-center gap-4">
          <TenantIndicator />
          <Button 
            onClick={toggleCart}
            variant="ghost" 
            className="relative p-2"
            aria-label="Shopping cart"
          >
            <ShoppingCart className="h-6 w-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-menu-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
