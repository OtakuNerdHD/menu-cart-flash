import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase, TENANT_HEADER_KEYS } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';

const KEY = (scope: string) => `sess_${scope}`;

// Sentinel usado quando o team não está resolvido
const NO_TEAM_SENTINEL = '00000000-0000-0000-0000-000000000000';

function currentScope(subdomain?: string | null) {
  return subdomain && subdomain.trim() !== '' ? subdomain.trim() : 'master';
}

function getSubdomainFromHost(): string | null {
  try {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') return null;
    const parts = hostname.split('.');
    const isDelliappDomain = parts.length >= 3 && parts[parts.length - 3] === 'delliapp' && parts[parts.length - 2] === 'com' && parts[parts.length - 1] === 'br';
    if (!isDelliappDomain) return null;
    const sub = parts[0];
    return sub === 'app' ? null : sub;
  } catch {
    return null;
  }
}

// Detecta explicitamente o domínio master
function isMasterHost(): boolean {
  try {
    return window.location.hostname === 'app.delliapp.com.br';
  } catch {
    return false;
  }
}

// Considera tenant apenas quando há subdomínio/slug resolvido
function isTenant(subdomain?: string | null): boolean {
  return !!(subdomain && subdomain.trim() !== '');
}

// Função utilitária para iniciar sessão quando já houver contexto resolvido
export async function start(roleAtLogin: string) {
  try {
    // Master não participa de single session
    if (isMasterHost()) {
      return null;
    }

    const sub = getSubdomainFromHost();
    // Apenas tenants participam
    if (!isTenant(sub)) {
      return null;
    }

    const tenantIdHeader = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
    // Gate: só iniciar quando houver tenantId válido e subdomínio resolvido
    if (!tenantIdHeader || tenantIdHeader === NO_TEAM_SENTINEL) {
      console.log('[SingleSession] Gate: tenantId inválido ou não resolvido; adiando start_session');
      return null;
    }
    const scope = `${currentScope(sub)}:${tenantIdHeader}`;
    const role = (roleAtLogin || 'cliente').toLowerCase().trim();

    // Assegurar headers básicos (se disponíveis) antes das RPCs
    try {
      localStorage.setItem(TENANT_HEADER_KEYS.role, role);
    } catch {}

    // 1) Consultar sessão ativa no servidor (fonte da verdade)
    let serverActiveId: string | null = null;
    try {
      const { data: active } = await supabase.rpc('get_active_session', { p_tenant_id_text: tenantIdHeader });
      serverActiveId = (active as string) || null;
    } catch {}

    // 2) Se servidor indicar ativa, sincronizar local e tocar
    if (serverActiveId) {
      const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: serverActiveId });
      if (touchErr) {
        localStorage.removeItem(KEY(scope));
        try { await supabase.auth.signOut(); } catch {}
        console.log('[SingleSession] Sessão ativa no servidor está revogada. Deslogando.');
        return null;
      }
      localStorage.setItem(KEY(scope), serverActiveId);
      console.log('[SingleSession] Usando sessão ativa do servidor', serverActiveId);
      return serverActiveId;
    }

    // 3) Tentar reutilizar sessão existente válida no escopo (fallback local)
    const existingLocalId = localStorage.getItem(KEY(scope));
    if (existingLocalId) {
      const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: existingLocalId });
      if (touchErr) {
        // Sessão inválida/revogada: limpar e deslogar, NÃO recriar automaticamente
        localStorage.removeItem(KEY(scope));
        try { await supabase.auth.signOut(); } catch {}
        console.log('[SingleSession] Sessão revogada detectada. Deslogando cliente.', existingLocalId);
        return null;
      }
      console.log('[SingleSession] Reutilizando sessão existente', existingLocalId);
      return existingLocalId;
    }

    // 4) Criar nova sessão caso não haja válida
    const { data, error } = await supabase.rpc('start_session', {
      p_role_at_login: role,
      p_fingerprint: null,
      p_user_agent: navigator.userAgent,
      p_ip: null
    });

    if (error) {
      const code = (error as any)?.code;
      const msg = (error as any)?.message || '';
      const isConflict = code === '23505' || msg.includes('duplicate key value');
      if (isConflict) {
        // Conflito: se já houver sessão no localStorage neste escopo, reutilizar
        const keepId = localStorage.getItem(KEY(scope));
        if (keepId) {
          try { await supabase.rpc('touch_session', { p_session_id: keepId }); } catch {}
          console.log('[SingleSession] Reutilizando sessão existente', keepId);
          return keepId;
        }
      }
      throw error;
    }

    const newId = (data as string) || null;
    if (newId) {
      localStorage.setItem(KEY(scope), newId);
      console.log('[SingleSession] Criando nova sessão', newId);
      // Garante unicidade encerrando outras do mesmo escopo
    }

    return newId;
  } catch (e) {
    throw e;
  }
}

export function useSingleSession(roleAtLogin: string | null, options?: { autoStart?: boolean }) {
  const { subdomain, currentTenantRole } = useMultiTenant();
  const tenantIdHeader = (typeof window !== 'undefined') ? localStorage.getItem(TENANT_HEADER_KEYS.tenantId) : null;
  const scope = `${currentScope(subdomain)}${tenantIdHeader ? `:${tenantIdHeader}` : ''}`;
  const sessionIdRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<any>(null);
  const location = useLocation();
  const autoStart = options?.autoStart !== false;

  // Helper: reanexar assinatura Realtime para a sessão atual
  const attachRealtimeForSession = (sid: string, scopeNow: string) => {
    try {
      // Fechar canal anterior (se houver)
      if (realtimeChannelRef.current) {
        try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
        realtimeChannelRef.current = null;
      }

      const ch = supabase
        .channel(`sess:${scopeNow}:${sid}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'app',
          table: 'sessions',
          filter: `id=eq.${sid}`
        }, async (payload: any) => {
          try {
            const revoked = payload?.new?.revoked_at;
            if (revoked) {
              // Sessão foi revogada no servidor: desloga imediatamente
              try { await supabase.auth.signOut(); } catch {}
              localStorage.removeItem(KEY(scopeNow));
              sessionIdRef.current = null;
              // Encerrar canal atual
              try { supabase.removeChannel(ch); } catch {}
              realtimeChannelRef.current = null;
            }
          } catch {}
        });

      ch.subscribe();
      realtimeChannelRef.current = ch;
    } catch {}
  };

  // Iniciar sessão automaticamente quando role resolver
  useEffect(() => {
    if (!autoStart) {
      return;
    }
    // Regra absoluta: master não participa
    if (isMasterHost()) {
      return;
    }

    // Aplicar single-session apenas em tenants
    if (!isTenant(subdomain)) {
      return;
    }

    // Gate: requer tenantId válido antes de iniciar sessão (ler valor atual)
    const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
    if (!tenantIdNow || tenantIdNow === NO_TEAM_SENTINEL) {
      console.log('[SingleSession] Gate: aguardando tenantId válido e subdomain resolvido');
      return;
    }

    if (!roleAtLogin && !currentTenantRole) return;
    
    const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
    let sessionStarted = false;
    
    const initSession = async () => {
      try {
        // Garante headers multi-tenant corretos antes das RPCs
        try {
          const roleHeader = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
          localStorage.setItem(TENANT_HEADER_KEYS.role, roleHeader);
        } catch {}
        
        const scopeNow = `${currentScope(subdomain)}:${tenantIdNow}`;

        // 1) Consultar sessão ativa no servidor (fonte da verdade)
        try {
          const { data: active } = await supabase.rpc('get_active_session', { p_tenant_id_text: tenantIdNow });
          const serverActiveId = (active as string) || null;
          if (serverActiveId) {
            const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: serverActiveId });
            if (touchErr) {
              localStorage.removeItem(KEY(scopeNow));
              sessionIdRef.current = null;
              try { await supabase.auth.signOut(); } catch {}
              console.log('[SingleSession] Sessão ativa no servidor está revogada. Deslogando cliente.');
              return;
            }
            localStorage.setItem(KEY(scopeNow), serverActiveId);
            sessionIdRef.current = serverActiveId;
            attachRealtimeForSession(serverActiveId, scopeNow);
            console.log('[SingleSession] Usando sessão ativa do servidor', serverActiveId);
            return;
          }
        } catch {}

        // 2) Tentar reutilizar sessão existente válida no escopo (fallback local)
        const existingLocalId = localStorage.getItem(KEY(scopeNow));
        if (existingLocalId) {
          const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: existingLocalId });
          if (touchErr) {
            // Sessão inválida/revogada: limpar e deslogar, NÃO recriar automaticamente
            localStorage.removeItem(KEY(scopeNow));
            sessionIdRef.current = null;
            try { await supabase.auth.signOut(); } catch {}
            console.log('[SingleSession] Sessão revogada detectada. Deslogando cliente.', existingLocalId);
            return;
          }
          sessionIdRef.current = existingLocalId;
          attachRealtimeForSession(existingLocalId, scopeNow);
          console.log('[SingleSession] Reutilizando sessão existente', existingLocalId);
          return;
        }

        // 3) Não havendo sessão válida, criar uma nova
        const { data, error } = await supabase.rpc('start_session', {
          p_role_at_login: role,
          p_fingerprint: null,
          p_user_agent: navigator.userAgent,
          p_ip: null
        });

        if (error) {
          const code = (error as any)?.code;
          const msg = (error as any)?.message || '';
          const isConflict = code === '23505' || msg.includes('duplicate key value');
          if (isConflict) {
            const keepId = localStorage.getItem(KEY(scope));
            if (keepId) {
              try { await supabase.rpc('touch_session', { p_session_id: keepId }); } catch {}
              localStorage.setItem(KEY(scope), keepId);
              sessionIdRef.current = keepId;
              console.log('[SingleSession] Reutilizando sessão existente', keepId);
              return;
            }
          }
          throw error;
        }
        
        const newId = (data as string) || null;
        sessionIdRef.current = newId;
        if (newId) {
          localStorage.setItem(KEY(scopeNow), newId);
          sessionStarted = true;
          console.log('[SingleSession] Criando nova sessão', newId);
          // Garante unicidade encerrando outras do mesmo escopo (se existirem)
          attachRealtimeForSession(newId, scopeNow);
        }
      } catch (e) {
      }
    };
    
    // Iniciar sessão
    initSession();
    
    // heartbeat: a cada 2 minutos (apenas em tenants)
    const iv = setInterval(async () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      const { error: hbErr } = await supabase.rpc('touch_session', { p_session_id: sid });
      if (hbErr) {
        try { await supabase.auth.signOut(); } catch {}
        localStorage.removeItem(KEY(scope));
        sessionIdRef.current = null;
      }
    }, 2 * 60 * 1000);

    return () => {
      clearInterval(iv);
      // Fechar canal realtime ao desmontar
      if (realtimeChannelRef.current) {
        try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
        realtimeChannelRef.current = null;
      }
    };
  }, [roleAtLogin, currentTenantRole, scope, autoStart]);

  // Detecção imediata ao trocar de rota
  useEffect(() => {
    if (!autoStart) return;
    const checkNow = async () => {
      try {
        if (isMasterHost()) return;
        if (!isTenant(subdomain)) return;
        const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
        if (!tenantIdNow || tenantIdNow === NO_TEAM_SENTINEL) return;
        const scopeNow = `${currentScope(subdomain)}:${tenantIdNow}`;
        const sid = sessionIdRef.current || localStorage.getItem(KEY(scopeNow));
        if (!sid) return;
        const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: sid });
        if (touchErr) {
          throw touchErr;
        }
      } catch {
        try { await supabase.auth.signOut(); } catch {}
        const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
        if (tenantIdNow && tenantIdNow !== NO_TEAM_SENTINEL) {
          const scopeNow = `${currentScope(subdomain)}:${tenantIdNow}`;
          localStorage.removeItem(KEY(scopeNow));
        }
        sessionIdRef.current = null;
      }
    };
    checkNow();
  }, [location.pathname, location.search, subdomain, autoStart]);

  // Detecção imediata em foco/visibilidade
  useEffect(() => {
    if (!autoStart) return;
    const onFocusOrVisible = async () => {
      try {
        if (isMasterHost()) return;
        if (!isTenant(subdomain)) return;
        const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
        if (!tenantIdNow || tenantIdNow === NO_TEAM_SENTINEL) return;
        const scopeNow = `${currentScope(subdomain)}:${tenantIdNow}`;
        const sid = sessionIdRef.current || localStorage.getItem(KEY(scopeNow));
        if (!sid) return;
        await supabase.rpc('touch_session', { p_session_id: sid });
      } catch {
        try { await supabase.auth.signOut(); } catch {}
        const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
        if (tenantIdNow && tenantIdNow !== NO_TEAM_SENTINEL) {
          const scopeNow = `${currentScope(subdomain)}:${tenantIdNow}`;
          localStorage.removeItem(KEY(scopeNow));
        }
        sessionIdRef.current = null;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onFocusOrVisible();
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [subdomain, autoStart]);

  // helper logout
  const endSession = async () => {
    try {
      const sid = sessionIdRef.current || localStorage.getItem(KEY(scope));
      if (sid) {
        await supabase.rpc('end_session', { p_session_id: sid });
      }
    } catch (e) {
    }
    localStorage.removeItem(KEY(scope));
    sessionIdRef.current = null;
  };

  // start vinculado ao escopo/hook para atualizar o ref local
  const startBound = async () => {
    try {
      // Respeitar regras de master/tenant
      if (isMasterHost()) {
        return;
      }
      if (!isTenant(subdomain)) {
        return;
      }
      // Gate: requer tenantId válido antes de iniciar sessão
      {
        const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
        if (!tenantIdNow || tenantIdNow === NO_TEAM_SENTINEL) {
          console.log('[SingleSession] Gate: tenantId inválido ou não resolvido; não iniciar sessão');
          return;
        }
      }
      
      // Garante headers multi-tenant corretos antes das RPCs
      try {
        const roleHeader = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
        localStorage.setItem(TENANT_HEADER_KEYS.role, roleHeader);
      } catch {}
      
      // 1) Consultar sessão ativa no servidor (fonte da verdade)
      const tenantIdNow = localStorage.getItem(TENANT_HEADER_KEYS.tenantId);
      const scopeNow = `${currentScope(subdomain)}:${tenantIdNow}`;
      try {
        const { data: active } = await supabase.rpc('get_active_session', { p_tenant_id_text: tenantIdNow });
        const serverActiveId = (active as string) || null;
        if (serverActiveId) {
          const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: serverActiveId });
          if (touchErr) {
            localStorage.removeItem(KEY(scopeNow));
            sessionIdRef.current = null;
            try { await supabase.auth.signOut(); } catch {}
            console.log('[SingleSession] Sessão ativa no servidor está revogada. Deslogando cliente.');
            return;
          }
          localStorage.setItem(KEY(scopeNow), serverActiveId);
          sessionIdRef.current = serverActiveId;
          attachRealtimeForSession(serverActiveId, scopeNow);
          console.log('[SingleSession] Usando sessão ativa do servidor', serverActiveId);
          return;
        }
      } catch {}

      // 2) Reutilizar sessão existente válida (fallback local)
      const localId = localStorage.getItem(KEY(scopeNow));
      if (localId) {
        const { error: touchErr } = await supabase.rpc('touch_session', { p_session_id: localId });
        if (touchErr) {
          // Sessão inválida/revogada: limpar e deslogar, NÃO recriar automaticamente
          localStorage.removeItem(KEY(scopeNow));
          sessionIdRef.current = null;
          try { await supabase.auth.signOut(); } catch {}
          console.log('[SingleSession] Sessão revogada detectada. Deslogando cliente.', localId);
          return;
        }
        sessionIdRef.current = localId;
        attachRealtimeForSession(localId, scopeNow);
        console.log('[SingleSession] Reutilizando sessão existente', localId);
        return;
      }
      
      const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
      
      const { data, error } = await supabase.rpc('start_session', {
        p_role_at_login: role,
        p_fingerprint: null,
        p_user_agent: navigator.userAgent,
        p_ip: null
      });
      
      if (error) {
        const code = (error as any)?.code;
        const msg = (error as any)?.message || '';
        const isConflict = code === '23505' || msg.includes('duplicate key value');
        if (isConflict) {
          const keepId = localStorage.getItem(KEY(scopeNow));
          if (keepId) {
            try { await supabase.rpc('touch_session', { p_session_id: keepId }); } catch {}
            localStorage.setItem(KEY(scopeNow), keepId);
            sessionIdRef.current = keepId;
            console.log('[SingleSession] Reutilizando sessão existente', keepId);
            return;
          }
        }
        throw error;
      }
      
      const newId = (data as string) || null;
      sessionIdRef.current = newId;
      if (newId) {
        localStorage.setItem(KEY(scopeNow), newId);
        console.log('[SingleSession] Criando nova sessão', newId);
        attachRealtimeForSession(newId, scopeNow);
      }
    } catch (e) {
    }
  };

  return { start: startBound, endSession };
}
