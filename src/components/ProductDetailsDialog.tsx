
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, MinusCircle, MessageSquarePlus } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { toast } from '@/hooks/use-toast';
import { Product } from '@/types/supabase';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';

interface ProductDetailsDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Lista fictícia de imagens para o carrossel
const getProductImages = (product: Product) => {
  // Aqui você poderia buscar as imagens do produto do banco de dados
  // Por enquanto, vamos usar a imagem principal e placeholders
  const mainImage = product.image_url || '/placeholder.svg';
  
  return [
    mainImage,
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg',
    '/placeholder.svg'
  ];
};

const ProductDetailsDialog: React.FC<ProductDetailsDialogProps> = ({ product, open, onOpenChange }) => {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [showNotesField, setShowNotesField] = useState(false);
  const { addToCart } = useCart();

  if (!product) return null;

  const handleIncreaseQuantity = () => setQuantity(prev => prev + 1);
  const handleDecreaseQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);
  
  const handleAddToCart = () => {
    addToCart({
      id: product.id,
      name: product.name, 
      price: product.price,
      image: product.image_url,
      quantity,
      notes: notes.trim() || undefined
    });
    
    toast({
      title: "Item adicionado ao carrinho",
      description: `${quantity}x ${product.name} foi adicionado ao seu pedido`,
    });
    
    onOpenChange(false);
    setNotes('');
    setQuantity(1);
    setShowNotesField(false);
  };
  
  const toggleNotesField = () => {
    setShowNotesField(prev => !prev);
    if (showNotesField) {
      setNotes('');
    }
  };
  
  const images = getProductImages(product);
  const ingredients = product.nutritional_info?.ingredients || ['Sem informações de ingredientes'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
          <DialogDescription className="text-base font-medium text-gray-700">
            R$ {product.price.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        {/* Carrossel de imagens */}
        <div className="relative w-full mb-3">
          <Carousel className="w-full">
            <CarouselContent>
              {images.map((image, index) => (
                <CarouselItem key={index} className="flex justify-center">
                  <img 
                    src={image} 
                    alt={`${product.name} - imagem ${index + 1}`}
                    className="object-cover rounded-md max-h-[250px] w-auto mx-auto"
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="h-8 w-8" />
            <CarouselNext className="h-8 w-8" />
          </Carousel>
        </div>
        
        {/* Descrição do produto */}
        <div className="mb-3">
          <h3 className="font-medium text-lg mb-1">Descrição</h3>
          <p className="text-gray-700 text-sm">{product.description}</p>
        </div>
        
        {/* Ingredientes */}
        <div className="mb-3">
          <h3 className="font-medium text-lg mb-1">Ingredientes</h3>
          <ul className="list-disc pl-5">
            {ingredients.map((ingredient, index) => (
              <li key={index} className="text-gray-700 text-sm">{ingredient}</li>
            ))}
          </ul>
        </div>
        
        {/* Botão para mostrar/ocultar campo de observações */}
        <div className="mb-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleNotesField}
            className="flex items-center gap-1 text-sm"
          >
            <MessageSquarePlus className="h-4 w-4" />
            {showNotesField ? "Remover observações" : "Adicionar observações"}
          </Button>
          
          {/* Campo de observações (aparece apenas se showNotesField for true) */}
          {showNotesField && (
            <div className="mt-2">
              <Textarea 
                placeholder="Alguma observação? Ex: sem cebola, sem molho, etc."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-sm"
                rows={3}
              />
            </div>
          )}
        </div>
        
        {/* Quantidade e botão de adicionar */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleDecreaseQuantity}
              disabled={quantity <= 1}
              className="h-8 w-8"
            >
              <MinusCircle className="h-4 w-4" />
            </Button>
            <span className="text-lg font-medium">{quantity}</span>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleIncreaseQuantity}
              className="h-8 w-8"
            >
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <Button onClick={handleAddToCart} className="px-4 py-1 h-9 text-sm">
            Adicionar • R$ {(product.price * quantity).toFixed(2)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailsDialog;
