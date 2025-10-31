import React, { useMemo } from 'react';
import { Product } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ImageUpload from '@/components/ImageUpload';
import MultipleImageUpload from '@/components/MultipleImageUpload';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';

export type ProductFormData = {
  name: string;
  description: string;
  price: number;
  category: string;
  categories?: string[];
  available: boolean;
  featured: boolean;
  ingredients: string;
  note_hint: string;
  image_url: string;
  images: string[];
  gallery: string[];
  nutritional_info: Record<string, unknown>;
};

export type ProductFormMode = 'create' | 'edit';

type BaseCallbacks = {
  onSubmit: (data: ProductFormData) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
};

type ProductFormProps = BaseCallbacks & {
  initialData: ProductFormData;
  mode: ProductFormMode;
  product?: Product | null;
  isMobile?: boolean;
};

const normalizeName = (s: string) => s.trim();

const ProductForm = ({
  initialData,
  mode,
  product,
  onSubmit,
  onCancel,
  submitting,
  isMobile,
}: ProductFormProps) => {
  const [formState, setFormState] = React.useState<ProductFormData>(initialData);
  const { getCategories, upsertCategory, getCategoriesForProduct, deleteCategoryIfUnused } = useSupabaseWithMultiTenant();
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [newCategory, setNewCategory] = React.useState('');
  const [defaultCategories, setDefaultCategories] = React.useState<string[]>([]);

  React.useEffect(() => {
    setFormState(initialData);
  }, [initialData]);

  React.useEffect(() => {
    let isMounted = true;
    const loadCats = async () => {
      try {
        const list = await getCategories();
        if (isMounted) {
          setAvailableCategories((list || []).map((c: any) => c.name));
          setDefaultCategories((list || []).filter((c: any) => !!c.is_default).map((c: any) => c.name));
        }
      } catch {}
    };
    loadCats();
    return () => { isMounted = false; };
  }, [getCategories]);

  React.useEffect(() => {
    let isMounted = true;
    const primeSelected = async () => {
      try {
        if (product?.id) {
          const names = await getCategoriesForProduct(Number(product.id));
          if (isMounted && Array.isArray(names)) setSelectedCategories(names.slice(0,5));
        } else if (initialData.category) {
          const n = normalizeName(initialData.category);
          if (n && isMounted) setSelectedCategories([n]);
        }
      } catch {}
    };
    primeSelected();
    return () => { isMounted = false; };
  }, [product?.id, initialData.category, getCategoriesForProduct]);

  const handleChange = <T extends keyof ProductFormData>(field: T, value: ProductFormData[T]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cats = selectedCategories.slice(0,5);
    await onSubmit({ ...formState, categories: cats, category: cats[0] || '' });
  };

  const bindLongPress = React.useCallback((name: string) => {
    let timer: any;
    const start = () => {
      timer = setTimeout(async () => {
        if (defaultCategories.includes(name)) {
          window.alert('Esta é uma categoria padrão e não pode ser excluída.');
          return;
        }
        const ok = window.confirm(`Excluir a categoria "${name}"?`);
        if (!ok) return;
        const res = await deleteCategoryIfUnused(name);
        if (res.status === 'ok') {
          setAvailableCategories((prev) => prev.filter((n) => n !== name));
          setSelectedCategories((prev) => prev.filter((n) => n !== name));
        } else if (res.status === 'in_use') {
          window.alert('Não é possível excluir: a categoria está sendo usada por produtos ou combos.');
        } else if (res.status === 'default') {
          window.alert('Categoria padrão do sistema não pode ser excluída.');
        } else {
          window.alert(res.message || 'Não foi possível excluir a categoria.');
        }
      }, 600);
    };
    const clear = () => { if (timer) clearTimeout(timer); };
    return {
      onMouseDown: start,
      onTouchStart: start,
      onMouseUp: clear,
      onMouseLeave: clear,
      onTouchEnd: clear,
      onContextMenu: (e: React.MouseEvent) => { e.preventDefault(); start(); },
    } as any;
  }, [defaultCategories, deleteCategoryIfUnused]);

  const actionLabel = submitting
    ? mode === 'edit'
      ? 'Atualizando...'
      : 'Criando...'
    : mode === 'edit'
    ? 'Atualizar Produto'
    : 'Criar Produto';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-name">Nome do Produto</Label>
          <Input
            id="product-name"
            value={formState.name}
            onChange={(event) => handleChange('name', event.target.value)}
            placeholder="Nome do produto"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="product-price">Preço (R$)</Label>
          <Input
            id="product-price"
            type="number"
            step="0.01"
            value={formState.price === 0 ? '' : formState.price}
            onChange={(event) => {
              const v = event.target.value;
              const num = v === '' ? 0 : parseFloat(v.replace(',', '.'));
              handleChange('price', Number.isFinite(num) ? num : 0);
            }}
            placeholder="0,00"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-description">Descrição</Label>
        <Textarea
          id="product-description"
          value={formState.description}
          onChange={(event) => handleChange('description', event.target.value)}
          placeholder="Descrição do produto"
          rows={isMobile ? 4 : 3}
        />
      </div>

      <div className="space-y-3">
        <Label>Imagem principal</Label>
        <ImageUpload
          value={formState.image_url}
          onImageUpload={(url) => handleChange('image_url', url)}
          label="Selecionar imagem"
          acceptedFileTypes="image/*"
        />
      </div>

      <div className="space-y-3">
        <Label>Galeria</Label>
        <MultipleImageUpload
          values={formState.images}
          onImagesUpload={(urls) => handleChange('images', urls)}
          label="Adicionar imagens"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="product-category">Categorias (até 5)</Label>
        {selectedCategories.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((name) => (
              <Badge key={name} variant="secondary" className="flex items-center gap-2" {...bindLongPress(name)}>
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCategories((prev) => prev.filter((n) => n !== name))}
                  className="rounded-full bg-white/40 p-0.5 text-gray-600 transition hover:bg-white hover:text-gray-800"
                  aria-label={`Remover ${name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {availableCategories.map((name) => {
            const active = selectedCategories.includes(name);
            const disabled = !active && selectedCategories.length >= 5;
            return (
              <button
                key={name}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setSelectedCategories((prev) => {
                    if (prev.includes(name)) return prev.filter((n) => n !== name);
                    return prev.length >= 5 ? prev : [...prev, name];
                  });
                }}
                {...bindLongPress(name)}
                className={`rounded-full px-3 py-1 text-sm border ${active ? 'bg-menu-primary text-white border-menu-primary' : 'bg-white text-gray-700 border-gray-200 hover:border-menu-primary'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                {name}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            id="product-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova categoria"
          />
          <Button
            type="button"
            onClick={async () => {
              const n = normalizeName(newCategory);
              if (!n) return;
              try {
                const cat = await upsertCategory(n);
                const name = (cat as any)?.name || n;
                setAvailableCategories((prev) => (prev.includes(name) ? prev : [...prev, name]));
                setSelectedCategories((prev) => (prev.includes(name) || prev.length >= 5 ? prev : [...prev, name]));
                setNewCategory('');
              } catch {}
            }}
          >
            Adicionar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="product-ingredients">Ingredientes</Label>
          <Textarea
            id="product-ingredients"
            value={formState.ingredients}
            onChange={(event) => handleChange('ingredients', event.target.value)}
            placeholder="Separe por vírgulas ou quebre linhas"
            rows={3}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="product-note">Sugestão para observações</Label>
          <Textarea
            id="product-note"
            value={formState.note_hint}
            onChange={(event) => handleChange('note_hint', event.target.value)}
            placeholder="Ex: ponto da carne, opção sem glúten, etc."
            rows={3}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Switch
            id="product-available"
            checked={formState.available}
            onCheckedChange={(checked) => handleChange('available', checked)}
          />
          <Label htmlFor="product-available">Produto disponível</Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="product-featured"
            checked={formState.featured}
            onCheckedChange={(checked) => handleChange('featured', checked)}
          />
          <Label htmlFor="product-featured">Produto em destaque</Label>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
          className="sm:min-w-[140px]"
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting} className="sm:min-w-[160px]">
          {actionLabel}
        </Button>
      </div>
    </form>
  );
};

export default ProductForm;
