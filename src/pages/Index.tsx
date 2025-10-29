
import React, { useState, useEffect } from 'react';
import Header from '@/components/Header';
import MenuGrid from '@/components/MenuGrid';
import CategoryFilter from '@/components/CategoryFilter';
import { Product } from '@/types/supabase';
import { menuItems as fallbackMenuItems } from '@/data/menuItems';
import { categories } from '@/data/menuItems';
import { useTeam } from '@/context/TeamContext';
import { useSupabaseWithTeam } from '@/hooks/useSupabaseWithTeam';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { useMultiTenant } from '@/context/MultiTenantContext';

const Index = () => {
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [products, setProducts] = useState<Product[]>(fallbackMenuItems);
  const [loading, setLoading] = useState(true);
  const { teamId, isLoading: teamLoading } = useTeam();
  const { teamSupabase, isReady } = useSupabaseWithTeam();
  const { loading: authLoading, isSuperAdmin, user } = useAuth();
  const { isLoading: multiTenantLoading, isAdminMode } = useMultiTenant();

  useEffect(() => {
    let cancelled = false;

    const shouldWait = authLoading || teamLoading || multiTenantLoading;

    if (shouldWait) {
      console.log('Index aguardando contextos', { authLoading, teamLoading, multiTenantLoading, user: user?.id });
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
        console.log('isReady:', isReady);
        console.log('authLoading:', authLoading);
        console.log('multiTenantLoading:', multiTenantLoading);
        console.log('isSuperAdmin:', isSuperAdmin);
        console.log('isAdminMode:', isAdminMode);
        console.log('user:', user?.id);
        
        // Se há team_id configurado, usar o teamSupabase com filtros
        if (teamId && isReady && teamSupabase) {
          console.log(`Carregando produtos para team_id: ${teamId}`);
          const data = await teamSupabase.getProducts({ available: true });

          if (!cancelled) {
            if (data && data.length > 0) {
              console.log(`${data.length} produtos encontrados:`, data);
              
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
              
              setProducts(productsWithAllFields);
              console.log(`${productsWithAllFields.length} produtos carregados do Supabase para team_id: ${teamId}`);
            } else {
              console.log(`Nenhum produto encontrado para team_id: ${teamId}, buscando produtos gerais`);
              const { data: generalData } = await supabase
                .from('products')
                .select('*')
                .eq('available', true);

              if (generalData && generalData.length > 0) {
                const productsWithAllFields = generalData.map((product: any): Product => ({
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
                
                setProducts(productsWithAllFields);
                console.log(`${generalData.length} produtos gerais carregados como fallback`);
              } else {
                console.log('Usando dados mockados como último recurso');
                setProducts(fallbackMenuItems);
              }
            }
          }
        } else {
          console.log('Carregando todos os produtos (sem filtro de team)');
          const { data } = await supabase
            .from('products')
            .select('*')
            .eq('available', true);

          if (!cancelled) {
            if (data && data.length > 0) {
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
              
              setProducts(productsWithAllFields);
              console.log(`${data.length} produtos carregados do Supabase (modo geral)`);
            } else {
              console.log('Nenhum produto encontrado no Supabase, usando dados mockados');
              setProducts(fallbackMenuItems);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Erro ao buscar produtos:', err);
          console.log('Usando dados mockados devido ao erro');
          setProducts(fallbackMenuItems);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [authLoading, teamLoading, multiTenantLoading, isReady, teamSupabase, teamId, isAdminMode, isSuperAdmin, user?.id]);

  const filteredItems = selectedCategory === 'todos'
    ? products
    : products.filter(item => item.category === selectedCategory);
  
  return (
    <div className="min-h-screen flex flex-col pt-16">
      <main className="flex-grow container mx-auto px-4 py-8">
        <section className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-menu-secondary">Cardápio Digital</h1>
          <p className="text-gray-600 max-w-2xl">
            Explore nosso delicioso menu com opções para todos os gostos. Adicione itens ao seu carrinho e faça seu pedido facilmente.
          </p>
          {teamId && (
            <div className="mt-2 text-sm text-gray-500">
              Team ID: {teamId}
            </div>
          )}
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-menu-secondary">Categorias</h2>
          <CategoryFilter 
            selectedCategory={selectedCategory} 
            onCategoryChange={setSelectedCategory} 
          />
        </section>
        
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-menu-secondary">
              {selectedCategory === 'todos' ? 'Todos os itens' : 
                selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}
            </h2>
            <span className="text-sm text-gray-500">{filteredItems.length} itens</span>
          </div>
          
          {(loading || teamLoading || authLoading || multiTenantLoading) ? (
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
