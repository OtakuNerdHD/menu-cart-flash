import React from 'react';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Crown, Building2, ArrowLeftRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Componente que indica o modo atual (admin vs cliente) e permite alternar
 */
const TenantIndicator: React.FC = () => {
  const { 
    isAdminMode, 
    isClientMode, 
    currentTeam, 
    subdomain, 
    switchToAdmin, 
    switchToClient 
  } = useMultiTenant();

  if (isAdminMode) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <span>Delliapp Admin Geral</span>
            <Badge variant="secondary">Super Admin</Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Delliapp Admin Geral</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-sm text-muted-foreground">
            Você está no modo super admin com acesso total à plataforma.
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => switchToClient('joao')} className="gap-2">
            <Building2 className="h-4 w-4" />
            Testar como: Restaurante do João
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchToClient('bella')} className="gap-2">
            <Building2 className="h-4 w-4" />
            Testar como: Pizzaria Bella
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => switchToClient('burger')} className="gap-2">
            <Building2 className="h-4 w-4" />
            Testar como: Burger House
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (isClientMode && currentTeam) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Building2 className="h-4 w-4 text-blue-500" />
            <span>{currentTeam.name}</span>
            <Badge variant="default">{subdomain}</Badge>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Modo Cliente</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1 text-sm text-muted-foreground">
            <div><strong>Cliente:</strong> {currentTeam.name}</div>
            <div><strong>Slug:</strong> {currentTeam.slug}</div>
            <div><strong>Subdomínio:</strong> {subdomain}</div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={switchToAdmin} className="gap-2">
            <ArrowLeftRight className="h-4 w-4" />
            Voltar ao Modo Admin
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Estado de carregamento ou erro
  return (
    <Badge variant="outline" className="gap-2">
      <div className="animate-pulse h-2 w-2 bg-gray-400 rounded-full"></div>
      Carregando...
    </Badge>
  );
};

export default TenantIndicator;