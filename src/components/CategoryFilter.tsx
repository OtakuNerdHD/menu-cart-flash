
import React from 'react';
import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  categories?: string[]; // lista dinâmica de nomes
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ selectedCategory, onCategoryChange, categories = [] }) => {
  const list = ['todos', ...categories];
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1.5">
        {list.map((name) => (
          <Button
            key={name}
            onClick={() => onCategoryChange(name)}
            variant={selectedCategory === name ? "default" : "outline"}
            className={`px-3 py-1.5 text-sm whitespace-nowrap ${
              selectedCategory === name ? 'bg-menu-primary text-white' : 'text-gray-700 hover:text-menu-primary'
            }`}
          >
            {name === 'todos' ? 'Todos' : name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
