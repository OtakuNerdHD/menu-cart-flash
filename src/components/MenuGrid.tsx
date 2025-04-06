
import React from 'react';
import MenuItem from './MenuItem';
import { type MenuItem as MenuItemType } from '@/data/menuItems';

interface MenuGridProps {
  items: MenuItemType[];
}

const MenuGrid: React.FC<MenuGridProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-semibold text-gray-600">
          Nenhum item encontrado nesta categoria
        </h2>
        <p className="mt-2 text-gray-500">
          Tente selecionar outra categoria
        </p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-6">
      {items.map(item => (
        <MenuItem key={item.id} item={item} />
      ))}
    </div>
  );
};

export default MenuGrid;
