import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';

type MPItem = {
  title: string;
  quantity: number;
  unit_price: number;
  currency_id?: string;
};

type CreatePrefOptions = {
  payer?: any;
  back_urls?: any;
  notification_url?: string;
  external_reference?: string;
  statement_descriptor?: string;
  metadata?: any;
  redirect?: boolean;
};

export const useCheckout = () => {
  const { currentTeam } = useSupabaseWithMultiTenant();

  const getTeamSlug = () => {
    if (currentTeam?.slug) return currentTeam.slug;
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    const parts = host.split('.');
    if (parts.length > 2) return parts[0];
    return '';
  };

  const createPreference = async (items: MPItem[], opts: CreatePrefOptions = {}) => {
    const team_slug = getTeamSlug();
    if (!team_slug) throw new Error('team_slug não encontrado no contexto da instância');

    const payload = {
      team_slug,
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unit_price,
        currency_id: i.currency_id || 'BRL',
      })),
      payer: opts.payer || null,
      back_urls: opts.back_urls || null,
      notification_url: opts.notification_url || null,
      external_reference: opts.external_reference || null,
      statement_descriptor: opts.statement_descriptor || null,
      metadata: opts.metadata || null,
    } as never;

    // Debug: payload sent to function (no secrets)
    try { console.debug('[checkout] createPreference payload', payload); } catch {}
    const { data, error } = await supabase.functions.invoke('create-mercadopago-preference' as never, {
      body: payload,
    });
    if (error) {
      // Surface details from function response when available
      const message = (data as any)?.error || (data as any)?.details || error.message || 'Falha ao criar preferência';
      try { console.error('[checkout] createPreference error', { error, data }); } catch {}
      // Fallback: tentar ler resposta crua para depurar (sem Authorization; requer verify_jwt=false na função)
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/create-mercadopago-preference`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const text = await res.text();
        console.error('[checkout] raw function response', res.status, text);
      } catch {}
      throw new Error(message);
    }
    const pref = (data as any)?.preference;
    if (!pref?.init_point) throw new Error('Falha ao criar preferência');

    if (opts.redirect !== false && typeof window !== 'undefined') {
      window.location.href = pref.init_point;
      return null;
    }
    return pref;
  };

  return { createPreference };
};
