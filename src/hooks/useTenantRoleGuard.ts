import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useMultiTenant } from '@/context/MultiTenantContext';

export function useTenantRoleGuard(allowedRoles: string[]) {
  const { currentTenantRole } = useMultiTenant();
  const navigate = useNavigate();
  const { subdomain } = useMultiTenant();

  const normalize = (value: string) => value.trim().toLowerCase();

  const normalizedAllowed = useMemo(() => allowedRoles.map(normalize), [allowedRoles]);
  const normalizedRole = useMemo(
    () => (currentTenantRole ? normalize(currentTenantRole) : null),
    [currentTenantRole]
  );

  const allowed = useMemo(() => {
    // domínio master bypass
    if (!subdomain || subdomain.trim() === '' || window.location.host === 'app.delliapp.com.br') {
      return true;
    }
    // currentTenantRole null => permitir apenas páginas públicas (sem roles exigidas)
    if (normalizedRole === null) {
      return normalizedAllowed.length === 0;
    }
    // Papel presente => precisa estar na lista permitida
    return normalizedAllowed.includes(normalizedRole);
  }, [normalizedAllowed, normalizedRole]);

  // Evitar múltiplos toasts/redirecionamentos em renderizações consecutivas
  const didRedirectRef = useRef(false);

  useEffect(() => {
    if (!allowed) {
      if (!didRedirectRef.current) {
        didRedirectRef.current = true;
        toast.error('Acesso negado');
        navigate('/', { replace: true });
        // Resetar a flag após curto período para permitir novas verificações em navegações futuras
        setTimeout(() => {
          didRedirectRef.current = false;
        }, 300);
      }
    }
  }, [allowed, navigate]);

  return allowed;
}