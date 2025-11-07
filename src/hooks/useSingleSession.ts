import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';

const KEY = (scope: string) => `sess_${scope}`;

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

// Função utilitária para iniciar sessão quando já houver contexto resolvido
export async function start(roleAtLogin: string) {
  try {
    const scope = currentScope(getSubdomainFromHost());
    console.log('[SingleSession] Iniciando sessão', { scope, roleAtLogin });
    
    // CRÍTICO: usar start_session (wrapper público) que revoga anterior
    const { data, error } = await (supabase as any).rpc('start_session', {
      p_role_at_login: (roleAtLogin || 'cliente').toLowerCase().trim(),
      p_fingerprint: undefined,
      p_user_agent: navigator.userAgent,
      p_ip: null
    });
    
    if (error) {
      console.error('[SingleSession] Erro ao iniciar sessão:', error);
      throw error;
    }
    
    const newId = (data as string) || null;
    if (newId) {
      localStorage.setItem(KEY(scope), newId);
      console.log('[SingleSession] Sessão criada:', newId);
    }
    
    return newId;
  } catch (e) {
    console.error('[SingleSession] start_session error', e);
    throw e;
  }
}

export function useSingleSession(roleAtLogin: string | null) {
  const { subdomain, currentTenantRole } = useMultiTenant();
  const scope = currentScope(subdomain);
  const sessionIdRef = useRef<string | null>(null);

  // Iniciar sessão automaticamente quando role resolver
  useEffect(() => {
    if (!roleAtLogin && !currentTenantRole) return;
    
    const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
    let sessionStarted = false;
    
    const initSession = async () => {
      try {
        console.log('[SingleSession] Iniciando nova sessão automaticamente', { scope, role });
        const { data, error } = await (supabase as any).rpc('start_session', {
          p_role_at_login: role,
          p_fingerprint: undefined,
          p_user_agent: navigator.userAgent,
          p_ip: null
        });
        
        if (error) throw error;
        
        const newId = (data as string) || null;
        sessionIdRef.current = newId;
        if (newId) {
          localStorage.setItem(KEY(scope), newId);
          sessionStarted = true;
          console.log('[SingleSession] Sessão iniciada:', newId);
        }
      } catch (e) {
        console.error('[SingleSession] Erro ao iniciar sessão:', e);
      }
    };
    
    // Iniciar sessão
    initSession();
    
    // heartbeat: a cada 5 minutos
    const iv = setInterval(async () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        console.log('[SingleSession] Heartbeat para sessão:', sid);
        await (supabase as any).rpc('touch_session', { p_session_id: sid });
      } catch (e) {
        console.warn('[SingleSession] touch_session error, deslogando:', e);
        try { await supabase.auth.signOut(); } catch {}
        localStorage.removeItem(KEY(scope));
        sessionIdRef.current = null;
      }
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(iv);
    };
  }, [roleAtLogin, currentTenantRole, scope]);

  // helper logout
  const endSession = async () => {
    try {
      const sid = sessionIdRef.current || localStorage.getItem(KEY(scope));
      if (sid) {
        console.log('[SingleSession] Encerrando sessão:', sid);
        await (supabase as any).rpc('end_session', { p_session_id: sid });
      }
    } catch (e) {
      console.warn('[SingleSession] Erro ao encerrar sessão:', e);
    }
    localStorage.removeItem(KEY(scope));
    sessionIdRef.current = null;
  };

  // start vinculado ao escopo/hook para atualizar o ref local
  const startBound = async () => {
    try {
      const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
      console.log('[SingleSession] startBound chamado', { scope, role });
      
      const { data, error } = await (supabase as any).rpc('start_session', {
        p_role_at_login: role,
        p_fingerprint: undefined,
        p_user_agent: navigator.userAgent,
        p_ip: null
      });
      
      if (error) throw error;
      
      const newId = (data as string) || null;
      sessionIdRef.current = newId;
      if (newId) {
        localStorage.setItem(KEY(scope), newId);
        console.log('[SingleSession] startBound: sessão criada:', newId);
      }
    } catch (e) {
      console.error('[SingleSession] start_session error', e);
    }
  };

  return { start: startBound, endSession };
}