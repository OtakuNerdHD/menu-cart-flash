import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, ImageIcon, Star } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { categories } from '@/data/menuItems';
import { Product } from '@/types/supabase';
import ImageUpload from '@/components/ImageUpload';
import MultipleImageUpload from '@/components/MultipleImageUpload';

const ProductManagement = () => {
  const { getProducts, createProduct, updateProduct, deleteProduct, isAdminMode } = useSupabaseWithMultiTenant();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    featured: false,
    ingredients: '',
    note_hint: '',
    image_url: '',
    images: [] as string[],
    gallery: [] as string[],
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const productData: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        price: formData.price,
        category: formData.category,
        available: formData.available,
        featured: formData.featured,
        ingredients: formData.ingredients,
        note_hint: formData.note_hint,
        image_url: formData.image_url,
        images: formData.images,
        gallery: formData.gallery,
        nutritional_info: formData.nutritional_info
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

      setIsDialogOpen(false);
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
    setIsDialogOpen(true);
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
    setIsDialogOpen(true);
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

  const handleImageUpload = (url: string) => {
    setFormData(prev => ({ ...prev, image_url: url }));
  };

  const handleMultipleImagesUpload = (urls: string[]) => {
    setFormData(prev => ({ ...prev, images: urls }));
  };

  const handleGalleryUpload = (urls: string[]) => {
    setFormData(prev => ({ ...prev, gallery: urls }));
  };

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Gerenciamento de Produtos</h1>
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
                  : 'Preencha as informações para criar um novo produto.'
                }
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Produto</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nome do produto"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descrição do produto"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter(cat => cat.id !== 'todos').map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="available"
                    checked={formData.available}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, available: checked }))}
                  />
                  <Label htmlFor="available">Produto disponível</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, featured: checked }))}
                  />
                  <Label htmlFor="featured">Produto em destaque</Label>
                </div>
              </div>

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting 
                    ? (editingProduct ? 'Atualizando...' : 'Criando...')
                    : (editingProduct ? 'Atualizar Produto' : 'Criar Produto')
                  }
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card key={product.id} className="overflow-hidden">
            <div className="aspect-video relative bg-gray-100">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-12 w-12 text-gray-400" />
                </div>
              )}
              {product.featured && (
                <div className="absolute top-2 right-2">
                  <Badge variant="secondary" className="bg-yellow-500 text-white">
                    <Star className="h-3 w-3 mr-1" />
                    Destaque
                  </Badge>
                </div>
              )}
              {!product.available && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <Badge variant="destructive">Indisponível</Badge>
                </div>
              )}
            </div>
            
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <Badge variant={product.available ? "default" : "secondary"}>
                  {product.available ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
              <CardDescription>
                R$ {product.price.toFixed(2)}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {product.description || 'Sem descrição'}
              </p>
              
              <div className="flex justify-between items-center">
                <Badge variant="outline">{product.category}</Badge>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => openEditDialog(product)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive">
                        <Trash2 className="h-4 w-4" />
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
            </CardContent>
          </Card>
        ))}
      </div>
      
      {products.length === 0 && (
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
