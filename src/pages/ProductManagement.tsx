
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Image, Star, Search } from 'lucide-react';
import { useUserSwitcher } from '@/context/UserSwitcherContext';
import { toast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { menuItems } from '@/data/menuItems';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';

interface ProductFormState {
  name: string;
  price: string;
  description: string;
  category: string;
  available: boolean;
  featured: boolean;
  images: string[];
  ingredients: string;
}

const ProductManagement = () => {
  const navigate = useNavigate();
  const { currentUser } = useUserSwitcher();
  const [products, setProducts] = useState([...menuItems]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddEditDialog, setShowAddEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<any>(null);
  const [formState, setFormState] = useState<ProductFormState>({
    name: '',
    price: '',
    description: '',
    category: 'pratos_principais',
    available: true,
    featured: false,
    images: [''],
    ingredients: ''
  });
  
  // Verifica se o usuário tem permissão
  const isAdminOrOwner = ['admin', 'restaurant_owner'].includes(currentUser?.role || '');

  if (!isAdminOrOwner) {
    return (
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="container mx-auto px-4 py-8">
          <Card className="w-full max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Acesso restrito</CardTitle>
              <CardDescription>
                Você não tem permissão para acessar esta página
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">
                Esta página é destinada apenas para administradores e proprietários.
              </p>
              <Button className="mt-4" onClick={() => navigate('/')}>
                Voltar para o início
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  const resetForm = () => {
    setFormState({
      name: '',
      price: '',
      description: '',
      category: 'pratos_principais',
      available: true,
      featured: false,
      images: [''],
      ingredients: ''
    });
  };
  
  const handleAddProduct = () => {
    resetForm();
    setCurrentProduct(null);
    setShowAddEditDialog(true);
  };
  
  const handleEditProduct = (product: any) => {
    setCurrentProduct(product);
    setFormState({
      name: product.name,
      price: product.price.toString(),
      description: product.description,
      category: product.category || 'pratos_principais',
      available: product.available !== false, // Default to true if undefined
      featured: product.featured || false,
      images: product.image_url ? [product.image_url] : [''],
      ingredients: (product.nutritional_info?.ingredients || []).join(', ')
    });
    setShowAddEditDialog(true);
  };
  
  const handleDeleteProduct = (product: any) => {
    setCurrentProduct(product);
    setShowDeleteDialog(true);
  };
  
  const confirmDelete = () => {
    if (!currentProduct) return;
    
    setProducts(products.filter(p => p.id !== currentProduct.id));
    toast({
      title: "Produto excluído",
      description: `${currentProduct.name} foi removido com sucesso`,
    });
    setShowDeleteDialog(false);
    setCurrentProduct(null);
  };
  
  const handleSubmitProduct = () => {
    // Validação básica
    if (!formState.name || !formState.price || !formState.description) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    // Converte preço para número
    const price = parseFloat(formState.price.replace(',', '.'));
    if (isNaN(price)) {
      toast({
        title: "Preço inválido",
        description: "Por favor, insira um valor válido para o preço.",
        variant: "destructive"
      });
      return;
    }
    
    // Prepara o objeto produto
    const productData = {
      id: currentProduct ? currentProduct.id : Date.now(),
      name: formState.name,
      description: formState.description,
      price: price,
      category: formState.category,
      available: formState.available,
      featured: formState.featured,
      image_url: formState.images[0] || '/placeholder.svg',
      nutritional_info: {
        ingredients: formState.ingredients.split(',').map(i => i.trim()).filter(Boolean)
      }
    };
    
    if (currentProduct) {
      // Atualiza produto existente
      setProducts(products.map(p => p.id === currentProduct.id ? productData : p));
      toast({
        title: "Produto atualizado",
        description: `${formState.name} foi atualizado com sucesso`,
      });
    } else {
      // Adiciona novo produto
      setProducts([...products, productData]);
      toast({
        title: "Produto adicionado",
        description: `${formState.name} foi adicionado com sucesso`,
      });
    }
    
    setShowAddEditDialog(false);
    resetForm();
    setCurrentProduct(null);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormState(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleImageChange = (index: number, url: string) => {
    const newImages = [...formState.images];
    newImages[index] = url;
    setFormState(prev => ({ ...prev, images: newImages }));
  };
  
  const addImageField = () => {
    if (formState.images.length < 5) {
      setFormState(prev => ({ ...prev, images: [...prev.images, ''] }));
    }
  };
  
  // Filtra produtos pela pesquisa
  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Agrupa produtos por categoria
  const categories = [
    { id: 'todos', name: 'Todos' },
    { id: 'pratos_principais', name: 'Pratos Principais' },
    { id: 'bebidas', name: 'Bebidas' },
    { id: 'sobremesas', name: 'Sobremesas' },
    { id: 'entradas', name: 'Entradas' },
    { id: 'acompanhamentos', name: 'Acompanhamentos' }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Gerenciamento de Produtos</h1>
            <p className="text-gray-600">Gerencie o cardápio do restaurante</p>
          </div>
          <Button 
            onClick={handleAddProduct}
            className="mt-4 md:mt-0 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Adicionar Produto
          </Button>
        </div>
        
        {/* Filtros e pesquisa */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Pesquisar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        
        {/* Lista de produtos por categoria */}
        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="mb-4 flex w-full overflow-x-auto">
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id} className="flex-shrink-0">
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {categories.map(category => (
            <TabsContent key={category.id} value={category.id} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts
                  .filter(product => category.id === 'todos' || product.category === category.id)
                  .map(product => (
                    <Card key={product.id} className="overflow-hidden">
                      <div className="aspect-video relative">
                        <img 
                          src={product.image_url || "/placeholder.svg"} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 right-2 flex gap-1">
                          {product.featured && (
                            <Badge className="bg-yellow-500">Destaque</Badge>
                          )}
                          {product.available === false && (
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                              Indisponível
                            </Badge>
                          )}
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex justify-between items-center">
                          {product.name}
                          <span className="text-base font-normal">
                            R$ {product.price.toFixed(2)}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {product.nutritional_info?.ingredients?.length > 0 ? (
                            <span className="text-xs text-gray-500">
                              Ingredientes: {product.nutritional_info.ingredients.join(', ')}
                            </span>
                          ) : null}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-gray-600 text-sm line-clamp-2">{product.description}</p>
                      </CardContent>
                      <CardContent className="pt-0 flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditProduct(product)}
                        >
                          <Edit className="h-4 w-4 mr-2" /> Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteProduct(product)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Excluir
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
              
              {filteredProducts.filter(product => category.id === 'todos' || product.category === category.id).length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhum produto encontrado nesta categoria.</p>
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
      
      {/* Modal para adicionar/editar produto */}
      <Dialog open={showAddEditDialog} onOpenChange={setShowAddEditDialog}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {currentProduct ? 'Editar Produto' : 'Adicionar Novo Produto'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">Nome do Produto*</Label>
                <Input
                  id="name"
                  name="name"
                  value={formState.name}
                  onChange={handleInputChange}
                  placeholder="Ex: X-Burguer Especial"
                />
              </div>
              
              <div>
                <Label htmlFor="price">Preço*</Label>
                <Input
                  id="price"
                  name="price"
                  type="text"
                  inputMode="decimal"
                  value={formState.price}
                  onChange={handleInputChange}
                  placeholder="Ex: 29,90"
                />
              </div>
              
              <div>
                <Label htmlFor="category">Categoria*</Label>
                <select
                  id="category"
                  name="category"
                  value={formState.category}
                  onChange={handleInputChange}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="pratos_principais">Pratos Principais</option>
                  <option value="bebidas">Bebidas</option>
                  <option value="sobremesas">Sobremesas</option>
                  <option value="entradas">Entradas</option>
                  <option value="acompanhamentos">Acompanhamentos</option>
                </select>
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="description">Descrição do Produto*</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o produto detalhadamente..."
                  rows={3}
                />
              </div>
              
              <div className="col-span-2">
                <Label htmlFor="ingredients">Ingredientes (separados por vírgula)</Label>
                <Textarea
                  id="ingredients"
                  name="ingredients"
                  value={formState.ingredients}
                  onChange={handleInputChange}
                  placeholder="Ex: Pão, carne, queijo, alface, tomate"
                  rows={2}
                />
              </div>
              
              <div className="col-span-2">
                <Label className="mb-2 block">Imagens do Produto (até 5 imagens)</Label>
                <p className="text-sm text-gray-500 mb-4">
                  A primeira imagem será usada como thumbnail no cardápio.
                </p>
                
                {formState.images.map((img, index) => (
                  <div key={index} className="flex items-center gap-2 mb-2">
                    <Input
                      placeholder={`URL da imagem ${index + 1}${index === 0 ? ' (thumbnail)' : ''}`}
                      value={img}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                    />
                    <div className="w-10 h-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      {img ? (
                        <img 
                          src={img} 
                          alt={`Prévia ${index + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200">
                          <Image className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {formState.images.length < 5 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addImageField}
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Adicionar mais imagens
                  </Button>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="available" 
                  checked={formState.available}
                  onCheckedChange={(checked) => handleSwitchChange('available', checked)}
                />
                <Label htmlFor="available">Produto Disponível</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch 
                  id="featured" 
                  checked={formState.featured}
                  onCheckedChange={(checked) => handleSwitchChange('featured', checked)}
                />
                <Label htmlFor="featured">Destaque no Cardápio</Label>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitProduct}>
              {currentProduct ? 'Salvar Alterações' : 'Adicionar Produto'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Modal de confirmação para exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
          </DialogHeader>
          <p>
            Tem certeza que deseja excluir o produto "{currentProduct?.name}"? Esta ação não pode ser desfeita.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductManagement;
