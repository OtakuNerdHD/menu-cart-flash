import { supabase } from '@/integrations/supabase/client';
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
    } as never;

    const { data, error } = await supabase.functions.invoke('create-mercadopago-preference' as never, {
      body: payload,
    });
    if (error) throw new Error(error.message);
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
