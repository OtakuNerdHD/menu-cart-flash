import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MultipleImageUpload from '@/components/MultipleImageUpload';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, X } from 'lucide-react';
import { useSupabaseWithMultiTenant } from '@/hooks/useSupabaseWithMultiTenant';
import { Product } from '@/types/supabase';

export type ComboFormData = {
  title: string;
  description: string;
  priceLabel: string;
  serves: string;
  category: string;
  categories?: string[];
  items: string[];
  perks: string[];
  images: string[];
  comboType: 'existing' | 'custom';
  productIds: string[];
  savings?: string;
  highlight_homepage?: boolean;
  highlight_combos?: boolean;
  highlight_full?: boolean;
};

type ComboFormProps = {
  initialData: ComboFormData;
  mode: 'create' | 'edit';
  onSubmit: (data: ComboFormData) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
  loadProducts?: () => Promise<Product[]>;
  comboId?: number;
};

const ComboForm: React.FC<ComboFormProps> = ({ initialData, mode, onSubmit, onCancel, submitting, loadProducts, comboId }) => {
  const [formState, setFormState] = React.useState<ComboFormData>(initialData);
  const getProductsRef = React.useRef(loadProducts);
  const [allProducts, setAllProducts] = React.useState<Product[]>([]);
  const [productSearchTerm, setProductSearchTerm] = React.useState('');
  const [productLoading, setProductLoading] = React.useState(false);
  const [productError, setProductError] = React.useState<string | null>(null);
  const { getCategories, upsertCategory, getCategoriesForCombo, deleteCategoryIfUnused } = useSupabaseWithMultiTenant();
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>([]);
  const [newCategory, setNewCategory] = React.useState('');
  const [defaultCategories, setDefaultCategories] = React.useState<string[]>([]);

  React.useEffect(() => {
    setFormState(initialData);
  }, [initialData]);

  React.useEffect(() => {
    getProductsRef.current = loadProducts;
  }, [loadProducts]);

  React.useEffect(() => {
    if (formState.comboType !== 'existing') {
      return;
    }

    // Evitar múltiplas buscas caso já tenha carregado
    if (allProducts.length > 0) {
      return;
    }

    let isMounted = true;

    const fetchProducts = async () => {
      setProductLoading(true);
      setProductError(null);
      try {
        if (!getProductsRef.current) {
          return;
        }
        const data = await getProductsRef.current();
        if (isMounted) {
          setAllProducts(Array.isArray(data) ? (data as Product[]) : []);
        }
      } catch (error: any) {
        if (isMounted) {
          setProductError(error?.message || 'Não foi possível carregar os produtos.');
        }
      } finally {
        if (isMounted) {
          setProductLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [formState.comboType, allProducts.length]);

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
        if (comboId) {
          const names = await getCategoriesForCombo(Number(comboId));
          if (isMounted && Array.isArray(names)) setSelectedCategories(names.slice(0,5));
        } else if (initialData.category) {
          const n = (initialData.category || '').trim();
          if (n && isMounted) setSelectedCategories([n]);
        }
      } catch {}
    };
    primeSelected();
    return () => { isMounted = false; };
  }, [comboId, initialData.category, getCategoriesForCombo]);

  const handleChange = <K extends keyof ComboFormData>(field: K, value: ComboFormData[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleHighlightChange = (field: 'highlight_homepage' | 'highlight_combos' | 'highlight_full', checked: boolean) => {
    setFormState((prev) => {
      if (field === 'highlight_full') {
        // Não forçar individuais ao marcar full; apenas controlar via UI e persistência.
        return { ...prev, highlight_full: checked };
      }
      // Se highlight_full está ativo, impedir alterar os individuais (apenas visualmente marcados via OR)
      if (prev.highlight_full) return prev;
      return { ...prev, [field]: checked } as ComboFormData;
    });
  };

  const handleTextAreaListChange = (field: 'items' | 'perks') => (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextValues = event.target.value
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    handleChange(field, nextValues);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cats = selectedCategories.slice(0,5);
    const payload =
      formState.comboType === 'existing'
        ? { ...formState, categories: cats, category: cats[0] || '' }
        : {
            ...formState,
            categories: cats,
            category: cats[0] || '',
            productIds: [],
          };
    await onSubmit(payload);
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
    ? 'Atualizar Combo'
    : 'Criar Combo';

  const MAX_PRODUCTS = 10;

  const filteredProducts = React.useMemo(() => {
    if (formState.comboType !== 'existing') {
      return [] as Product[];
    }
    const term = productSearchTerm.trim().toLowerCase();
    const list = term
      ? allProducts.filter((product) => product.name?.toLowerCase().includes(term))
      : allProducts;
    return list.slice(0, 30);
  }, [allProducts, productSearchTerm, formState.comboType]);

  const selectedProductLabels = React.useMemo(
    () =>
      formState.productIds.map((id) => {
        const product = allProducts.find((item) => String(item.id) === id);
        return {
          id,
          label: product?.name || `Produto #${id}`,
        };
      }),
    [formState.productIds, allProducts]
  );

  const syncItemsWithProducts = React.useCallback(
    (ids: string[]) => {
      if (formState.comboType !== 'existing') {
        return ids;
      }

      const labels = ids
        .map((id) => {
          const product = allProducts.find((item) => String(item.id) === id);
          return product?.name?.trim();
        })
        .filter((name): name is string => Boolean(name));

      setFormState((prev) => ({
        ...prev,
        productIds: ids,
        items: labels,
      }));

      return ids;
    },
    [allProducts, formState.comboType]
  );

  const toggleProductSelection = (product: Product) => {
    const id = String(product.id);
    const alreadySelected = formState.productIds.includes(id);

    if (alreadySelected) {
      const nextIds = formState.productIds.filter((productId) => productId !== id);
      syncItemsWithProducts(nextIds);
      return;
    }

    if (formState.productIds.length >= MAX_PRODUCTS) {
      return;
    }

    const nextIds = [...formState.productIds, id];
    syncItemsWithProducts(nextIds);
  };

  const removeProduct = (id: string) => {
    const nextIds = formState.productIds.filter((productId) => productId !== id);
    syncItemsWithProducts(nextIds);
  };

  const handleComboTypeChange = (value: 'existing' | 'custom') => {
    if (value === formState.comboType) {
      return;
    }

    setFormState((prev) => ({
      ...prev,
      comboType: value,
      productIds: value === 'custom' ? [] : prev.productIds,
      items:
        value === 'existing'
          ? prev.productIds
              .map((id) => {
                const product = allProducts.find((item) => String(item.id) === id);
                return product?.name?.trim();
              })
              .filter((name): name is string => Boolean(name))
          : prev.items,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <Label>Tipo de combo</Label>
        <RadioGroup
          value={formState.comboType}
          onValueChange={(value) => handleComboTypeChange(value as 'existing' | 'custom')}
          className="grid gap-2 sm:grid-cols-2"
        >
          <Label
            htmlFor="combo-type-existing"
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 ${
              formState.comboType === 'existing' ? 'border-menu-primary bg-menu-primary/5' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="combo-type-existing" value="existing" />
              <span className="font-medium">Produtos cadastrados</span>
            </div>
            <p className="text-xs text-gray-500">
              Monte um combo selecionando até {MAX_PRODUCTS} itens já cadastrados.
            </p>
          </Label>
          <Label
            htmlFor="combo-type-custom"
            className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-3 ${
              formState.comboType === 'custom' ? 'border-menu-primary bg-menu-primary/5' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <RadioGroupItem id="combo-type-custom" value="custom" />
              <span className="font-medium">Combo personalizado</span>
            </div>
            <p className="text-xs text-gray-500">
              Defina livremente os itens e benefícios do combo.
            </p>
          </Label>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-title">Nome do Combo</Label>
        <Input
          id="combo-title"
          value={formState.title}
          onChange={(event) => handleChange('title', event.target.value)}
          placeholder="Combo Família Suprema"
          required
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="combo-price">Preço</Label>
          <Input
            id="combo-price"
            value={formState.priceLabel}
            onChange={(event) => handleChange('priceLabel', event.target.value)}
            placeholder="R$ 89,90"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="combo-serves">Serve</Label>
          <Input
            id="combo-serves"
            type="number"
            inputMode="numeric"
            min={1}
            value={formState.serves}
            onChange={(event) => {
              const v = event.target.value.replace(/[^0-9]/g, '');
              handleChange('serves', v);
            }}
            placeholder="Quantidade de pessoas (ex: 6)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-description">Descrição</Label>
        <Textarea
          id="combo-description"
          value={formState.description}
          onChange={(event) => handleChange('description', event.target.value)}
          placeholder="Descrição resumida do combo"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="combo-category">Categorias (até 5)</Label>
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
            id="combo-category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova categoria"
          />
          <Button
            type="button"
            onClick={async () => {
              const n = (newCategory || '').trim();
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

      {formState.comboType === 'existing' && (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="combo-product-search">Selecionar produtos cadastrados</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                id="combo-product-search"
                value={productSearchTerm}
                onChange={(event) => setProductSearchTerm(event.target.value)}
                placeholder="Pesquisar produtos pelo nome"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-gray-500">
              Selecione até {MAX_PRODUCTS} produtos já existentes para compor este combo.
            </p>
          </div>

          {selectedProductLabels.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedProductLabels.map(({ id, label }) => (
                <Badge key={id} variant="secondary" className="flex items-center gap-2">
                  <span>{label}</span>
                  <button
                    type="button"
                    onClick={() => removeProduct(id)}
                    className="rounded-full bg-white/40 p-0.5 text-gray-600 transition hover:bg-white hover:text-gray-800"
                    aria-label={`Remover ${label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200">
            {productLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando produtos...
              </div>
            ) : productError ? (
              <div className="px-3 py-4 text-sm text-red-500">{productError}</div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-3 py-4 text-sm text-gray-500">Nenhum produto encontrado.</div>
            ) : (
              <div className="divide-y">
                {filteredProducts.map((product) => {
                  const id = String(product.id);
                  const selected = formState.productIds.includes(id);
                  const disabled = !selected && formState.productIds.length >= MAX_PRODUCTS;
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleProductSelection(product)}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left transition hover:bg-gray-50 ${
                        selected ? 'bg-menu-primary/10' : ''
                      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{product.name}</p>
                        {product.price && (
                          <p className="text-xs text-gray-500">R$ {Number(product.price).toFixed(2)}</p>
                        )}
                      </div>
                      <Badge variant={selected ? 'default' : 'outline'} className="text-xs">
                        {selected ? 'Selecionado' : 'Adicionar'}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {formState.productIds.length >= MAX_PRODUCTS && (
            <p className="text-xs text-right text-gray-500">Limite de {MAX_PRODUCTS} produtos atingido.</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label>Imagens do combo</Label>
        <MultipleImageUpload
          values={formState.images}
          onImagesUpload={(urls) => handleChange('images', urls.slice(0, 5))}
          maxImages={5}
          label={`Adicionar imagens (${formState.images.length}/5)`}
          folder="combos"
        />
      </div>

      <div className="space-y-2">
        <Label>Destaques</Label>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className={`flex items-center gap-2 rounded-md border p-3 ${formState.highlight_full ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              checked={!!formState.highlight_homepage || !!formState.highlight_full}
              onChange={(e) => handleHighlightChange('highlight_homepage', e.target.checked)}
              disabled={!!formState.highlight_full}
            />
            <span className="text-sm">Destaque homepage</span>
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3">
            <input
              type="checkbox"
              checked={!!formState.highlight_full}
              onChange={(e) => handleHighlightChange('highlight_full', e.target.checked)}
            />
            <span className="text-sm font-medium">Destaque completo</span>
          </label>
          <label className={`flex items-center gap-2 rounded-md border p-3 ${formState.highlight_full ? 'opacity-60' : ''}`}>
            <input
              type="checkbox"
              checked={!!formState.highlight_combos || !!formState.highlight_full}
              onChange={(e) => handleHighlightChange('highlight_combos', e.target.checked)}
              disabled={!!formState.highlight_full}
            />
            <span className="text-sm">Destacar em combos</span>
          </label>
        </div>
      </div>

      {formState.comboType === 'custom' && (
        <div className="space-y-2">
          <Label htmlFor="combo-items">Itens do combo (um por linha)</Label>
          <Textarea
            id="combo-items"
            value={formState.items.join('\n')}
            onChange={handleTextAreaListChange('items')}
            placeholder="2x Smash Burger\n1x Batata rústica"
            rows={4}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="combo-perks">Benefícios (um por linha)</Label>
        <Textarea
          id="combo-perks"
          value={formState.perks.join('\n')}
          onChange={handleTextAreaListChange('perks')}
          placeholder="Inclui talheres e guardanapos"
          rows={3}
        />
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

export default ComboForm;
