
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
  
  const handleAddToCart = () => {
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      imageUrl: item.image_url,
      image: item.image_url, // Para compatibilidade
      description: item.description,
      category: item.category
    });
    
    toast({
      title: "Item adicionado ao carrinho",
      description: `${item.name} foi adicionado ao seu pedido`,
    });
  };
  
  const handleOpenDetails = () => {
    setShowDetails(true);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div className="aspect-video relative">
          <img 
            src={item.image_url || "/placeholder.svg"} 
            alt={item.name}
            className="w-full h-full object-cover"
          />
          {item.featured && (
            <span className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              Destaque
            </span>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{item.name}</CardTitle>
          <CardDescription>R$ {item.price.toFixed(2)}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-sm line-clamp-2">{item.description}</p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleOpenDetails}
            className="flex items-center gap-1"
          >
            <InfoIcon className="h-3 w-3" /> Detalhes
          </Button>
          <Button 
            onClick={handleAddToCart}
            size="sm"
            className="text-sm px-3 py-1 h-8"
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
