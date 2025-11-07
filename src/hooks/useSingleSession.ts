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
    const { data, error } = await (supabase as any).rpc('start_session', {
      p_role_at_login: (roleAtLogin || 'cliente').toLowerCase().trim(),
      p_fingerprint: undefined,
      p_user_agent: navigator.userAgent,
      p_ip: null
    } as any);
    if (error) throw error;
    const newId = (data as string) || null;
    if (newId) localStorage.setItem(KEY(scope), newId);
  } catch (e) {
    console.error('start_session error', e);
  }
}

export function useSingleSession(roleAtLogin: string | null) {
  const { subdomain, currentTenantRole } = useMultiTenant();
  const scope = currentScope(subdomain);
  const sessionIdRef = useRef<string | null>(null);

  // Heartbeat e sincronização de sessionId do storage
  useEffect(() => {
    // precisa de papel resolvido por tenant para manter heartbeat
    if (!roleAtLogin && !currentTenantRole) return;

    const prev = localStorage.getItem(KEY(scope));
    sessionIdRef.current = prev || null;

    // heartbeat: a cada 5 minutos
    const iv = setInterval(async () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        await (supabase as any).rpc('touch_session', { p_session_id: sid } as any);
      } catch (e) {
        console.warn('touch_session error', e);
        try { await (supabase as any).auth.signOut(); } catch {}
        localStorage.removeItem(KEY(scope));
        sessionIdRef.current = null;
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(iv);
    // role e scope determinam a sessão
  }, [roleAtLogin, currentTenantRole, scope]);

  // helper logout
  const endSession = async () => {
    try {
      const sid = sessionIdRef.current || localStorage.getItem(KEY(scope));
      if (sid) {
        await (supabase as any).rpc('end_session', { p_session_id: sid } as any);
      }
    } catch {}
    localStorage.removeItem(KEY(scope));
    sessionIdRef.current = null;
  };

  // start vinculado ao escopo/hook para atualizar o ref local
  const startBound = async () => {
    try {
      const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
      const { data, error } = await (supabase as any).rpc('start_session', {
        p_role_at_login: role,
        p_fingerprint: undefined,
        p_user_agent: navigator.userAgent,
        p_ip: null
      } as any);
      if (error) throw error;
      const newId = (data as string) || null;
      sessionIdRef.current = newId;
      if (newId) localStorage.setItem(KEY(scope), newId);
    } catch (e) {
      console.error('start_session error', e);
    }
  };

  return { start: startBound, endSession };
}