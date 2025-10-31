import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseWithMultiTenant } from "@/hooks/useSupabaseWithMultiTenant";
import { getMediaUrl } from "@/lib/media";
import CategoryFilter from "@/components/CategoryFilter";
import { useCart } from "@/context/CartContext";

const Combos = () => {
  const navigate = useNavigate();
  const { getCombos, getNonEmptyCategories } = useSupabaseWithMultiTenant();
  const [highlighted, setHighlighted] = useState<any[]>([]);
  const [allCombos, setAllCombos] = useState<any[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const { addToCart } = useCart();

  const parsePrice = (label?: string | null): number => {
    if (!label) return 0;
    const s = String(label).replace(/[^0-9,\.]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const formatServes = (value: any): string | null => {
    const n = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return `Serve até ${n} pessoa${n > 1 ? 's' : ''}`;
    return null;
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const hi = await getCombos({ onlyHighlightedCombos: true });
        const all = await getCombos();
        const cats = await getNonEmptyCategories('combos');
        if (!cancelled) {
          setHighlighted(Array.isArray(hi) ? hi : []);
          setAllCombos(Array.isArray(all) ? all : []);
          setCategoryNames(Array.isArray(cats) ? cats : []);
        }
      } catch (e) {
        if (!cancelled) {
          setHighlighted([]);
          setAllCombos([]);
          setCategoryNames([]);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [getCombos, getNonEmptyCategories]);

  const filteredCombos = useMemo(() => {
    if (selectedCategory === 'todos') return allCombos;
    return allCombos.filter((c: any) => (c.category || '').toLowerCase() === selectedCategory.toLowerCase());
  }, [allCombos, selectedCategory]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <main className="container mx-auto px-4 pb-20 pt-6 sm:pb-24">
        {highlighted.length > 0 && (
          <section className="mb-6 sm:mb-8">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-menu-primary">Combos em destaque</span>
              <button
                onClick={() => navigate("/")}
                className="hidden items-center gap-1 text-xs font-semibold text-menu-primary/80 transition-colors hover:text-menu-primary sm:inline-flex"
              >
                Voltar ao cardápio
              </button>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {highlighted.map((combo: any) => (
                <div
                  key={combo.id}
                  className="min-w-[160px] max-w-[180px] flex-shrink-0 snap-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm cursor-pointer"
                  onClick={() => navigate(`/combos/${combo.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/combos/${combo.id}`);
                    }
                  }}
                >
                  <div className="h-32 w-full overflow-hidden">
                    <img
                      src={getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg')}
                      alt={combo.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-1 px-3 py-3">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{combo.title}</h3>
                    {combo.description && (
                      <p className="text-xs text-gray-500 line-clamp-2">{combo.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 text-xs">
                      {combo.price_label && (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                          {combo.price_label}
                        </span>
                      )}
                      {formatServes(combo.serves) && (
                        <span className="inline-flex rounded-full bg-menu-primary/10 px-2 py-0.5 font-medium text-menu-primary">
                          {formatServes(combo.serves)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="flex flex-col gap-2 mb-4">
          <h2 className="text-2xl font-bold text-menu-secondary">Todos os combos</h2>
          <p className="text-sm text-gray-500">Pré-visualização de como seus clientes verão as ofertas combinadas.</p>
        </section>

        <section className="mb-4">
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categoryNames}
          />
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredCombos.map((combo: any) => (
            <article
              key={combo.id}
              className="group flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md cursor-pointer"
              onClick={() => navigate(`/combos/${combo.id}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  navigate(`/combos/${combo.id}`);
                }
              }}
            >
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl">
                <img
                  src={getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg')}
                  alt={combo.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{combo.title}</h3>
                  {combo.description && (
                    <p className="mt-1 text-xs leading-relaxed text-gray-600 line-clamp-3">
                      {combo.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                    {formatServes(combo.serves) && (
                      <span className="rounded-full bg-menu-primary/10 px-2 py-0.5 font-medium text-menu-primary">
                        {formatServes(combo.serves)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-menu-secondary font-semibold">
                  <span>{combo.price_label || ''}</span>
                  <button
                    className="rounded-full bg-menu-primary px-3 py-1 text-white text-xs hover:bg-menu-primary/90"
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart({
                        id: combo.id,
                        name: combo.title,
                        description: combo.description,
                        price: parsePrice(combo.price_label),
                        imageUrl: getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg'),
                        quantity: 1,
                      });
                    }}
                  >
                    Adicionar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Combos;
