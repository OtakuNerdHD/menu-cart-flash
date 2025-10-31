import { supabase } from '@/integrations/supabase/client';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const NO_TEAM_SENTINEL = '00000000-0000-0000-0000-000000000000';

// Normaliza um slug inserido pelo usuário:
// - lower-case, trim
// - remove http(s)://
// - se contiver ponto, usa apenas o primeiro rótulo (ex.: "raminhos.com.br" -> "raminhos")
// - mantém somente [a-z0-9-], troca sequências inválidas por '-'
// - remove hifens duplicados e nas extremidades
const normalizeSlug = (input: string): string => {
  let s = (input || '').toLowerCase().trim();
  s = s.replace(/^https?:\/\//, '');
  if (s.includes('.')) s = s.split('.')[0];
  s = s.replace(/[^a-z0-9-]+/g, '-');
  s = s.replace(/-+/g, '-');
  s = s.replace(/^-+|-+$/g, '');
  return s;
};

/**
 * Hook que encapsula operações do Supabase com isolamento multi-tenant
 * Filtra automaticamente os dados baseado no team atual
 */
export const useSupabaseWithMultiTenant = () => {
  const { currentTeam, isAdminMode, subdomain } = useMultiTenant();
  const { loading: authLoading, user: authUser, isSuperAdmin } = useAuth();
  const teamIdCacheRef = useRef<{ slug: string | null; teamId: string | null }>({ slug: null, teamId: null });

  // Configurar o team_id no Supabase para RLS
  useEffect(() => {
    const configureSupabase = async () => {
      // Se houver usuário autenticado, configurar RLS
      if (authUser && !authLoading) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          
          if (sessionError || !session) {
            console.log('Nenhuma sessão ativa encontrada');
            return;
          }
          
          console.log('Configurando RLS para usuário autenticado:', authUser.id);
          
          if (isAdminMode) {
            const roleValue = isSuperAdmin ? 'general_admin' : 'admin';

            await supabase.rpc('set_app_config', {
              config_name: 'app.current_user_role',
              config_value: roleValue
            });

            await supabase.rpc('set_app_config', {
              config_name: 'app.current_team_id',
              config_value: NO_TEAM_SENTINEL
            });

            await supabase.rpc('set_app_config', {
              config_name: 'app.current_team',
              config_value: NO_TEAM_SENTINEL
            });

            console.log(`RLS configurado para ${roleValue}`);
          } else if (currentTeam?.id) {
            await supabase.rpc('set_app_config', {
              config_name: 'app.current_user_role',
              config_value: 'user'
            });
            
            await supabase.rpc('set_app_config', {
              config_name: 'app.current_team_id',
              config_value: currentTeam.id.toString()
            });

            await supabase.rpc('set_app_config', {
              config_name: 'app.current_team',
              config_value: currentTeam.id.toString()
            });
            
            console.log('RLS configurado para team:', currentTeam.id);
          }
        } catch (error) {
          console.warn('Erro ao configurar RLS para usuário:', error);
        }
      }
      // Se não houver usuário (visitante), o RLS será configurado no momento da primeira chamada
      else if (!authLoading) {
        console.log('Visitante detectado - RLS será configurado na primeira consulta');
      }
    };

    configureSupabase();
  }, [isAdminMode, currentTeam, authLoading, authUser, isSuperAdmin]);

  const resolveTeamIdBySlug = useCallback(async (): Promise<string | null> => {
    if (!subdomain) return null;
    if (teamIdCacheRef.current.slug === subdomain && teamIdCacheRef.current.teamId) {
      return teamIdCacheRef.current.teamId;
    }
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('id')
        .eq('slug', subdomain)
        .maybeSingle();
      if (error) {
        console.warn('Falha ao resolver team por slug:', error);
        return null;
      }
      const teamId = data?.id ? String(data.id) : null;
      teamIdCacheRef.current = { slug: subdomain, teamId };
      return teamId;
    } catch (error) {
      console.warn('Erro ao resolver team por slug:', error);
      return null;
    }
  }, [subdomain]);

  const ensureRlsVisitor = useCallback(async (): Promise<string | null> => {
    const teamId = await resolveTeamIdBySlug();
    if (!teamId) {
      console.warn('Não foi possível determinar o team do visitante.');
      return null;
    }

    try {
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_user_role',
        config_value: 'visitor'
      });
    } catch (error) {
      console.warn('Falha ao configurar papel de visitante:', error);
    }

    for (const configName of ['app.current_team_id', 'app.current_team']) {
      try {
        await supabase.rpc('set_app_config', {
          config_name: configName,
          config_value: teamId
        });
      } catch (error) {
        console.warn(`Falha ao configurar ${configName} para visitante:`, error);
      }
    }

    try {
      let restaurantId = '0';
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('team_id', teamId)
        .limit(1);
      if (restaurants && restaurants.length > 0) {
        restaurantId = String(restaurants[0].id);
      }
      await supabase.rpc('set_app_config', {
        config_name: 'jwt.claims.restaurant_id',
        config_value: restaurantId
      } as never);
    } catch (error) {
      console.warn('Falha ao configurar restaurant_id para visitante:', error);
    }

    return teamId;
  }, [resolveTeamIdBySlug]);

  // Categorias dinâmicas (funções hoisted)
  async function getCategories() {
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) { try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {} }
    }
    if (!isAdminMode && currentTeam?.id) {
      try { await supabase.rpc('ensure_default_categories' as never, { p_team_id: String(currentTeam.id) } as never); } catch {}
    }
    let query = (supabase as any).from('categories').select('*').order('name', { ascending: true });
    query = addTeamFilter(query);
    const { data, error } = await query;
    if (error) throw error;
    return data as Array<{ id: number; name: string; team_id: string; is_default: boolean }>;
  }

  async function upsertCategory(name: string) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const list = await getCategories();
    const found = list.find(c => c.name.toLowerCase() === trimmed.toLowerCase());
    if (found) return found;
    const teamId = isAdminMode ? null : currentTeam?.id || (await ensureMembershipBySlug());
    if (!teamId) throw new Error('Team do tenant não definido para criar categoria.');
    const { data, error } = await (supabase as any)
      .from('categories')
      .insert({ name: trimmed, team_id: String(teamId), is_default: false })
      .select('*')
      .single();
    if (error) throw error;
    return data as { id: number; name: string; team_id: string; is_default: boolean };
  }

  async function setProductCategories(productId: number, names: string[]) {
    const unique = Array.from(new Set((names || []).map(n => (n || '').trim()).filter(Boolean))).slice(0, 5);
    if (unique.length === 0) return;
    const teamId = isAdminMode ? null : currentTeam?.id || (await ensureMembershipBySlug());
    if (!teamId) throw new Error('Team do tenant não definido para vincular categorias.');
    const ensured = [] as { id: number; name: string }[];
    for (const n of unique) {
      const cat = await upsertCategory(n);
      if (cat) ensured.push({ id: Number((cat as any).id), name: (cat as any).name });
    }
    let del = (supabase as any).from('product_categories').delete().eq('product_id', productId);
    del = (currentTeam && !isAdminMode) ? del.eq('team_id', currentTeam.id) : del;
    const { error: delErr } = await del; if (delErr) throw delErr;
    const rows = ensured.map(c => ({ product_id: productId, category_id: c.id, team_id: String(teamId) }));
    const { error: insErr } = await (supabase as any).from('product_categories').insert(rows);
    if (insErr) throw insErr;
    try { await updateProduct(String(productId), { category: unique[0] }); } catch {}
  }

  async function setComboCategories(comboId: number, names: string[]) {
    const unique = Array.from(new Set((names || []).map(n => (n || '').trim()).filter(Boolean))).slice(0, 5);
    if (unique.length === 0) return;
    const teamId = isAdminMode ? null : currentTeam?.id || (await ensureMembershipBySlug());
    if (!teamId) throw new Error('Team do tenant não definido para vincular categorias do combo.');
    const ensured = [] as { id: number; name: string }[];
    for (const n of unique) {
      const cat = await upsertCategory(n);
      if (cat) ensured.push({ id: Number((cat as any).id), name: (cat as any).name });
    }
    let del = (supabase as any).from('combo_categories').delete().eq('combo_id', comboId);
    del = (currentTeam && !isAdminMode) ? del.eq('team_id', currentTeam.id) : del;
    const { error: delErr } = await del; if (delErr) throw delErr;
    const rows = ensured.map(c => ({ combo_id: comboId, category_id: c.id, team_id: String(teamId) }));
    const { error: insErr } = await (supabase as any).from('combo_categories').insert(rows);
    if (insErr) throw insErr;
    try {
      let q = supabase.from('combos').update({ category: unique[0] }).eq('id', comboId);
      if (!isAdminMode && currentTeam) q = q.eq('team_id', currentTeam.id);
      await q;
    } catch {}
  }

  // Retorna nomes de categorias associadas a um produto
  async function getCategoriesForProduct(productId: number): Promise<string[]> {
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) { try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {} }
    }
    const { data: links, error: lerr } = await (supabase as any)
      .from('product_categories')
      .select('category_id')
      .eq('product_id', productId);
    if (lerr) throw lerr;
    const ids = (links || []).map((r: any) => r.category_id);
    if (ids.length === 0) return [];
    const { data: cats, error: cerr } = await (supabase as any)
      .from('categories')
      .select('id,name')
      .in('id', ids);
    if (cerr) throw cerr;
    return (cats || []).map((c: any) => c.name);
  }

  // Retorna nomes de categorias associadas a um combo
  async function getCategoriesForCombo(comboId: number): Promise<string[]> {
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) { try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {} }
    }
    const { data: links, error: lerr } = await (supabase as any)
      .from('combo_categories')
      .select('category_id')
      .eq('combo_id', comboId);
    if (lerr) throw lerr;
    const ids = (links || []).map((r: any) => r.category_id);
    if (ids.length === 0) return [];
    const { data: cats, error: cerr } = await (supabase as any)
      .from('categories')
      .select('id,name')
      .in('id', ids);
    if (cerr) throw cerr;
    return (cats || []).map((c: any) => c.name);
  }

  // Lista categorias existentes com pelo menos 1 item
  const getNonEmptyCategories = useCallback(async (kind: 'products' | 'combos'): Promise<string[]> => {
    // Para visitantes, configurar RLS antes de consultar
    if (!authUser && !authLoading) {
      await ensureRlsVisitor();
    } else {
      await ensureRlsRef.current?.();
    }
    
    if (kind === 'products') {
      const { data, error } = await (supabase as any)
        .from('product_categories')
        .select('category_id')
        .limit(2000);
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((r: any) => r.category_id)));
      if (ids.length === 0) return [];
      const { data: cats, error: cerr } = await (supabase as any)
        .from('categories')
        .select('name,id')
        .in('id', ids)
        .order('name', { ascending: true });
      if (cerr) throw cerr;
      return (cats || []).map((c: any) => c.name);
    } else {
      const { data, error } = await (supabase as any)
        .from('combo_categories')
        .select('category_id')
        .limit(2000);
      if (error) throw error;
      const ids = Array.from(new Set((data || []).map((r: any) => r.category_id)));
      if (ids.length === 0) return [];
      const { data: cats, error: cerr } = await (supabase as any)
        .from('categories')
        .select('name,id')
        .in('id', ids)
        .order('name', { ascending: true });
      if (cerr) throw cerr;
      return (cats || []).map((c: any) => c.name);
    }
  }, [authUser, authLoading, ensureRlsVisitor, ensureRls, isAdminMode, currentTeam, subdomain]);

  const getProductById = async (id: string | number) => {
    let teamIdForFilter: string | null = null;

    if (isAdminMode) {
      await ensureRlsAdmin();
    } else if (authUser) {
      await ensureRlsUserTeam();
      if (currentTeam?.id) {
        teamIdForFilter = String(currentTeam.id);
      } else if (subdomain) {
        try {
          teamIdForFilter = await ensureMembershipBySlug();
        } catch (error) {
          console.warn('Falha ao garantir associação por slug ao buscar produto:', error);
        }
      }
    } else {
      teamIdForFilter = await ensureRlsVisitor();
      if (!teamIdForFilter) {
        throw new Error('Tenant não encontrado para este produto.');
      }
    }

    let query = supabase.from('products').select('*').eq('id', Number(id));
    if (!isAdminMode) {
      const effectiveTeamId = teamIdForFilter ?? currentTeam?.id ?? null;
      if (effectiveTeamId) {
        query = query.eq('team_id', effectiveTeamId);
      }
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  };

  // Exclui categoria não padrão se não estiver em uso (respeita isolamento por team)
  async function deleteCategoryIfUnused(name: string): Promise<
    | { status: 'ok' }
    | { status: 'default' | 'in_use' | 'not_found' | 'error'; message?: string }
  > {
    try {
      const trimmed = (name || '').trim();
      if (!trimmed) return { status: 'not_found' };
      if (isAdminMode) {
        await ensureRlsAdmin();
      } else {
        await ensureRlsUserTeam();
        if (subdomain) { try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {} }
      }
      let q = (supabase as any).from('categories').select('*').eq('name', trimmed).limit(1);
      q = addTeamFilter(q);
      const { data: catRows, error: catErr } = await q;
      if (catErr) return { status: 'error', message: String(catErr.message || catErr) };
      const cat = Array.isArray(catRows) && catRows.length > 0 ? catRows[0] : null;
      if (!cat) return { status: 'not_found' };
      if (cat.is_default) return { status: 'default', message: 'Categoria padrão do sistema não pode ser excluída.' };
      const catId = Number(cat.id);
      let pQ = (supabase as any)
        .from('product_categories')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', catId);
      pQ = addTeamFilter(pQ);
      const { count: prodCount, error: pErr } = await pQ;
      if (pErr) return { status: 'error', message: String(pErr.message || pErr) };
      let cQ = (supabase as any)
        .from('combo_categories')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', catId);
      cQ = addTeamFilter(cQ);
      const { count: comboCount, error: cErr } = await cQ;
      if (cErr) return { status: 'error', message: String(cErr.message || cErr) };
      if ((prodCount || 0) > 0 || (comboCount || 0) > 0) {
        return { status: 'in_use', message: 'Categoria está em uso por outros itens.' };
      }
      let dQ = (supabase as any).from('categories').delete().eq('id', catId);
      dQ = addTeamFilter(dQ);
      const { error: dErr } = await dQ;
      if (dErr) return { status: 'error', message: String(dErr.message || dErr) };
      return { status: 'ok' };
    } catch (e: any) {
      return { status: 'error', message: String(e?.message || e) };
    }
  }

  // Garante que consultas administrativas rodem com RLS correto
  const ensureRlsAdmin = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('Sessão não encontrada');
    if (!isSuperAdmin) {
      throw new Error('Acesso negado: apenas super admin podem executar operações globais.');
    }
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_user_role',
      config_value: 'general_admin'
    });
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team_id',
      config_value: NO_TEAM_SENTINEL
    });
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team',
      config_value: NO_TEAM_SENTINEL
    });
    // Compatibilidade com políticas antigas que leem jwt.claims.restaurant_id
    try {
      await supabase.rpc('set_app_config', {
        config_name: 'jwt.claims.restaurant_id',
        config_value: '0'
      } as never);
    } catch {}
  };

  // Garante que visitantes (não autenticados) tenham RLS configurado
  const ensureRlsVisitorInternal = async (): Promise<string | null> => {
    const teamId = await resolveTeamIdBySlug();
    if (!teamId) {
      console.warn('Não foi possível determinar o team do visitante.');
      return null;
    }

    try {
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_user_role',
        config_value: 'visitor'
      });
    } catch (error) {
      console.warn('Falha ao configurar papel de visitante:', error);
    }

    for (const configName of ['app.current_team_id', 'app.current_team']) {
      try {
        await supabase.rpc('set_app_config', {
          config_name: configName,
          config_value: teamId
        });
      } catch (error) {
        console.warn(`Falha ao configurar ${configName} para visitante:`, error);
      }
    }

    try {
      let restaurantId = '0';
      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id')
        .eq('team_id', teamId)
        .limit(1);
      if (restaurants && restaurants.length > 0) {
        restaurantId = String(restaurants[0].id);
      }
      await supabase.rpc('set_app_config', {
        config_name: 'jwt.claims.restaurant_id',
        config_value: restaurantId
      } as never);
    } catch (error) {
      console.warn('Falha ao configurar restaurant_id para visitante:', error);
    }

    console.log('[Visitante] RLS configurado para teamId:', teamId);
    return teamId;
  };

  // Garante contexto RLS para usuário de um team específico
  const ensureRlsUserTeam = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('Sessão não encontrada');
    if (isAdminMode) return; // admin lida com ensureRlsAdmin quando necessário
    // Se o team ainda não foi resolvido, configurar somente o papel e tentar garantir membership por slug
    if (!currentTeam?.id) {
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_user_role',
        config_value: 'user'
      });
      // Tentar garantir membership e já configurar o team para evitar vazamento antes do currentTeam
      let ensuredId: string | null = null;
      try {
        ensuredId = await ensureMembershipBySlug();
      } catch (e) {
        console.warn('ensure_membership falhou (ensureRlsUserTeam):', e);
      }
      const teamValue = ensuredId ?? NO_TEAM_SENTINEL;
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_team_id',
        config_value: teamValue
      });
      await supabase.rpc('set_app_config', {
        config_name: 'app.current_team',
        config_value: teamValue
      });
      // Definir jwt.claims.restaurant_id com base no team (ou 0 se não houver)
      try {
        let rid = '0';
        if (ensuredId) {
          const { data: rest } = await supabase
            .from('restaurants')
            .select('id')
            .eq('team_id', ensuredId)
            .limit(1);
          if (rest && rest.length > 0) rid = String(rest[0].id);
        }
        await supabase.rpc('set_app_config', {
          config_name: 'jwt.claims.restaurant_id',
          config_value: rid
        } as never);
      } catch {}
      return;
    }
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_user_role',
      config_value: 'user'
    });
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team_id',
      config_value: currentTeam.id.toString()
    });
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team',
      config_value: currentTeam.id.toString()
    });
    // Definir jwt.claims.restaurant_id baseado no team atual
    try {
      let rid = '0';
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id')
        .eq('team_id', currentTeam.id)
        .limit(1);
      if (rest && rest.length > 0) rid = String(rest[0].id);
      await supabase.rpc('set_app_config', {
        config_name: 'jwt.claims.restaurant_id',
        config_value: rid
      } as never);
    } catch {}
  };

  // Resolve team_id via slug (se possível), garantindo membership e retornando o id
  const ensureMembershipBySlug = async (): Promise<string | null> => {
    try {
      if (!subdomain) return null;
      const { data, error } = await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never);
      if (error) {
        console.warn('ensure_membership falhou:', error);
        return null;
      }
      return data ? String(data as any) : null;
    } catch (e) {
      console.warn('Erro ensure_membership:', e);
      return null;
    }
  };

  // Função para adicionar filtro de team automaticamente
  const addTeamFilter = (query: any) => {
    if (!isAdminMode && currentTeam) {
      return query.eq('team_id', currentTeam.id);
    }
    return query;
  };

  // Combos (fora do useEffect)
  const getCombos = useCallback(async (filters?: {
    onlyHighlightedHomepage?: boolean;
    onlyHighlightedCombos?: boolean;
  }) => {
    // Para visitantes não logados, garantir RLS antes de consultar
    if (!authUser && !authLoading) {
      await ensureRlsVisitorInternal();
    } else {
      await ensureRlsRef.current?.();
    }
    
    let query = supabase.from('combos').select('*');
    query = addTeamFilter(query);
    if (filters?.onlyHighlightedHomepage) {
      query = query.or('highlight_full.eq.true,highlight_homepage.eq.true');
    }
    if (filters?.onlyHighlightedCombos) {
      query = query.or('highlight_full.eq.true,highlight_combos.eq.true');
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }, [authUser, authLoading, isAdminMode, currentTeam, subdomain]);

  const getComboById = async (id: string | number) => {
    let teamIdForFilter: string | null = null;

    if (isAdminMode) {
      await ensureRlsAdmin();
    } else if (authUser) {
      await ensureRlsUserTeam();
      if (currentTeam?.id) {
        teamIdForFilter = String(currentTeam.id);
      } else if (subdomain) {
        try {
          teamIdForFilter = await ensureMembershipBySlug();
        } catch (error) {
          console.warn('Falha ao garantir associação por slug ao buscar combo:', error);
        }
      }
    } else {
      teamIdForFilter = await ensureRlsVisitor();
      if (!teamIdForFilter) {
        throw new Error('Tenant não encontrado para este combo.');
      }
    }

    let query = supabase.from('combos').select('*').eq('id', Number(id));
    if (!isAdminMode) {
      const effectiveTeamId = teamIdForFilter ?? currentTeam?.id ?? null;
      if (effectiveTeamId) {
        query = query.eq('team_id', effectiveTeamId);
      }
    }

    const { data, error } = await query.maybeSingle();
    if (error) throw error;
    return data;
  };

  const createCombo = async (combo: any) => {
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) {
        const { error: memErr } = await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never);
        if (memErr) console.warn('ensure_membership falhou (createCombo):', memErr);
      }
    }
    let teamId = isAdminMode ? combo.team_id : currentTeam?.id;
    if (!teamId) {
      teamId = await ensureMembershipBySlug();
    }
    if (!teamId) throw new Error('Team do combo não definido.');
    const base = {
      team_id: teamId,
      title: combo.title,
      description: combo.description ?? null,
      price_label: combo.priceLabel ?? null,
      serves: combo.serves ?? null,
      category: combo.category ?? null,
      images: combo.images ?? [],
      perks: combo.perks ?? [],
      combo_type: combo.comboType ?? 'custom',
      savings: combo.savings ?? null,
      highlight_homepage: !!combo.highlight_homepage || !!combo.highlight_full,
      highlight_combos: !!combo.highlight_combos || !!combo.highlight_full,
      highlight_full: !!combo.highlight_full,
    };
    const { data, error } = await supabase.from('combos').insert(base).select('*').single();
    if (error) throw error;
    const comboId = data.id as number;
    if (base.combo_type === 'existing' && Array.isArray(combo.productIds) && combo.productIds.length > 0) {
      const rows = combo.productIds.map((pid: string, idx: number) => ({ combo_id: comboId, product_id: Number(pid), position: idx, team_id: teamId }));
      const { error: cpErr } = await supabase.from('combo_products').insert(rows);
      if (cpErr) throw cpErr;
    } else if (base.combo_type === 'custom' && Array.isArray(combo.items) && combo.items.length > 0) {
      const rows = combo.items.map((desc: string, idx: number) => ({ combo_id: comboId, description: desc, position: idx, team_id: teamId }));
      const { error: ciErr } = await supabase.from('combo_items_custom').insert(rows);
      if (ciErr) throw ciErr;
    }
    // Vincular categorias dinâmicas (até 5) se fornecidas
    try {
      if (Array.isArray(combo.categories) && combo.categories.length > 0) {
        await setComboCategories(comboId, combo.categories);
      }
    } catch (e) {
      console.warn('Falha ao vincular categorias ao combo:', e);
    }
    return data;
  };

  const updateCombo = async (id: string | number, combo: any) => {
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) {
        const { error: memErr } = await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never);
        if (memErr) console.warn('ensure_membership falhou (updateCombo):', memErr);
      }
    }
    let teamId = isAdminMode ? combo.team_id : currentTeam?.id;
    const baseUpdates = {
      title: combo.title,
      description: combo.description ?? null,
      price_label: combo.priceLabel ?? null,
      serves: combo.serves ?? null,
      category: combo.category ?? null,
      images: combo.images ?? [],
      perks: combo.perks ?? [],
      combo_type: combo.comboType ?? 'custom',
      savings: combo.savings ?? null,
      highlight_homepage: !!combo.highlight_homepage || !!combo.highlight_full,
      highlight_combos: !!combo.highlight_combos || !!combo.highlight_full,
      highlight_full: !!combo.highlight_full,
    };
    let query = supabase.from('combos').update(baseUpdates).eq('id', Number(id));
    if (!isAdminMode && currentTeam) query = query.eq('team_id', currentTeam.id);
    const { data, error } = await query.select('*').single();
    if (error) throw error;
    // Se ainda não temos teamId definido, usar o do registro atualizado
    if (!teamId) {
      // @ts-ignore
      teamId = (data as any)?.team_id || teamId;
      if (!teamId) {
        teamId = await ensureMembershipBySlug();
      }
    }
    // Replace children
    let del1 = supabase.from('combo_products').delete().eq('combo_id', Number(id));
    let del2 = supabase.from('combo_items_custom').delete().eq('combo_id', Number(id));
    if (!isAdminMode && currentTeam) { del1 = del1.eq('team_id', currentTeam.id); del2 = del2.eq('team_id', currentTeam.id); }
    const [{ error: e1 }, { error: e2 }] = await Promise.all([del1, del2]);
    if (e1) throw e1; if (e2) throw e2;
    if (baseUpdates.combo_type === 'existing' && Array.isArray(combo.productIds) && combo.productIds.length > 0) {
      const rows = combo.productIds.map((pid: string, idx: number) => ({ combo_id: Number(id), product_id: Number(pid), position: idx, team_id: teamId }));
      const { error: cpErr } = await supabase.from('combo_products').insert(rows); if (cpErr) throw cpErr;
    } else if (baseUpdates.combo_type === 'custom' && Array.isArray(combo.items) && combo.items.length > 0) {
      const rows = combo.items.map((desc: string, idx: number) => ({ combo_id: Number(id), description: desc, position: idx, team_id: teamId }));
      const { error: ciErr } = await supabase.from('combo_items_custom').insert(rows); if (ciErr) throw ciErr;
    }
    // Vincular categorias dinâmicas (até 5) se fornecidas
    try {
      if (Array.isArray(combo.categories) && combo.categories.length > 0) {
        await setComboCategories(Number(id), combo.categories);
      }
    } catch (e) {
      console.warn('Falha ao vincular categorias ao combo:', e);
    }
    return data;
  };

  const deleteCombo = async (id: string | number) => {
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (currentTeam?.slug) {
        try { await supabase.rpc('ensure_membership' as never, { team_slug: currentTeam.slug } as never); } catch {}
      }
    }
    let query = supabase.from('combos').delete().eq('id', Number(id));
    if (!isAdminMode && currentTeam) query = query.eq('team_id', currentTeam.id);
    const { error } = await query; if (error) throw error;
  };

  // Utilitário público para garantir RLS conforme o contexto atual (admin vs usuário)
  async function ensureRls() {
    if (isAdminMode) {
      await ensureRlsAdmin();
      return;
    }

    if (authUser && !authLoading) {
      try {
        await ensureRlsUserTeam();
        if (subdomain) {
          try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {}
        }
        return;
      } catch (error) {
        console.warn('Falha ao configurar RLS autenticado, tentando modo visitante:', error);
      }
    }

    // Se não há usuário ou ainda está carregando, configurar como visitante
    if (!authUser && !authLoading) {
      await ensureRlsVisitorInternal();
    }
  }

  const ensureRlsRef = useRef(ensureRls);
  useEffect(() => {
    ensureRlsRef.current = ensureRls;
  }, [ensureRls]);

  // Produtos
  const getProducts = useCallback(async (filters?: { category?: string; restaurant_id?: string }) => {
    // Para visitantes não logados, garantir RLS antes de consultar
    if (!authUser && !authLoading) {
      await ensureRlsVisitorInternal();
    } else {
      await ensureRlsRef.current?.();
    }
    
    let query = supabase.from('products').select('*');
    
    // Aplicar filtro de team automaticamente
    query = addTeamFilter(query);
    
    if (filters?.category) {
      query = query.eq('category', filters.category);
    }
    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', Number(filters.restaurant_id));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, [authUser, authLoading, isAdminMode, currentTeam, subdomain]);

  const createProduct = async (product: any) => {
    // Garantir contexto RLS e membership
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) { try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {} }
    }

    let teamId = isAdminMode ? product.team_id : currentTeam?.id;
    if (!teamId) {
      teamId = await ensureMembershipBySlug();
    }
    if (!teamId) throw new Error('Team do produto não definido.');

    const { categories: _categories, ...rest } = product || {};
    const productData = {
      ...rest,
      team_id: teamId
    } as any;

    // Garantir restaurant_id para compatibilidade com a homepage (join por restaurants.team_id)
    let restaurantId = productData.restaurant_id;

    // Resolver restaurant_id conforme o contexto
    if (!restaurantId) {
      // Tentar resolver restaurante do time, mas não falhar se não existir
      const targetTeamId = teamId;
      if (targetTeamId) {
        const { data: restaurants, error: restErr } = await supabase
          .from('restaurants')
          .select('id')
          .eq('team_id', targetTeamId)
          .limit(1);
        if (restErr) throw restErr;
        if (restaurants && restaurants.length > 0) {
          restaurantId = restaurants[0].id;
        }
      }
    }

    const insertData = { ...productData, restaurant_id: restaurantId ?? null };

    // Garantir variáveis de contexto compatíveis com políticas legadas
    await supabase.rpc('set_app_config', { config_name: 'app.current_team_id', config_value: String(teamId) });
    await supabase.rpc('set_app_config', { config_name: 'app.current_team',    config_value: String(teamId) });

    const { data, error } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();

    if (error) throw error;
    // Vincular categorias dinâmicas (até 5) se fornecidas
    try {
      if (Array.isArray(product.categories) && product.categories.length > 0) {
        await setProductCategories(Number((data as any).id), product.categories);
      }
    } catch (e) {
      console.warn('Falha ao vincular categorias ao produto:', e);
    }
    return data;
  };

  const updateProduct = async (id: string, updates: any) => {
    const { categories: catList, ...restUpdates } = updates || {};
    let query = supabase.from('products').update(restUpdates).eq('id', Number(id));
    
    // Aplicar filtro de team para segurança
    if (!isAdminMode && currentTeam) {
      query = query.eq('team_id', currentTeam.id);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    try {
      if (Array.isArray(catList) && catList.length > 0) {
        await setProductCategories(Number(id), catList);
      }
    } catch (e) {
      console.warn('Falha ao vincular categorias no update do produto:', e);
    }
    return data;
  };

  const deleteProduct = async (id: string) => {
    // Garantir contexto RLS e membership antes da exclusão
    if (isAdminMode) {
      await ensureRlsAdmin();
    } else {
      await ensureRlsUserTeam();
      if (subdomain) { try { await supabase.rpc('ensure_membership' as never, { team_slug: subdomain } as never); } catch {} }
    }

    let query = supabase.from('products').delete().eq('id', Number(id));
    if (!isAdminMode && currentTeam) {
      query = query.eq('team_id', currentTeam.id);
    }
    const { error } = await query;
    if (error) throw error;
  };

  // Pedidos
  const getOrders = async (filters?: { status?: string; restaurant_id?: string }) => {
    // Evitar nested select que depende de FK declarada no PostgREST
    let query = supabase.from('orders').select('*');
    
    // Aplicar filtro de team automaticamente
    query = addTeamFilter(query);
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', Number(filters.restaurant_id));
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const createOrder = async (order: any) => {
    const orderData = {
      ...order,
      team_id: isAdminMode ? order.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  const updateOrder = async (id: string, updates: any) => {
    let query = supabase.from('orders').update(updates).eq('id', Number(id));
    
    // Aplicar filtro de team para segurança
    if (!isAdminMode && currentTeam) {
      query = query.eq('team_id', currentTeam.id);
    }
    
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data;
  };

  // Restaurantes
  const getRestaurants = async () => {
    let query = supabase.from('restaurants').select('*');
    
    // Aplicar filtro de team automaticamente
    query = addTeamFilter(query);
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  };

  const createRestaurant = async (restaurant: any) => {
    const restaurantData = {
      ...restaurant,
      team_id: isAdminMode ? restaurant.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('restaurants')
      .insert(restaurantData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  // Mesas
  const getTables = async (restaurant_id?: string) => {
    const baseQuery = supabase.from('tables').select('*');
    const teamQuery = addTeamFilter(baseQuery);
    
    const finalQuery = restaurant_id 
      ? teamQuery.eq('restaurant_id', Number(restaurant_id))
      : teamQuery;
    
    const { data, error } = await finalQuery;
    if (error) throw error;
    return data;
  };

  const createTable = async (table: any) => {
    const tableData = {
      ...table,
      team_id: isAdminMode ? table.team_id : currentTeam?.id
    };
    
    const { data, error } = await supabase
      .from('tables')
      .insert(tableData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  };

  // Teams (apenas para admin)
  const getTeams = async () => {
    if (!isAdminMode) {
      throw new Error('Acesso negado: apenas admins podem listar teams');
    }
    // Evita erro de UUID quando a página carrega antes do hook configurar o RLS
    await ensureRlsAdmin();

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  };

  // Função para criar um novo team (restaurante)
  const createTeam = async (teamData: any) => {
    try {
      // Verificar se há uma sessão ativa
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Nenhuma sessão ativa encontrada. Faça login novamente.');
      }
      
      // Verificar se está no domínio principal (apenas o domínio principal pode criar teams)
      const hostname = window.location.hostname;
      const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
      
      if (!isMainDomain) {
        throw new Error('Acesso negado: criação de clientes disponível apenas no domínio principal');
      }
      
      if (!isAdminMode) {
        throw new Error('Acesso negado: apenas usuários admin podem criar clientes');
      }
      
      // Garantir RLS admin para leitura e criação
      await ensureRlsAdmin();

      // Verificar se o slug já existe (com RLS admin ativo)
      const normalizedSlug = normalizeSlug(teamData.slug);
      const { data: existingTeam, error: checkError } = await supabase
        .from('teams')
        .select('id, slug')
        .eq('slug', normalizedSlug)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existingTeam) {
        throw new Error(`Slug '${normalizedSlug}' já está em uso. Escolha outro slug.`);
      }
      
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'create_team_as_admin' as never,
        {
          team_name: teamData.name,
          team_slug: normalizedSlug,
          team_description: teamData.description || null
        } as never
      );

      if (rpcError) {
        throw rpcError;
      }

      // Provisionar subdomínio no Cloudflare via Edge Function (best-effort)
      try {
        const provisionRes = await supabase.functions.invoke('provision-domain' as never, {
          body: { slug: normalizedSlug } as never
        });
        if (provisionRes.error) {
          console.warn('Falha ao provisionar subdomínio (Cloudflare):', provisionRes.error);
        } else {
          console.log('Provisionamento Cloudflare:', provisionRes.data);
        }
      } catch (e) {
        console.warn('Erro ao chamar função de provisionamento Cloudflare:', e);
      }

      return rpcResult;
    } catch (error: any) {
      console.error('Erro ao criar restaurante:', error);
      throw error;
    }
  };

  const updateTeam = async (id: string, updates: any) => {
    // Verificar se há uma sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Nenhuma sessão ativa encontrada. Faça login novamente.');
    }
    
    // Verificar se está no domínio principal (apenas o domínio principal pode atualizar teams)
    const hostname = window.location.hostname;
    const isMainDomain = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
    
    if (!isMainDomain) {
      throw new Error('Acesso negado: atualização de clientes disponível apenas no domínio principal');
    }
    
    if (!isAdminMode) {
      throw new Error('Acesso negado: apenas usuários admin podem atualizar clientes');
    }
    
    // Garantir RLS admin
    await ensureRlsAdmin();

    // Filtrar somente colunas válidas da tabela teams para evitar 400 por campos desconhecidos
    const allowed: Record<string, boolean> = {
      name: true,
      slug: true,
      description: true,
      domain: true,
      settings: true,
      is_active: true,
      logo_url: true,
    };
    const filtered: any = {};
    Object.keys(updates || {}).forEach((k) => {
      if (allowed[k]) filtered[k] = updates[k];
    });
    if (typeof filtered.slug === 'string') {
      filtered.slug = normalizeSlug(filtered.slug);
    }

    // Se não há nada do team para atualizar, apenas retorne o registro atual
    if (Object.keys(filtered).length === 0) {
      const { data: current, error: fetchErr } = await supabase
        .from('teams')
        .select('*')
        .eq('id', id)
        .single();
      if (fetchErr) throw fetchErr;
      return current;
    }

    const { data, error } = await supabase
      .from('teams')
      .update(filtered)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  };

  const deleteTeam = async (id: string) => {
    // Verificar se há uma sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('Nenhuma sessão ativa encontrada. Faça login novamente.');
    }
    
    // Verificar se é admin geral (apenas eles podem deletar teams)
    const hostname = window.location.hostname;
    const isGeneralAdmin = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === 'app.delliapp.com.br';
    
    if (!isAdminMode || !isGeneralAdmin) {
      throw new Error('Acesso negado: apenas o admin geral pode deletar teams');
    }
    
    // Garantir que as configurações RLS estão aplicadas
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_user_role',
      config_value: 'general_admin'
    });
    
    await supabase.rpc('set_app_config', {
      config_name: 'app.current_team_id',
      config_value: NO_TEAM_SENTINEL
    });
    
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  };

  return {
    // Cliente Supabase direto (para casos especiais)
    supabase,
    
    // Estado do multi-tenant
    currentTeam,
    isAdminMode,
    
    // Operações de produtos
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    
    // Operações de pedidos
    getOrders,
    createOrder,
    updateOrder,
    
    // Operações de restaurantes
    getRestaurants,
    createRestaurant,
    
    // Operações de mesas
    getTables,
    createTable,
    
    // Operações de teams (admin apenas)
    getTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    
    // Utilitários
    addTeamFilter,
    ensureRls,
    getCategories,
    upsertCategory,
    getCategoriesForProduct,
    getCategoriesForCombo,
    getNonEmptyCategories,
    deleteCategoryIfUnused,
    
    // Combos
    getCombos,
    getComboById,
    createCombo,
    updateCombo,
    deleteCombo
  };
};