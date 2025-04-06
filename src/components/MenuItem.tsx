
import React from 'react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { PlusCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { type MenuItem as MenuItemType } from '@/data/menuItems';
import { Badge } from '@/components/ui/badge';

interface MenuItemProps {
  item: MenuItemType;
}

const MenuItem: React.FC<MenuItemProps> = ({ item }) => {
  const { addToCart } = useCart();
  const { name, description, price, imageUrl, featured } = item;

  return (
    <Card className={`menu-card overflow-hidden h-full flex flex-col ${featured ? 'border-menu-accent border-2' : ''}`}>
      <div className="relative h-48 overflow-hidden">
        <img 
          src={imageUrl} 
          alt={name} 
          className="w-full h-full object-cover"
        />
        {featured && (
          <Badge className="absolute top-2 right-2 bg-menu-accent text-black font-medium">
            Oferta do dia
          </Badge>
        )}
      </div>
      
      <CardContent className="flex-grow pt-4">
        <h3 className="text-xl font-bold mb-1 text-menu-secondary">{name}</h3>
        <p className="text-gray-600 text-sm line-clamp-2">{description}</p>
      </CardContent>
      
      <CardFooter className="flex justify-between items-center pt-2 pb-4">
        <span className="text-lg font-bold">
          R$ {price.toFixed(2)}
        </span>
        <Button 
          onClick={() => addToCart(item)}
          className="bg-menu-primary hover:bg-menu-primary/90"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
        </Button>
      </CardFooter>
    </Card>
  );
};

export default MenuItem;
