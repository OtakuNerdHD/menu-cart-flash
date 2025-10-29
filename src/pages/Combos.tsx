import { comboHighlights } from "@/data/combos";
import { useNavigate } from "react-router-dom";

const Combos = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <main className="container mx-auto px-4 pb-20 pt-6 sm:pb-24">
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
            {comboHighlights.map((combo, index) => (
              <div
                key={`${combo.title}-${index}`}
                className="min-w-[160px] max-w-[180px] flex-shrink-0 snap-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm"
              >
                <div className="h-32 w-full overflow-hidden">
                  <img
                    src={combo.image}
                    alt={combo.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-1 px-3 py-3">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">{combo.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{combo.description}</p>
                  <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700">
                    {combo.priceLabel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2 mb-4">
          <h2 className="text-2xl font-bold text-menu-secondary">Todos os combos</h2>
          <p className="text-sm text-gray-500">Pré-visualização de como seus clientes verão as ofertas combinadas.</p>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {comboHighlights.map((combo, index) => (
            <article
              key={`${combo.title}-${index}`}
              className="group flex gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl">
                <img
                  src={combo.image}
                  alt={combo.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-xs font-semibold text-gray-900">
                  {combo.priceLabel}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 line-clamp-2">{combo.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 line-clamp-3">
                    {combo.description}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span className="font-semibold uppercase tracking-[0.2em] text-menu-primary">Preview</span>
                  <button className="rounded-full bg-menu-primary px-3 py-1 text-white transition-transform hover:-translate-y-0.5">
                    Quero este combo
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
