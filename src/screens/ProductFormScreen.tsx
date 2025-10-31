import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductManagement from "@/pages/ProductManagement";
import ProductForm, { ProductFormData } from "@/components/product/ProductForm";
import { useSupabaseWithMultiTenant } from "@/hooks/useSupabaseWithMultiTenant";
import { useIsMobile } from "@/hooks/use-mobile";
import { Product } from "@/types/supabase";
import { toast } from "@/hooks/use-toast";

const defaultFormData: ProductFormData = {
  name: "",
  description: "",
  price: 0,
  category: "",
  available: true,
  featured: false,
  ingredients: "",
  note_hint: "",
  image_url: "",
  images: [],
  gallery: [],
  nutritional_info: {},
};

export default function ProductFormScreen() {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getProducts, createProduct, updateProduct } = useSupabaseWithMultiTenant();
  const isFormRoute = location.pathname.startsWith("/products/manage") && isMobile;

  const [initialData, setInitialData] = React.useState<ProductFormData>(defaultFormData);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [loading, setLoading] = React.useState(false);
  const [targetProduct, setTargetProduct] = React.useState<Product | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const getProductsRef = React.useRef(getProducts);

  React.useEffect(() => {
    getProductsRef.current = getProducts;
  }, [getProducts]);

  React.useEffect(() => {
    if (!isFormRoute) return;

    const loadProduct = async () => {
      setLoading(true);
      let isMounted = true;
      const finish = () => {
        if (isMounted) {
          setLoading(false);
        }
      };

      try {
        const isEditRoute = location.pathname.endsWith("/edit");
        if (isEditRoute) {
          setMode("edit");
          const id = new URLSearchParams(location.search).get("id");

          if (!id) {
            setTargetProduct(null);
            setInitialData(defaultFormData);
            return;
          }

          const products = await getProductsRef.current();
          const found = products.find((p) => String(p.id) === id);

          if (found) {
            setTargetProduct(found as Product);
            setInitialData({
              name: found.name,
              description: found.description || "",
              price: found.price || 0,
              category: found.category || "",
              available: found.available !== false,
              featured: found.featured || false,
              ingredients: found.ingredients || "",
              note_hint: found.note_hint || "",
              image_url: found.image_url || "",
              images: Array.isArray(found.images) ? found.images : [],
              gallery: Array.isArray(found.gallery) ? found.gallery : [],
              nutritional_info: (found.nutritional_info as Record<string, unknown>) || {},
            });
          } else {
            setTargetProduct(null);
            setInitialData(defaultFormData);
          }
        } else {
          setMode("create");
          setTargetProduct(null);
          setInitialData(defaultFormData);
        }
      } finally {
        finish();
      }
    };

    let active = true;
    const wrappedLoad = async () => {
      try {
        await loadProduct();
      } finally {
        if (!active) {
          setLoading(false);
        }
      }
    };

    void wrappedLoad();

    return () => {
      active = false;
    };
  }, [isFormRoute, location.pathname, location.search]);

  if (!isFormRoute) {
    return <ProductManagement />;
  }

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSubmit = async (data: ProductFormData) => {
    setSubmitting(true);
    try {
      if (mode === "edit") {
        const id = new URLSearchParams(location.search).get("id");
        if (!id) throw new Error("ID do produto não encontrado");
        await updateProduct(id.toString(), data);
        toast({ title: "Produto atualizado", description: "O produto foi atualizado com sucesso." });
      } else {
        await createProduct(data);
        toast({ title: "Produto criado", description: "O produto foi criado com sucesso." });
      }
      navigate(-1);
    } catch (error: any) {
      toast({ title: "Erro ao salvar produto", description: error.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="mb-6">
        <button
          onClick={handleCancel}
          className="text-sm text-menu-primary hover:underline"
          type="button"
        >
          Voltar
        </button>
        <h1 className="mt-2 text-2xl font-bold">
          {mode === "edit" ? "Editar produto" : "Novo produto"}
        </h1>
        <p className="text-sm text-gray-500">
          Preencha as informações abaixo para {mode === "edit" ? "atualizar" : "criar"} o produto.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
          Carregando informações do produto...
        </div>
      ) : (
        <ProductForm
          initialData={initialData}
          mode={mode}
          product={targetProduct}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={submitting}
          isMobile
        />
      )}
    </div>
  );
}
