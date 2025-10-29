
import React from 'react';
import { Button } from '@/components/ui/button';
import { categories } from '@/data/menuItems';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ 
  selectedCategory,
  onCategoryChange 
}) => {
  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-max gap-1.5">
        {categories.map(category => (
          <Button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            variant={selectedCategory === category.id ? "default" : "outline"}
            className={`px-3 py-1.5 text-sm whitespace-nowrap ${
              selectedCategory === category.id 
                ? "bg-menu-primary text-white" 
                : "text-gray-700 hover:text-menu-primary"
            }`}
          >
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
