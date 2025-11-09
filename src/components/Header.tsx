import { supabase } from '@/integrations/supabase/client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { buildNavigationItems } from '@/config/navigation';
import { useSingleSession } from '@/hooks/useSingleSession';

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
  const { user, currentUser, signOut, isSuperAdmin } = useAuth();
  const { isAdminMode, currentTeam, currentTenantRole } = useMultiTenant();
  const [membershipRole, setMembershipRole] = useState<string | null>(null);
  const navigate = useNavigate();
  const isMasterDomain = typeof window !== 'undefined' && window.location?.host === 'app.delliapp.com.br';
  // Usar apenas o encerramento de sessão; desabilitar auto-start para evitar inicializações duplas
  const { endSession } = useSingleSession(null, { autoStart: false });

  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const appMetadata = user?.app_metadata as Record<string, unknown> | undefined;

  const userRoleFromProfile = currentUser?.role
    ?? getMetadataString(appMetadata?.['role'])
    ?? getMetadataString(metadata?.['role']);

  // Para navegação móvel, basear exibição nas rotas pelo currentTenantRole
  const isAdminTenant = currentTenantRole === 'dono' || currentTenantRole === 'admin';

  const displayName = currentUser?.full_name
    ?? getMetadataString(metadata?.['full_name'])
    ?? currentUser?.email
    ?? user?.email
    ?? 'Usuário';

  const displayEmail = currentUser?.email
    ?? getMetadataString(metadata?.['email'])
    ?? user?.email;

  const roleLabel = currentTenantRole ? ROLE_LABELS[currentTenantRole] ?? currentTenantRole : null;

  const masterAdminItems = useMemo(() => {
    if (!isMasterDomain || !user) return [];
    const items = buildNavigationItems({
      isAuthenticated: !!user,
      userRole: userRoleFromProfile ?? null,
      isAdminMode,
    });
    const adminKeys = new Set([
      'orders',
      'kitchen',
      'products',
      'users',
      'api',
      'dashboard',
      'settings',
      'shipping-settings',
    ]);
    return items.filter((i) => adminKeys.has(i.key));
  }, [isMasterDomain, user, userRoleFromProfile, isAdminMode]);

  useEffect(() => {
    const fetchMembershipRole = async () => {
      try {
        if (!user || !currentTeam || isAdminMode) { setMembershipRole(null); return; }
        const { data, error } = await supabase.rpc('get_membership_role_by_team' as never, { p_team_id: currentTeam.id } as never);
        if (error) { setMembershipRole('client'); return; }
        setMembershipRole((data as string) || 'client');
      } catch {
        setMembershipRole('client');
      }
    };
    fetchMembershipRole();
  }, [user?.id, currentTeam?.id, isAdminMode]);

  const handleLogout = async () => {
    try {
      // Encerrar sessão atual antes do signOut
      await endSession();
      await signOut();
      
      toast({
        title: 'Logout realizado',
        description: 'Você foi desconectado com sucesso.',
      });
      
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: 'Erro ao fazer logout',
        description: 'Ocorreu um erro ao tentar desconectar.',
        variant: 'destructive',
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
                          {isMasterDomain ? (
                            <Badge variant="secondary" className="w-fit px-3 py-1 text-xs">
                              {isSuperAdmin ? 'Super Admin' : 'Administrador'}
                            </Badge>
                          ) : (
                            roleLabel && (
                              <Badge variant="secondary" className="w-fit px-3 py-1 text-xs capitalize">
                                {roleLabel}
                              </Badge>
                            )
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

                      {/* Domínio master: usar o mesmo set de rotas administrativas do toolbox inferior, ignorando currentTenantRole */}
                      {isMasterDomain && masterAdminItems.length > 0 ? (
                        masterAdminItems.map((item) => (
                          item.to ? (
                            <Link key={item.key} to={item.to} className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                              {item.label}
                            </Link>
                          ) : null
                        ))
                      ) : (
                        // Fora do domínio master: manter comportamento com currentTenantRole ('dono' | 'admin')
                        isAdminTenant && (
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
                            <Link to="/order-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                              Pedidos
                            </Link>
                            <Link to="/kitchen-management" className="text-lg font-medium hover:text-menu-primary py-2 border-b border-gray-100">
                              Cozinha
                            </Link>
                          </>
                        )
                      )}

                      {/* Dashboard SAAS fora do domínio master: permanece como antes */}
                      {!isMasterDomain && isAdminMode && (userRoleFromProfile === 'admin') && (
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
