import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShoppingCart, LucideIcon } from "lucide-react";

import { buildBottomNavItems } from "@/config/navigation";
import { useAuth } from "@/context/AuthContext";
import { useMultiTenant } from "@/context/MultiTenantContext";
import { useCart } from "@/context/CartContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

interface BottomNavButtonProps {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
  badge?: number;
}

const getRoleFromAuth = (
  currentUserRole?: string | null,
  userMetadata?: Record<string, unknown>
): string | null => {
  if (currentUserRole) return currentUserRole;
  const roleMeta = userMetadata?.["role"];
  if (typeof roleMeta === "string" && roleMeta.trim().length > 0) {
    return roleMeta.trim();
  }
  return null;
};

const BottomNavButton = ({ label, icon: Icon, active, onClick, badge }: BottomNavButtonProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-none flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-medium transition-colors",
        active ? "text-menu-primary" : "text-gray-500 hover:text-menu-primary"
      )}
      aria-label={label}
    >
      <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-inherit">
        <Icon className="h-5 w-5" />
        {badge && badge > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-menu-primary px-1 text-[10px] font-semibold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
      <span className="leading-tight text-[11px]">{label}</span>
    </button>
  );
};

const MobileBottomNav = () => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, currentUser, loading } = useAuth();
  const { isAdminMode } = useMultiTenant();
  const { totalItems, toggleCart } = useCart();

  const roleFromUser = getRoleFromAuth(currentUser?.role ?? null, user?.app_metadata as Record<string, unknown> | undefined);

  const navItems = useMemo(() => {
    return buildBottomNavItems({
      isAuthenticated: !!user,
      userRole: roleFromUser,
      isAdminMode,
    });
  }, [user, roleFromUser, isAdminMode]);

  if (!isMobile || loading) {
    return null;
  }

  const handleNavigate = (to?: string) => {
    if (!to) return;
    if (location.pathname === to) return;
    navigate(to);
  };

  const hasScrollableNav = navItems.length + 1 > 4;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-md shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)] md:hidden">
      <nav
        className={cn(
          "mx-auto flex w-full max-w-[480px] items-center gap-2 px-4 pb-[calc(0.6rem+env(safe-area-inset-bottom))] pt-2",
          hasScrollableNav ? "justify-start overflow-x-auto scrollbar-hide" : "justify-center"
        )}
      >
        {navItems.map((item) => (
          <BottomNavButton
            key={item.key}
            label={item.label}
            icon={item.icon}
            active={item.to ? location.pathname.startsWith(item.to) : false}
            onClick={() => handleNavigate(item.to)}
          />
        ))}
        <BottomNavButton
          key="cart"
          label="Carrinho"
          icon={ShoppingCart}
          active={false}
          onClick={toggleCart}
          badge={totalItems}
        />
      </nav>
    </div>
  );
};

export default MobileBottomNav;
