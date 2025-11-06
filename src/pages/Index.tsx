
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import MenuGrid from '@/components/MenuGrid';
import CategoryFilter from '@/components/CategoryFilter';
import { Product } from '@/types/supabase';
import { menuItems as fallbackMenuItems } from '@/data/menuItems';
import { useTeam } from '@/context/TeamContext';
// import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMultiTenant } from '@/context/MultiTenantContext';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { getMediaUrl } from '@/lib/media';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { teamId, isLoading: teamLoading, isReady: teamReady } = useTeam();
  const { loading: authLoading, isSuperAdmin, user } = useAuth();
  const { isLoading: multiTenantLoading, isAdminMode } = useMultiTenant();
  const { ensureRls, supabase } = useSupabaseWithMultiTenant();
  const [highlightCombos, setHighlightCombos] = useState<any[]>([]);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Aguardar apenas carregamento de autenticação e multi-tenant
<<<<<<< HEAD
    const shouldWait = authLoading || multiTenantLoading || teamLoading || !teamReady;

    if (shouldWait) {
      console.log('Index aguardando contextos', {
        authLoading,
        multiTenantLoading,
        teamLoading,
        isAdminMode,
      });
=======
    const shouldWait = authLoading || multiTenantLoading;

    if (shouldWait) {
      console.log('Index aguardando contextos', { authLoading, multiTenantLoading });
>>>>>>> 5ce9250d93104389be3c0fc25bec59864d6849a1
      setLoading(true);
      return () => {
        cancelled = true;
      };
    }

    const fetchProducts = async () => {
      setLoading(true);
      
      try {
        console.log('Carregando produtos...');
        console.log('teamId:', teamId);
        console.log('user:', user?.id);
        console.log('isAdminMode:', isAdminMode);
        
<<<<<<< HEAD
        // Removido ensureRls(); o hook já garante RLS
        // Aguardar teamId resolvido para evitar flicker
        if (!teamId) {
          console.log('Sem teamId disponível para produtos. Aguardando resolução...');
          return;
        }

        // Consulta direta com filtro explícito de team_id e is_published
        const { data, error } = await (supabase as any)
          .from('products')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_published', true);

        if (error) throw error;

=======
        // Carregar produtos usando o hook multi-tenant que lida com visitantes
        const data = await getProductsMT();

>>>>>>> 5ce9250d93104389be3c0fc25bec59864d6849a1
        if (!cancelled) {
          if (data && data.length > 0) {
            console.log(`${data.length} produtos encontrados`);
            
<<<<<<< HEAD
            const productsWithAllFields = data.map((product: any): Product => {
              const priceNumber = Number(product.price ?? 0);
              const restaurantIdNumber = Number(product.restaurant_id ?? 0);

              return {
                id: Number(product.id),
                name: product.name || '',
                description: product.description || '',
                price: Number.isFinite(priceNumber) ? priceNumber : 0,
                category: product.category || '',
                available: product.available !== false,
                team_id: product.team_id || '',
                restaurant_id: Number.isFinite(restaurantIdNumber) ? restaurantIdNumber : 0,
                created_at: product.created_at || new Date().toISOString(),
                updated_at: product.updated_at || new Date().toISOString(),
                featured: product.featured || false,
                gallery: product.gallery || [],
                ingredients: product.ingredients || '',
                note_hint: product.note_hint || '',
                rating: product.rating || 0,
                review_count: product.review_count || 0,
                image_url: product.image_url || '',
                images: Array.isArray(product.images) && product.images.length > 0
                  ? product.images
                  : (product.image_url ? [product.image_url] : []),
                nutritional_info: product.nutritional_info || {}
              };
            });
=======
            const productsWithAllFields = data.map((product: any): Product => ({
              id: product.id,
              name: product.name || '',
              description: product.description || '',
              price: product.price || 0,
              category: product.category || '',
              available: product.available !== false,
              team_id: product.team_id || '',
              restaurant_id: product.restaurant_id || 1,
              created_at: product.created_at || new Date().toISOString(),
              updated_at: product.updated_at || new Date().toISOString(),
              featured: product.featured || false,
              gallery: product.gallery || [],
              ingredients: product.ingredients || '',
              note_hint: product.note_hint || '',
              rating: product.rating || 0,
              review_count: product.review_count || 0,
              image_url: product.image_url || '',
              images: Array.isArray(product.images) && product.images.length > 0
                ? product.images
                : (product.image_url ? [product.image_url] : []),
              nutritional_info: product.nutritional_info || {}
            }));
>>>>>>> 5ce9250d93104389be3c0fc25bec59864d6849a1
            
            setProducts(productsWithAllFields);
            console.log(`${productsWithAllFields.length} produtos carregados`);
          } else {
            console.log('Nenhum produto encontrado');
            setProducts([]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao buscar produtos:', err);
          setProducts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const fetchHighlightedCombos = async () => {
      try {
<<<<<<< HEAD
        if (!teamId) {
          console.log('Sem teamId disponível para combos.');
          if (!cancelled) setHighlightCombos([]);
          return;
        }

        let query = (supabase as any)
          .from('combos')
          .select('*')
          .eq('team_id', teamId)
          .eq('is_published', true)
          .or('highlight_full.eq.true,highlight_homepage.eq.true');

        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        if (!cancelled) setHighlightCombos(Array.isArray(data) ? data : []);
=======
        const combos = await getCombos({ onlyHighlightedHomepage: true });
        if (!cancelled) setHighlightCombos(Array.isArray(combos) ? combos : []);
>>>>>>> 5ce9250d93104389be3c0fc25bec59864d6849a1
      } catch (e) {
        console.warn('Erro ao carregar combos em destaque:', e);
        if (!cancelled) setHighlightCombos([]);
      }
    };

    const fetchCategories = async () => {
      try {
        if (!teamId) {
          if (!cancelled) setCategoryNames([]);
          return;
        }
        // Filtro explícito por team_id para categorias
        const { data: cats, error: catErr } = await (supabase as any)
          .from('categories')
          .select('name')
          .eq('team_id', teamId)
          .order('name', { ascending: true });
        if (catErr) throw catErr;
        if (!cancelled) setCategoryNames(Array.isArray(cats) ? cats.map((c: any) => c.name) : []);
      } catch {
        if (!cancelled) setCategoryNames([]);
      }
    };

    fetchProducts();
    fetchHighlightedCombos();
    fetchCategories();

    return () => {
      cancelled = true;
    };
<<<<<<< HEAD
  }, [
    authLoading,
    multiTenantLoading,
    teamId,
    user?.id,
    isAdminMode,
    teamLoading,
    teamReady,
  ]);
=======
  }, [authLoading, multiTenantLoading, user?.id, isAdminMode, getNonEmptyCategories, getProductsMT, getCombos]);
>>>>>>> 5ce9250d93104389be3c0fc25bec59864d6849a1

  const filteredItems = selectedCategory === 'todos'
    ? products
    : products.filter(item => item.category === selectedCategory);
  
  return (
    <div className="min-h-screen flex flex-col pt-16">
      <main className="flex-grow container mx-auto px-4 py-4 sm:py-7">
        {highlightCombos.length > 0 && (
          <section className="mb-5 sm:mb-8">
            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-menu-primary">Combos em destaque</span>
            </div>
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 scrollbar-hide">
              {highlightCombos.map((combo: any) => (
                <div
                  key={combo.id}
                  className="min-w-[160px] max-w-[180px] flex-shrink-0 snap-center overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform hover:-translate-y-1"
                >
                  <div className="h-32 w-full overflow-hidden">
                    <img
                      src={getMediaUrl((combo.images && combo.images[0]) || '/placeholder.svg')}
                      alt={combo.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                      {combo.title}
                    </h3>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mb-4 sm:mb-7">
          <h2 className="hidden text-2xl font-bold mb-3 text-menu-secondary sm:block">Categorias</h2>
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            categories={categoryNames}
          />
        </section>
        
        <section className="mb-8 sm:mb-12">
          <div className="flex flex-col gap-2 mb-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-menu-secondary">
                {selectedCategory === 'todos' ? 'Todos os itens' : 
                  selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
              </h2>
            </div>
            {teamId && (
              <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">Tenant: {teamId}</span>
            )}
          </div>
          
          {loading ? (
            <div className="py-10 text-center">
              <p className="text-gray-500">Carregando produtos...</p>
            </div>
          ) : (
            <MenuGrid items={filteredItems} />
          )}
        </section>
      </main>
      
      <footer className="bg-gray-100 py-8 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold text-menu-primary">Delliapp</h3>
              <p className="text-sm text-gray-600">© {new Date().getFullYear()} Todos os direitos reservados</p>
            </div>
            
            <div className="flex space-x-4">
              <a href="#" className="text-menu-primary hover:text-menu-secondary transition-colors">
                Termos de Uso
              </a>
              <a href="#" className="text-menu-primary hover:text-menu-secondary transition-colors">
                Política de Privacidade
              </a>
              <a href="#" className="text-menu-primary hover:text-menu-secondary transition-colors">
                Contato
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
