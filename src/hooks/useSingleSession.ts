import { useEffect, useRef } from 'react';
import { supabase, TENANT_HEADER_KEYS } from '@/integrations/supabase/client';
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
    
    // CRÍTICO: usar RPC público start_session com assinatura correta
    const { data, error } = await supabase.rpc('start_session', {
      p_role_at_login: (roleAtLogin || 'cliente').toLowerCase().trim(),
      p_fingerprint: null,
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
  const { subdomain, currentTenantRole, resolvedTeamId } = useMultiTenant();
  const scope = `${currentScope(subdomain)}${resolvedTeamId ? `:${resolvedTeamId}` : ''}`;
  const sessionIdRef = useRef<string | null>(null);

  // Iniciar sessão automaticamente quando role resolver
  useEffect(() => {
    if (!roleAtLogin && !currentTenantRole) return;
    if (subdomain && !resolvedTeamId) return;
    
    const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
    let sessionStarted = false;
    
    const initSession = async () => {
      try {
        // Garante headers multi-tenant corretos antes das RPCs
        try {
          if (resolvedTeamId) localStorage.setItem(TENANT_HEADER_KEYS.tenantId, resolvedTeamId);
          const roleHeader = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
          localStorage.setItem(TENANT_HEADER_KEYS.role, roleHeader);
        } catch {}
        
        // 1) Tentar reutilizar sessão existente válida no escopo
        const existingLocalId = localStorage.getItem(KEY(scope));
        if (existingLocalId) {
          try { await supabase.rpc('touch_session', { p_session_id: existingLocalId }); } catch {}
          const { data: existingRow } = await (supabase.from as any)('app.sessions')
            .select('id, revoked_at')
            .eq('id', existingLocalId)
            .maybeSingle();
          if (existingRow && !existingRow.revoked_at) {
            sessionIdRef.current = existingLocalId;
            console.log('[SingleSession] Reutilizando sessão existente:', existingLocalId);
            return;
          }
          // inválida -> limpar
          localStorage.removeItem(KEY(scope));
          sessionIdRef.current = null;
        }
        
        // 2) Não havendo sessão válida, criar uma nova
        console.log('[SingleSession] Iniciando nova sessão automaticamente', { scope, role });
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
            console.warn('[SingleSession] Conflito de sessão detectado (23505). Buscando sessão ativa do escopo...');
            let q = (supabase.from as any)('app.sessions')
              .select('id, team_id_text, revoked_at, created_at')
              .is('revoked_at', null);
            q = resolvedTeamId ? q.eq('team_id_text', resolvedTeamId) : q.is('team_id_text', null);
            const { data: activeInScope } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
            if (activeInScope?.id) {
              localStorage.setItem(KEY(scope), activeInScope.id);
              sessionIdRef.current = activeInScope.id;
              console.log('[SingleSession] Sessão ativa do escopo aplicada:', activeInScope.id);
              return;
            }
          }
          throw error;
        }
        
        const newId = (data as string) || null;
        sessionIdRef.current = newId;
        if (newId) {
          localStorage.setItem(KEY(scope), newId);
          sessionStarted = true;
          console.log('[SingleSession] Sessão iniciada:', newId);
          // Garante unicidade encerrando outras do mesmo escopo (se existirem)
          try { await supabase.rpc('end_other_sessions_current_scope', { p_keep_session: newId }); } catch {}
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
        await supabase.rpc('touch_session', { p_session_id: sid });
        // Verifica se a sessão não foi revogada por outro cliente
        const { data: row } = await (supabase.from as any)('app.sessions')
          .select('id, revoked_at')
          .eq('id', sid)
          .maybeSingle();
        if (!row || row.revoked_at) {
          console.warn('[SingleSession] Sessão revogada detectada no heartbeat. Deslogando...');
          try { await supabase.auth.signOut(); } catch {}
          localStorage.removeItem(KEY(scope));
          sessionIdRef.current = null;
        }
      } catch (e) {
        console.warn('[SingleSession] touch_session erro, deslogando:', e);
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
        await supabase.rpc('end_session', { p_session_id: sid });
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
      // Garante headers multi-tenant corretos antes das RPCs
      try {
        if (resolvedTeamId) localStorage.setItem(TENANT_HEADER_KEYS.tenantId, resolvedTeamId);
        const roleHeader = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
        localStorage.setItem(TENANT_HEADER_KEYS.role, roleHeader);
      } catch {}
      
      // 1) Reutilizar sessão existente válida
      const localId = localStorage.getItem(KEY(scope));
      if (localId) {
        try { await supabase.rpc('touch_session', { p_session_id: localId }); } catch {}
        const { data: row } = await (supabase.from as any)('app.sessions')
          .select('id, revoked_at')
          .eq('id', localId)
          .maybeSingle();
        if (row && !row.revoked_at) {
          sessionIdRef.current = localId;
          console.log('[SingleSession] startBound: reutilizando sessão:', localId);
          return;
        }
        localStorage.removeItem(KEY(scope));
        sessionIdRef.current = null;
      }
      
      const role = (roleAtLogin ?? currentTenantRole ?? 'cliente').toLowerCase().trim();
      console.log('[SingleSession] startBound chamado', { scope, role });
      
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
          console.warn('[SingleSession] startBound: conflito detectado. Aplicando sessão ativa do escopo...');
          let q = (supabase.from as any)('app.sessions')
            .select('id, team_id_text, revoked_at, created_at')
            .is('revoked_at', null);
          q = resolvedTeamId ? q.eq('team_id_text', resolvedTeamId) : q.is('team_id_text', null);
          const { data: active } = await q.order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (active?.id) {
            localStorage.setItem(KEY(scope), active.id);
            sessionIdRef.current = active.id;
            console.log('[SingleSession] startBound: sessão ativa aplicada:', active.id);
            return;
          }
        }
        throw error;
      }
      
      const newId = (data as string) || null;
      sessionIdRef.current = newId;
      if (newId) {
        localStorage.setItem(KEY(scope), newId);
        console.log('[SingleSession] startBound: sessão criada:', newId);
        try { await supabase.rpc('end_other_sessions_current_scope', { p_keep_session: newId }); } catch {}
      }
    } catch (e) {
      console.error('[SingleSession] start_session error', e);
    }
  };

  return { start: startBound, endSession };
}
