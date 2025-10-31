import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, Gift, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { getMediaUrl } from '@/lib/media';
import { useCart } from '@/context/CartContext';

const ComboDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { getComboById, supabase, ensureRls, addTeamFilter } = useSupabaseWithMultiTenant();
  const getComboByIdRef = React.useRef(getComboById);
  const supabaseRef = React.useRef(supabase);
  const ensureRlsRef = React.useRef(ensureRls);
  const addTeamFilterRef = React.useRef(addTeamFilter);
  React.useEffect(() => { getComboByIdRef.current = getComboById; }, [getComboById]);
  React.useEffect(() => { supabaseRef.current = supabase; }, [supabase]);
  React.useEffect(() => { ensureRlsRef.current = ensureRls; }, [ensureRls]);
  React.useEffect(() => { addTeamFilterRef.current = addTeamFilter; }, [addTeamFilter]);
  const [combo, setCombo] = React.useState<any | null>(null);
  const [items, setItems] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [quantity, setQuantity] = React.useState<number>(1);
  const { addToCart } = useCart();
  const parsePrice = React.useCallback((label?: string | null): number => {
    if (!label) return 0;
    const s = String(label).replace(/[^0-9,\.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  }, []);
  const formatServes = React.useCallback((value: any): string | null => {
    const n = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return `Serve até ${n} pessoa${n > 1 ? 's' : ''}`;
    return null;
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const id = Number(slug);
        if (!Number.isFinite(id)) return;
        await ensureRlsRef.current();
        const data = await getComboByIdRef.current(id);
        if (!cancelled) setCombo(data || null);
        // Buscar itens conforme o tipo do combo, reforçando filtro por tenant
        if (data?.combo_type === 'existing') {
          let q1 = supabaseRef.current
            .from('combo_products')
            .select('product_id, position')
            .eq('combo_id', id)
            .order('position', { ascending: true });
          q1 = addTeamFilterRef.current(q1);
          const { data: links, error: cpErr } = await q1 as any;
          if (cpErr) throw cpErr;
          const ids = (links || []).map((r: any) => r.product_id).filter(Boolean);
          if (ids.length > 0) {
            let q2 = supabaseRef.current
              .from('products')
              .select('id, name')
              .in('id', ids);
            q2 = addTeamFilterRef.current(q2);
            const { data: products, error: prodErr } = await q2 as any;
            if (prodErr) throw prodErr;
            const nameById = new Map((products || []).map((p: any) => [p.id, p.name]));
            const orderedNames = (links || []).map((r: any) => nameById.get(r.product_id) || `Produto #${r.product_id}`);
            if (!cancelled) setItems(orderedNames);
          } else {
            if (!cancelled) setItems([]);
          }
        } else {
          let q3 = supabaseRef.current
            .from('combo_items_custom')
            .select('description, position')
            .eq('combo_id', id)
            .order('position', { ascending: true });
          q3 = addTeamFilterRef.current(q3);
          const { data: customItems, error: ciErr } = await q3 as any;
          if (ciErr) throw ciErr;
          if (!cancelled) setItems((customItems || []).map((r: any) => r.description));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <main className="container mx-auto px-4 pb-32 pt-6">
          <div className="text-center text-gray-500">Carregando combo...</div>
        </main>
      </div>
    );
  }

  if (!combo) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <main className="container mx-auto px-4 pb-32 pt-6">
          <div className="mb-5 flex items-center gap-3 text-sm text-menu-primary">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 rounded-full border border-menu-primary/30 px-3 py-1 text-menu-primary transition-colors hover:bg-menu-primary/5"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
          <div className="text-center text-gray-500">Combo não encontrado.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <main className="container mx-auto px-4 pb-32 pt-6">
        <div className="mb-5 flex items-center gap-3 text-sm text-menu-primary">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-full border border-menu-primary/30 px-3 py-1 text-menu-primary transition-colors hover:bg-menu-primary/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="relative">
            <img
              src={getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg')}
              alt={combo.title}
              className="h-64 w-full object-cover sm:h-[360px]"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-6 text-white">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-semibold sm:text-3xl">{combo.title}</h1>
                  {combo.description && (
                    <p className="mt-1 text-sm text-white/90 max-w-xl">{combo.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {combo.price_label && (
                    <span className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-900">
                      {combo.price_label}
                    </span>
                  )}
                  <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/90 p-1 text-gray-900">
                    <button
                      className="rounded-full p-1 hover:bg-gray-200"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      type="button"
                      aria-label="Diminuir"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-medium">{quantity}</span>
                    <button
                      className="rounded-full p-1 hover:bg-gray-200"
                      onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                      type="button"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                    <Button
                      className="ml-2 bg-menu-primary hover:bg-menu-primary/90"
                      onClick={() => addToCart({
                        id: combo.id,
                        name: combo.title,
                        description: combo.description,
                        price: parsePrice(combo.price_label),
                        imageUrl: getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg'),
                        quantity,
                      })}
                      type="button"
                    >
                      Adicionar
                    </Button>
                  </div>
                  <span className="text-sm font-medium">{formatServes(combo.serves) || 'Serve não informado'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-6 px-5 py-6 sm:px-8">
            {combo.savings && (
              <div className="rounded-xl bg-emerald-100 px-3 py-2 text-xs font-medium text-emerald-800">
                {combo.savings}
              </div>
            )}

            <section>
              <h2 className="text-base font-semibold text-menu-secondary">Itens do combo</h2>
              {items.length > 0 ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {items.map((desc, idx) => (
                    <div key={`${desc}-${idx}`} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">{desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">Os itens serão exibidos aqui quando configurados.</p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-2 text-amber-600">
                <Gift className="h-4 w-4" />
                <span className="text-sm font-medium">Benefícios inclusos</span>
              </div>
              {Array.isArray(combo.perks) && combo.perks.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  {combo.perks.map((perk: string, idx: number) => (
                    <li key={`${perk}-${idx}`} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-gray-500">Nenhum benefício listado.</p>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-base font-semibold text-menu-secondary">Como funciona</h2>
              <p className="mt-2 text-sm text-gray-600">
                Esse combo é uma prévia do que seus clientes irão visualizar. Quando estiver integrado ao backend,
                será possível adicionar ao carrinho, personalizar opções e disparar webhooks de confirmação.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                <span className="rounded-full bg-white px-3 py-1">Entrega e retirada</span>
                <span className="rounded-full bg-white px-3 py-1">Personalizável</span>
              </div>
            </section>
          </div>

          <section className="sm:hidden sticky bottom-4 z-10">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3 shadow-lg">
              <div className="flex items-center gap-2 rounded-full border px-2 py-1">
                <button
                  className="rounded-full p-1 hover:bg-gray-100"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  type="button"
                  aria-label="Diminuir"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-[2ch] text-center text-sm font-medium">{quantity}</span>
                <button
                  className="rounded-full p-1 hover:bg-gray-100"
                  onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                  type="button"
                  aria-label="Aumentar"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                className="flex-1 bg-menu-primary hover:bg-menu-primary/90"
                onClick={() => addToCart({
                  id: combo.id,
                  name: combo.title,
                  description: combo.description,
                  price: parsePrice(combo.price_label),
                  imageUrl: getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg'),
                  quantity,
                })}
                type="button"
              >
                Adicionar ao carrinho
              </Button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
};

export default ComboDetail;
