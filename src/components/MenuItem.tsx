
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/supabase';
import ProductDetailsDialog from './ProductDetailsDialog';

interface MenuItemProps {
  item: Product;
}

const MenuItem = ({ item }: MenuItemProps) => {
  const { addToCart } = useCart();
  const [showDetails, setShowDetails] = useState(false);
  
  // Função para determinar qual imagem usar como thumbnail
  const getDisplayImage = () => {
    // Ordem de prioridade: thumbnail > image_url > primeira imagem do array > placeholder
    if (item.thumbnail) {
      return item.thumbnail;
    } else if (item.image_url) {
      return item.image_url;
    } else if (item.images && item.images.length > 0) {
      return item.images[0];
    } else if (item.gallery && item.gallery.length > 0) {
      return item.gallery[0]; 
    }
    return "/placeholder.svg";
  };
  
  const handleAddToCart = () => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: getDisplayImage(),
      image: getDisplayImage(), // Para compatibilidade
      description: item.description,
      category: item.category,
      ingredients: item.ingredients // Adicionando os ingredientes ao carrinho
    });
    
    toast({
      title: "Item adicionado",
      description: `${item.name} foi adicionado ao carrinho`,
    });
  };
  
  const handleOpenDetails = () => {
    setShowDetails(true);
  };

  // Extrair uma descrição curta dos ingredientes para exibir no card
  let shortDescription = item.description || '';
  
  // Se não tiver descrição mas tiver ingredientes, usar os ingredientes como descrição
  if (!shortDescription && item.ingredients) {
    shortDescription = `Ingredientes: ${typeof item.ingredients === 'string' ? item.ingredients : ''}`;
  } else if (!shortDescription && item.nutritional_info?.ingredients) {
    // Fallback para compatibilidade
    const ingredients = Array.isArray(item.nutritional_info.ingredients) 
      ? item.nutritional_info.ingredients.join(', ') 
      : '';
    if (ingredients) {
      shortDescription = `Ingredientes: ${ingredients}`;
    }
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="aspect-video relative">
          <img 
            src={getDisplayImage()} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
          {item.featured && (
            <span className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded-full text-[10px]">
              Destaque
            </span>
          )}
        </div>
        <CardHeader className="pb-1 pt-2 px-3">
          <CardTitle className="text-sm">{item.name}</CardTitle>
          <CardDescription className="text-xs">R$ {item.price.toFixed(2)}</CardDescription>
        </CardHeader>
        <CardContent className="pb-1 pt-0 px-3">
          <p className="text-gray-600 text-xs line-clamp-1">{shortDescription}</p>
        </CardContent>
        <CardFooter className="flex justify-between px-3 py-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOpenDetails}
            className="flex items-center gap-1 h-7 px-2 text-xs"
          >
            <InfoIcon className="h-3 w-3" /> Detalhes
          </Button>
          <Button 
            onClick={handleAddToCart}
            size="sm"
            className="text-xs px-2 py-0 h-7"
          >
            Adicionar
          </Button>
        </CardFooter>
      </Card>
      
      <ProductDetailsDialog 
        product={item} 
        open={showDetails} 
        onOpenChange={setShowDetails} 
      />
    </>
  );
};

export default MenuItem;
