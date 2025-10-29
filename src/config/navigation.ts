import { LucideIcon, Home, ClipboardList, ChefHat, Boxes, Users, ServerCog, LayoutDashboard, LogIn, Route, ShoppingBag, LogOut, Sparkles } from "lucide-react";

export type AppNavItem = {
  key: string;
  label: string;
  to?: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
  hideWhenAuthenticated?: boolean;
  roles?: string[];
  adminModeOnly?: boolean;
  showInBottomNav?: boolean;
  type?: "link" | "action";
};

export type NavContext = {
  isAuthenticated: boolean;
  userRole?: string | null;
  isAdminMode: boolean;
};

const ROLE_ORDER_ACCESS = ["waiter", "chef", "admin", "restaurant_owner"];
const ROLE_KITCHEN_ACCESS = ["chef", "admin", "restaurant_owner"];
const ROLE_ADMIN_OWNER = ["admin", "restaurant_owner"];

const baseNavItems: AppNavItem[] = [
  {
    key: "home",
    label: "Home",
    to: "/",
    icon: Home,
    showInBottomNav: true,
  },
  {
    key: "combos",
    label: "Combos",
    to: "/combos",
    icon: Sparkles,
    showInBottomNav: true,
  },
  {
    key: "order-tracking",
    label: "Acompanhar",
    to: "/order-tracking",
    icon: Route,
    requiresAuth: true,
    showInBottomNav: true,
  },
  {
    key: "orders",
    label: "Pedidos",
    to: "/order-management",
    icon: ClipboardList,
    requiresAuth: true,
    roles: ROLE_ORDER_ACCESS,
    showInBottomNav: true,
  },
  {
    key: "kitchen",
    label: "Cozinha",
    to: "/kitchen-management",
    icon: ChefHat,
    requiresAuth: true,
    roles: ROLE_KITCHEN_ACCESS,
    showInBottomNav: true,
  },
  {
    key: "products",
    label: "Produtos",
    to: "/product-management",
    icon: Boxes,
    requiresAuth: true,
    roles: ROLE_ADMIN_OWNER,
  },
  {
    key: "users",
    label: "Usuários",
    to: "/user-management",
    icon: Users,
    requiresAuth: true,
    roles: ROLE_ADMIN_OWNER,
  },
  {
    key: "api",
    label: "APIs",
    to: "/api-management",
    icon: ServerCog,
    requiresAuth: true,
    roles: ROLE_ADMIN_OWNER,
  },
  {
    key: "dashboard",
    label: "Dashboard",
    to: "/dashboard-saas",
    icon: LayoutDashboard,
    requiresAuth: true,
    roles: ["admin"],
    adminModeOnly: true,
  },
  {
    key: "login",
    label: "Entrar",
    to: "/login",
    icon: LogIn,
    hideWhenAuthenticated: true,
  },
  {
    key: "logout",
    label: "Sair",
    icon: LogOut,
    requiresAuth: true,
    type: "action",
    showInBottomNav: false,
  },
];

export function buildNavigationItems({ isAuthenticated, userRole, isAdminMode }: NavContext) {
  return baseNavItems.filter((item) => {
    if (item.hideWhenAuthenticated && isAuthenticated) return false;
    if (item.requiresAuth && !isAuthenticated) return false;
    if (item.roles && item.roles.length > 0) {
      if (!userRole || !item.roles.includes(userRole)) return false;
    }
    if (item.adminModeOnly && !isAdminMode) return false;
    if (item.key === "dashboard" && (!isAdminMode || userRole !== "admin")) {
      return false;
    }
    return true;
  });
}

export function buildBottomNavItems(ctx: NavContext) {
  return buildNavigationItems(ctx).filter((item) => item.showInBottomNav !== false && item.type !== "action");
}
