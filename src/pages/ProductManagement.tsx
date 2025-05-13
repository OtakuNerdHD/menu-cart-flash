import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Category, Product } from '@/types/supabase';
import MultipleImageUpload from '@/components/MultipleImageUpload';

const ProductManagement = () => {
  const queryClient = useQueryClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    category: '',
    available: true,
    featured: false,
    ingredients: '', // Campo para ingredientes
    note_hint: '',
    image_url: '',
    images: [],
  });

  // Buscar categorias
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as Category[];
    }
  });

  // Buscar produtos
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
        
      if (error) throw error;
      return data as Product[];
    }
  });

  useEffect(() => {
    if (categoriesData) {
      setCategories(categoriesData);
    }
  }, [categoriesData]);

  // Mutação para criar categoria
  const createCategoryMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name: categoryName, restaurant_id: 1 }])
        .select();
        
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewCategory('');
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message || "Ocorreu um erro ao criar a categoria",
        variant: "destructive",
      });
    }
  });

  // Mutação para criar/atualizar produto
  const productMutation = useMutation({
    mutationFn: async (product: Partial<Product>) => {
      // Se existir ID, é atualização, senão é criação
      if (product.id) {
        const { data, error } = await supabase
          .from('products')
          .update(product)
          .eq('id', product.id)
          .select();
          
        if (error) throw error;
        return data[0];
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert([{ ...product, restaurant_id: 1 }])
          .select();
          
        if (error) throw error;
        return data[0];
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      toast({
        title: selectedProduct ? "Produto atualizado" : "Produto criado",
        description: selectedProduct ? "O produto foi atualizado com sucesso" : "O produto foi criado com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: selectedProduct ? "Erro ao atualizar produto" : "Erro ao criar produto",
        description: error.message || "Ocorreu um erro ao processar o produto",
        variant: "destructive",
      });
    }
  });

  // Mutação para excluir produto
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      resetForm();
      toast({
        title: "Produto excluído",
        description: "O produto foi excluído com sucesso",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir produto",
        description: error.message || "Ocorreu um erro ao excluir o produto",
        variant: "destructive",
      });
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'price') {
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Validar campos obrigatórios
    if (!formData.name || !formData.price || !formData.category) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Processar os ingredientes como string se necessário
    let processedIngredients = formData.ingredients;
    if (Array.isArray(formData.ingredients)) {
      processedIngredients = formData.ingredients.join(', ');
    }
    
    productMutation.mutate({
      ...formData,
      ingredients: processedIngredients as string,
    });
  };

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    createCategoryMutation.mutate(newCategory.trim());
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      ...product,
      // Garantir que os ingredientes sejam tratados corretamente
      ingredients: product.ingredients || 
                  (product.nutritional_info?.ingredients && Array.isArray(product.nutritional_info.ingredients) 
                    ? product.nutritional_info.ingredients.join(', ') 
                    : '')
    });
  };

  const handleImageUpload = (urls: string[]) => {
    setFormData(prev => ({ 
      ...prev, 
      image_url: urls[0] || prev.image_url, // A primeira imagem como principal
      images: urls // Todas as imagens no array
    }));
  };

  const resetForm = () => {
    setSelectedProduct(null);
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
    });
  };

  const handleDeleteProduct = () => {
    if (selectedProduct && selectedProduct.id) {
      if (window.confirm(`Tem certeza que deseja excluir o produto "${selectedProduct.name}"?`)) {
        deleteProductMutation.mutate(selectedProduct.id);
      }
    }
  };

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Gerenciar Produtos</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="products" className="space-y-4">
            <TabsList>
              <TabsTrigger value="products">Produtos</TabsTrigger>
              <TabsTrigger value="categories">Categorias</TabsTrigger>
            </TabsList>
            <TabsContent value="products" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">
                    {selectedProduct ? 'Editar Produto' : 'Novo Produto'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nome</Label>
                      <Input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="price">Preço</Label>
                      <Input
                        type="number"
                        id="price"
                        name="price"
                        value={formData.price || ''}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="ingredients">Ingredientes</Label>
                      <Textarea
                        id="ingredients"
                        name="ingredients"
                        value={formData.ingredients || ''}
                        onChange={handleInputChange}
                        placeholder="Lista de ingredientes separados por vírgula"
                      />
                    </div>
                    <div>
                      <Label htmlFor="note_hint">Observação (Dica)</Label>
                      <Input
                        type="text"
                        id="note_hint"
                        name="note_hint"
                        value={formData.note_hint || ''}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select onValueChange={(value) => handleSelectChange('category', value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Selecione uma categoria" defaultValue={formData.category || ''} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriesLoading ? (
                            <SelectItem value="" disabled>Carregando...</SelectItem>
                          ) : (
                            categories.map((category) => (
                              <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="available">Disponível</Label>
                      <Switch
                        id="available"
                        checked={formData.available || false}
                        onCheckedChange={(checked) => handleSwitchChange('available', checked)}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="featured">Destaque</Label>
                      <Switch
                        id="featured"
                        checked={formData.featured || false}
                        onCheckedChange={(checked) => handleSwitchChange('featured', checked)}
                      />
                    </div>
                    <Button type="submit" disabled={productMutation.isLoading}>
                      {productMutation.isLoading
                        ? 'Salvando...'
                        : selectedProduct
                        ? 'Atualizar Produto'
                        : 'Adicionar Produto'}
                    </Button>
                    {selectedProduct && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDeleteProduct}
                        disabled={deleteProductMutation.isLoading}
                      >
                        {deleteProductMutation.isLoading ? 'Excluindo...' : 'Excluir Produto'}
                      </Button>
                    )}
                    {selectedProduct && (
                      <Button type="button" variant="secondary" onClick={resetForm}>
                        Cancelar
                      </Button>
                    )}
                  </form>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Imagens do Produto</h3>
                  <MultipleImageUpload onUpload={handleImageUpload} />
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt={formData.name}
                      className="mt-4 rounded-md max-w-full h-auto"
                    />
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="categories" className="space-y-4">
              <h3 className="text-xl font-semibold mb-2">Gerenciar Categorias</h3>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Nova categoria"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
                <Button onClick={handleAddCategory} disabled={createCategoryMutation.isLoading}>
                  {createCategoryMutation.isLoading ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </div>
              <ul>
                {categoriesLoading ? (
                  <li>Carregando categorias...</li>
                ) : (
                  categories.map((category) => (
                    <li key={category.id} className="py-2 border-b">
                      {category.name}
                    </li>
                  ))
                )}
              </ul>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Lista de Produtos</h2>
        {productsLoading ? (
          <p>Carregando produtos...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products?.map((product) => (
              <Card key={product.id} className="cursor-pointer hover:shadow-md transition-shadow duration-300" onClick={() => handleProductSelect(product)}>
                <CardHeader>
                  <CardTitle>{product.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Categoria: {product.category}</p>
                  <p className="text-sm text-gray-500">Preço: R$ {product.price.toFixed(2)}</p>
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="mt-2 rounded-md max-w-full h-32 object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagement;
