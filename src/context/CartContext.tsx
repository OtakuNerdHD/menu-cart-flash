
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { MenuItem } from '@/types/supabase';
import { useToast } from "@/components/ui/use-toast";

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  cartOpen: boolean;
  toggleCart: () => void;
  addToCart: (item: MenuItem & { notes?: string }) => void;
  removeFromCart: (id: number, notes?: string) => void;
  updateQuantity: (id: number, quantity: number, notes?: string) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  closeCart: () => void; // Adicionando método para fechar o carrinho
  getCartTotal: () => number; // Adicionando método para calcular total do carrinho
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const { toast } = useToast();

  // Verificar se há itens no carrinho salvos no localStorage
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        if (Array.isArray(parsedCart)) {
          setCartItems(parsedCart);
        }
      } catch (error) {
        console.error('Erro ao carregar carrinho do localStorage:', error);
      }
    }
  }, []);

  // Salvar carrinho no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  const toggleCart = () => {
    setCartOpen(!cartOpen);
  };

  const closeCart = () => {
    setCartOpen(false);
  };

  const addToCart = (item: MenuItem & { notes?: string }) => {
    setCartItems(prevItems => {
      const existingItem = prevItems.find(cartItem => 
        cartItem.id === item.id && cartItem.notes === item.notes
      );
      
      if (existingItem) {
        return prevItems.map(cartItem => 
          cartItem.id === item.id && cartItem.notes === item.notes
            ? { ...cartItem, quantity: cartItem.quantity + (item.quantity || 1) } 
            : cartItem
        );
      } else {
        return [...prevItems, { 
          ...item, 
          quantity: item.quantity || 1,
          notes: item.notes 
        }];
      }
    });

    toast({
      title: "Item adicionado",
      description: `${item.name} foi adicionado ao carrinho`,
    });
  };

  const removeFromCart = (id: number, notes?: string) => {
    setCartItems(prevItems => prevItems.filter(item => 
      !(item.id === id && item.notes === notes)
    ));
    
    toast({
      title: "Item removido",
      description: "O item foi removido do carrinho",
    });
  };

  const updateQuantity = (id: number, quantity: number, notes?: string) => {
    if (quantity <= 0) {
      removeFromCart(id, notes);
      return;
    }
    
    setCartItems(prevItems => 
      prevItems.map(item => 
        item.id === id && item.notes === notes ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    toast({
      title: "Carrinho limpo",
      description: "Todos os itens foram removidos do carrinho",
    });
  };

  const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
  
  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity, 
    0
  );

  const getCartTotal = () => {
    return cartItems.reduce(
      (total, item) => total + item.price * item.quantity, 
      0
    );
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartOpen,
        toggleCart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        closeCart, // Expondo o método para fechar o carrinho
        getCartTotal, // Expondo o método para calcular total do carrinho
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
