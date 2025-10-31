
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InfoIcon } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/supabase';
import { useNavigate } from 'react-router-dom';
import { getMediaUrl } from '@/lib/media';

interface MenuItemProps {
  item: Product;
}

const MenuItem = ({ item }: MenuItemProps) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
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
  };
  
  const handleOpenDetails = () => {
    navigate(`/products/${item.id}`);
  };

  return (
    <>
      <Card className="overflow-hidden">
        {/* Mobile layout */}
        <div className="md:hidden">
          <div className="flex items-start gap-3 p-3">
            <div className="relative h-[86px] w-[92px] flex-shrink-0 overflow-hidden rounded-xl border border-gray-100">
              <img
                src={getMediaUrl(item.image_url || '/placeholder.svg')}
                alt={item.name}
                className="h-full w-full object-cover"
              />
              {item.featured && (
                <span className="absolute top-1 right-1 rounded-full bg-yellow-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Destaque
                </span>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <span className="whitespace-nowrap text-sm font-semibold text-menu-primary">
                  R$ {item.price.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenDetails}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  <InfoIcon className="mr-1 h-3.5 w-3.5" /> Detalhes
                </Button>
                <Button
                  onClick={handleAddToCart}
                  size="sm"
                  className="h-8 rounded-full px-3 text-xs"
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop / tablet layout preserved */}
        <div className="hidden md:block">
          <div className="aspect-video relative">
            <img
              src={getMediaUrl(item.image_url || '/placeholder.svg')}
              alt={item.name}
              className="h-full w-full object-cover"
            />
            {item.featured && (
              <span className="absolute top-2 right-2 rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-semibold text-white">
                Destaque
              </span>
            )}
          </div>
          <CardHeader className="px-4 pb-1 pt-3">
            <CardTitle className="text-base">{item.name}</CardTitle>
            <CardDescription className="text-sm">R$ {item.price.toFixed(2)}</CardDescription>
          </CardHeader>
          <CardContent className="px-4 pb-1 pt-0">
            <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
          </CardContent>
          <CardFooter className="flex justify-between px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenDetails}
              className="flex items-center gap-2"
            >
              <InfoIcon className="h-4 w-4" /> Detalhes
            </Button>
            <Button onClick={handleAddToCart} size="sm">
              Adicionar
            </Button>
          </CardFooter>
        </div>
      </Card>

    </>
  );
};

export default MenuItem;
