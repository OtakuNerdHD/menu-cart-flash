
import React from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Menu } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';

const Header = () => {
  const { totalItems, toggleCart } = useCart();

  return (
    <header className="sticky top-0 z-40 w-full bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="md:hidden mr-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col gap-4 mt-8">
                  <a href="#" className="text-lg font-medium hover:text-menu-primary">Home</a>
                  <a href="#" className="text-lg font-medium hover:text-menu-primary">Cardápio</a>
                  <a href="#" className="text-lg font-medium hover:text-menu-primary">Promoções</a>
                  <a href="#" className="text-lg font-medium hover:text-menu-primary">Contato</a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
          <a href="#" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-menu-primary">Cardápio<span className="text-menu-accent">Digital</span></h1>
          </a>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#" className="text-gray-800 hover:text-menu-primary font-medium">Home</a>
          <a href="#" className="text-gray-800 hover:text-menu-primary font-medium">Cardápio</a>
          <a href="#" className="text-gray-800 hover:text-menu-primary font-medium">Promoções</a>
          <a href="#" className="text-gray-800 hover:text-menu-primary font-medium">Contato</a>
        </nav>
        
        <Button 
          onClick={toggleCart}
          variant="ghost" 
          className="relative p-2"
          aria-label="Shopping cart"
        >
          <ShoppingCart className="h-6 w-6" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-menu-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
};

export default Header;
