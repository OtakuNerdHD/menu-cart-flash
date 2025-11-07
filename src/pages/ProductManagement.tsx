import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ImageIcon, Star, CopyIcon } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { Product } from '@/types/supabase';
import ProductForm, { ProductFormData } from '@/components/product/ProductForm';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigate } from 'react-router-dom';
import ComboForm, { ComboFormData } from '@/components/combo/ComboForm';
import { getMediaUrl } from '@/lib/media';
import { useTenantRoleGuard } from '@/hooks/useTenantRoleGuard';

const ProductManagement = () => {
  const allowed = useTenantRoleGuard(['dono','admin','cozinha','garcom']);
  if (!allowed) return null;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { 
    getProducts, createProduct, updateProduct, deleteProduct, isAdminMode,
    getCombos: supaGetCombos,
    createCombo: supaCreateCombo,
    updateCombo: supaUpdateCombo,
    deleteCombo: supaDeleteCombo,
    supabase,
    addTeamFilter
  } = useSupabaseWithMultiTenant();
  const [combos, setCombos] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'combos'>('products');
  const [comboDialogOpen, setComboDialogOpen] = useState(false);
  const [editingComboId, setEditingComboId] = useState<string | null>(null);
  const [comboSubmitLoading, setComboSubmitLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    featured: false,
    ingredients: '',
    note_hint: '',
    image_url: '',
    images: [],
    gallery: [],
    nutritional_info: {}
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      console.log('Buscando produtos...');
      const data = await getProducts();
      console.log('Dados recebidos do Supabase:', data);
      
      if (data && data.length > 0) {
        // Mapear dados do Supabase para o tipo Product com todos os campos necessários
        const productsWithAllFields = data.map((product: any): Product => ({
          id: product.id,
          name: product.name || '',
          description: product.description || '',
          price: product.price || 0,
          category: product.category || '',
          available: product.available !== false,
          team_id: product.team_id || 'default_team_id',
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
            : (product.image_url ? [product.image_url] : ['/placeholder.svg']),
          nutritional_info: product.nutritional_info || {}
        }));
        
        setProducts(productsWithAllFields);
      }
    } catch (error) {
      console.error('Erro ao processar dados do Supabase:', error);
      setProducts([]);
      toast({
        title: "Erro ao carregar produtos",
        description: "Não foi possível carregar os produtos. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatServes = (value: any): string | null => {
    const n = parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(n) && n > 0) return `Serve até ${n} pessoa${n > 1 ? 's' : ''}`;
    return null;
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);

    try {
      const productData: Partial<Product> = {
        ...data
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id.toString(), productData);
        toast({
          title: "Produto atualizado",
          description: "O produto foi atualizado com sucesso.",
        });
      } else {
        await createProduct(productData);
        toast({
          title: "Produto criado",
          description: "O produto foi criado com sucesso.",
        });
      }

      if (!isMobile) {
        setIsDialogOpen(false);
      } else {
        navigate(-1);
      }
      setEditingProduct(null);
      resetForm();
      await fetchProducts();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast({
        title: "Erro ao salvar produto",
        description: error.message || "Não foi possível salvar o produto. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category: product.category || '',
      available: product.available,
      featured: product.featured || false,
      ingredients: product.ingredients || '',
      note_hint: product.note_hint || '',
      image_url: product.image_url || '',
      images: product.images || [],
      gallery: product.gallery || [],
      nutritional_info: product.nutritional_info || {}
    });
    if (isMobile) {
      navigate(`/products/manage/edit?id=${product.id}`);
    } else {
      setIsDialogOpen(true);
    }
  };

  const handleDelete = async (productId: number) => {
    try {
      await deleteProduct(productId.toString());
      toast({
        title: "Produto removido",
        description: "O produto foi removido com sucesso.",
      });
      await fetchProducts();
    } catch (error: any) {
      console.error('Erro ao deletar produto:', error);
      toast({
        title: "Erro ao remover produto",
        description: error.message || "Não foi possível remover o produto. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    resetForm();
    if (isMobile) {
      navigate('/products/manage/new');
    } else {
      setIsDialogOpen(true);
    }
  };

  const openEditDialog = (product: Product) => {
    handleEdit(product);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: '',
      available: true,
      featured: false,
      ingredients: '',
      note_hint: '',
      image_url: '',
      images: [],
      gallery: [],
      nutritional_info: {}
    });
  };

  const emptyComboForm: ComboFormData = {
    title: '',
    description: '',
    priceLabel: '',
    serves: '',
    category: '',
    items: [],
    perks: [],
    images: [],
    comboType: 'custom',
    productIds: [],
    savings: '',
    highlight_homepage: false,
    highlight_combos: false,
    highlight_full: false,
  };

  const [comboFormData, setComboFormData] = useState<ComboFormData>(emptyComboForm);

  const mapDbComboToForm = async (dbCombo: any): Promise<ComboFormData> => {
    const base: ComboFormData = {
      title: dbCombo.title || '',
      description: dbCombo.description || '',
      priceLabel: dbCombo.price_label || '',
      serves: dbCombo.serves || '',
      category: dbCombo.category || '',
      items: [],
      perks: Array.isArray(dbCombo.perks) ? dbCombo.perks : [],
      images: Array.isArray(dbCombo.images) ? dbCombo.images : [],
      comboType: (dbCombo.combo_type === 'existing' ? 'existing' : 'custom'),
      productIds: [],
      savings: dbCombo.savings || '',
      highlight_homepage: !!dbCombo.highlight_homepage,
      highlight_combos: !!dbCombo.highlight_combos,
      highlight_full: !!dbCombo.highlight_full,
    };
    if (base.comboType === 'existing') {
      let q1 = supabase
        .from('combo_products')
        .select('product_id, position')
        .eq('combo_id', dbCombo.id)
        .order('position', { ascending: true });
      q1 = addTeamFilter(q1);
      const { data } = await q1 as any;
      base.productIds = (data || []).map((r: any) => String(r.product_id));
      base.items = [];
    } else {
      let q2 = supabase
        .from('combo_items_custom')
        .select('description, position')
        .eq('combo_id', dbCombo.id)
        .order('position', { ascending: true });
      q2 = addTeamFilter(q2);
      const { data } = await q2 as any;
      base.items = (data || []).map((r: any) => r.description);
      base.productIds = [];
    }
    return base;
  };

  const resetComboForm = () => {
    setEditingComboId(null);
    setComboFormData(emptyComboForm);
  };

  const openComboModal = async (combo?: any) => {
    if (combo) {
      setEditingComboId(String(combo.id));
      const form = await mapDbComboToForm(combo);
      setComboFormData(form);
    } else {
      resetComboForm();
    }
    setComboDialogOpen(true);
  };

  const openComboCreate = () => {
    if (isMobile) {
      navigate('/combos/manage/new');
    } else {
      openComboModal();
    }
  };

  const openComboEdit = async (combo: any) => {
    if (isMobile) {
      navigate(`/combos/manage/edit?id=${combo.id}`);
    } else {
      await openComboModal(combo);
    }
  };

  const handleComboSubmit = async (data: ComboFormData) => {
    setComboSubmitLoading(true);
    try {
      if (editingComboId) {
        await supaUpdateCombo(Number(editingComboId), data);
        toast({ title: 'Combo atualizado', description: 'Atualizamos o combo com sucesso.' });
      } else {
        await supaCreateCombo(data);
        toast({ title: 'Combo criado', description: 'Novo combo adicionado com sucesso.' });
      }
      setComboDialogOpen(false);
      resetComboForm();
      const list = await supaGetCombos();
      setCombos(Array.isArray(list) ? list : []);
    } finally {
      setComboSubmitLoading(false);
    }
  };

  const handleComboDelete = async (id: number, title: string) => {
    await supaDeleteCombo(Number(id));
    toast({ title: 'Combo removido', description: `Removemos o combo "${title}".` });
    const list = await supaGetCombos();
    setCombos(Array.isArray(list) ? list : []);
  };

  useEffect(() => {
    const loadCombos = async () => {
      const list = await supaGetCombos();
      setCombos(Array.isArray(list) ? list : []);
    };
    loadCombos();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 pt-20">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-lg">Carregando produtos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Itens</h1>
          <p className="text-sm text-gray-500">Gerencie produtos individuais ou combos especiais.</p>
        </div>
        <div className="flex justify-center sm:justify-end w-full sm:w-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 p-1 text-sm">
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`rounded-full px-4 py-1 transition ${activeTab === 'products' ? 'bg-white text-menu-primary shadow-sm' : 'text-gray-600 hover:text-menu-primary'}`}
            >
              Produtos
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('combos')}
              className={`rounded-full px-4 py-1 transition ${activeTab === 'combos' ? 'bg-white text-menu-primary shadow-sm' : 'text-gray-600 hover:text-menu-primary'}`}
            >
              Combos
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'products' ? (
        <>
          <div className="flex justify-end mb-4">
            {!isMobile ? (
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreateDialog} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Novo Produto
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Editar Produto' : 'Criar Novo Produto'}
                    </DialogTitle>
                    <DialogDescription>
                      {editingProduct
                        ? 'Atualize as informações do produto.'
                        : 'Preencha as informações para criar um novo produto.'}
                    </DialogDescription>
                  </DialogHeader>

                  <ProductForm
                    initialData={formData}
                    mode={editingProduct ? 'edit' : 'create'}
                    product={editingProduct}
                    onSubmit={handleSubmit}
                    onCancel={() => setIsDialogOpen(false)}
                    submitting={isSubmitting}
                  />
                </DialogContent>
              </Dialog>
            ) : (
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {products.map((product) => (
              <Card
                key={product.id}
                className="overflow-hidden border border-gray-100 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start gap-3 p-4 sm:gap-4">
                  <div className="relative h-18 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-36">
                    {product.image_url ? (
                      <img
                        src={getMediaUrl(product.image_url)}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {product.featured && (
                      <Badge variant="secondary" className="absolute left-2 top-2 flex items-center gap-1 bg-yellow-500 text-white text-[10px]">
                        <Star className="h-3 w-3" /> Destaque
                      </Badge>
                    )}
                    {!product.available && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Badge variant="destructive">Indisponível</Badge>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 sm:text-lg">{product.name}</h3>
                        <Badge variant={product.available ? 'default' : 'secondary'}>
                          {product.available ? 'Disponível' : 'Indisponível'}
                        </Badge>
                      </div>
                      <div className="text-sm font-semibold text-menu-secondary sm:text-base">R$ {product.price.toFixed(2)}</div>
                      <p className="text-xs text-gray-600 line-clamp-2 sm:text-sm sm:line-clamp-3">
                        {product.description || 'Sem descrição'}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <Badge variant="outline" className="px-2 py-0.5 text-[10px] sm:text-[11px]">
                          {product.category || 'Sem categoria'}
                        </Badge>
                        {product.note_hint && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5">
                            Observação sugerida
                          </span>
                        )}
                        {product.rating ? (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Star className="h-3 w-3 fill-current" />
                            {product.rating.toFixed(1)} ({product.review_count || 0})
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:flex-col sm:items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(product)}
                        className="h-9 px-3 text-xs sm:text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Editar</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="h-9 px-3 text-xs sm:text-sm">
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 hidden sm:inline">Remover</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Produto</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover o produto "{product.name}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(product.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-end mb-4 gap-3">
            <Button
              onClick={() => {
                if (isMobile) {
                  navigate('/combos/manage/new');
                } else {
                  openComboModal();
                }
              }}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Combo
            </Button>
            {!isMobile && (
              <Dialog
                open={comboDialogOpen}
                onOpenChange={(open) => {
                  setComboDialogOpen(open);
                  if (!open) {
                    resetComboForm();
                  }
                }}
              >
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingComboId ? 'Editar Combo' : 'Criar Combo'}
                    </DialogTitle>
                    <DialogDescription>
                      Utilize este formulário para criar combos.
                    </DialogDescription>
                  </DialogHeader>

                  <ComboForm
                    initialData={comboFormData}
                    mode={editingComboId ? 'edit' : 'create'}
                    onSubmit={handleComboSubmit}
                    onCancel={() => {
                      setComboDialogOpen(false);
                      resetComboForm();
                    }}
                    submitting={comboSubmitLoading}
                    loadProducts={() => getProducts()}
                  />
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="space-y-4">
            {combos.map((combo) => (
              <Card
                key={combo.id}
                className="overflow-hidden border border-orange-100 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start gap-3 p-4 sm:gap-4">
                  <div className="relative h-18 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:h-28 sm:w-40">
                    {combo.images && combo.images.length > 0 ? (
                      <img
                        src={getMediaUrl(combo.images[0])}
                        alt={combo.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <CopyIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                    {(combo.category || combo.savings) && (
                      <Badge variant="secondary" className="absolute left-2 top-2 bg-orange-500 text-white text-[10px]">
                        {combo.category || combo.savings}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 sm:text-lg">{combo.title}</h3>
                        <span className="text-xs font-semibold text-menu-secondary sm:text-sm">
                          {combo.price_label || 'Preço não definido'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 sm:text-sm">{combo.description || 'Sem descrição'}</p>
                      {combo.category && (
                        <div className="inline-flex items-center gap-1 text-[10px] text-gray-500">
                          <Badge variant="outline" className="text-[10px]">
                            {combo.category}
                          </Badge>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                        <Badge variant="outline" className="px-2 py-0.5 text-[10px] sm:text-[11px]">
                          {formatServes(combo.serves) || 'Serve não informado'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex gap-2 sm:flex-col sm:items-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openComboEdit(combo)}
                        className="h-9 px-3 text-xs sm:text-sm"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="ml-2 hidden sm:inline">Editar</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="destructive" className="h-9 px-3 text-xs sm:text-sm">
                            <Trash2 className="h-4 w-4" />
                            <span className="ml-2 hidden sm:inline">Remover</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover Combo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação removerá o combo "{combo.title}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleComboDelete(combo.id, combo.title)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
      
      {activeTab === 'products' && products.length === 0 && (
        <div className="text-center py-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Nenhum produto encontrado
          </h3>
          <p className="text-gray-500 mb-4">
            Comece criando seu primeiro produto.
          </p>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Criar Primeiro Produto
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;
