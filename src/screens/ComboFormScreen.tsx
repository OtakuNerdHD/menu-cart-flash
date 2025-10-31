import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ProductManagement from "@/pages/ProductManagement";
import ComboForm, { ComboFormData } from "@/components/combo/ComboForm";
import { useIsMobile } from "@/hooks/use-mobile";
import { useSupabaseWithMultiTenant } from "@/hooks/useSupabaseWithMultiTenant";
import { toast } from "@/hooks/use-toast";

const defaultComboData: ComboFormData = {
  title: "",
  description: "",
  priceLabel: "",
  serves: "",
  category: "",
  items: [],
  perks: [],
  images: [],
  comboType: "custom",
  productIds: [],
  savings: "",
  highlight_homepage: false,
  highlight_combos: false,
  highlight_full: false,
};

const ComboFormScreen = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getProducts, getComboById, createCombo, updateCombo, supabase, ensureRls, addTeamFilter } = useSupabaseWithMultiTenant();
  const isFormRoute = location.pathname.startsWith("/combos/manage") && isMobile;

  const [initialData, setInitialData] = React.useState<ComboFormData>(defaultComboData);
  const [mode, setMode] = React.useState<"create" | "edit">("create");
  const [loading, setLoading] = React.useState(false);
  const [targetComboId, setTargetComboId] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!isFormRoute) return;

    const loadCombo = async () => {
      setLoading(true);
      try {
        // Garantir contexto de RLS antes de qualquer consulta direta
        await ensureRls();
        const isEditRoute = location.pathname.endsWith("/edit");
        if (isEditRoute) {
          setMode("edit");
          const id = new URLSearchParams(location.search).get("id");
          if (!id) {
            setInitialData(defaultComboData);
            setTargetComboId(null);
            return;
          }

          const dbCombo = await getComboById(Number(id));
          if (dbCombo) {
            setTargetComboId(String(dbCombo.id));
            // Mapear para ComboFormData
            const base: ComboFormData = {
              title: dbCombo.title || "",
              description: dbCombo.description || "",
              priceLabel: dbCombo.price_label || "",
              serves: dbCombo.serves || "",
              category: dbCombo.category || "",
              items: [],
              perks: Array.isArray(dbCombo.perks) ? dbCombo.perks : [],
              images: Array.isArray(dbCombo.images) ? dbCombo.images : [],
              comboType: (dbCombo.combo_type === 'existing' ? 'existing' : 'custom'),
              productIds: [],
              savings: dbCombo.savings || "",
              highlight_homepage: !!dbCombo.highlight_homepage,
              highlight_combos: !!dbCombo.highlight_combos,
              highlight_full: !!dbCombo.highlight_full,
            };
            if (base.comboType === 'existing') {
              let q1 = supabase
                .from('combo_products')
                .select('product_id, position')
                .eq('combo_id', dbCombo.id)
                .order('position', { ascending: true });
              // Reforçar isolamento por team, além do RLS
              q1 = addTeamFilter(q1);
              const { data } = await q1;
              base.productIds = (data || []).map((r: any) => String(r.product_id));
              base.items = [];
            } else {
              let q2 = supabase
                .from('combo_items_custom')
                .select('description, position')
                .eq('combo_id', dbCombo.id)
                .order('position', { ascending: true });
              // Reforçar isolamento por team, além do RLS
              q2 = addTeamFilter(q2);
              const { data } = await q2;
              base.items = (data || []).map((r: any) => r.description);
              base.productIds = [];
            }
            setInitialData(base);
          } else {
            setTargetComboId(null);
            setInitialData(defaultComboData);
          }
        } else {
          setMode("create");
          setTargetComboId(null);
          setInitialData(defaultComboData);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadCombo();
  }, [isFormRoute, location.pathname, location.search, getComboById, supabase]);

  if (!isFormRoute) {
    return <ProductManagement />;
  }

  const handleCancel = () => {
    navigate(-1);
  };

  const handleSubmit = async (data: ComboFormData) => {
    setSubmitting(true);
    try {
      if (mode === "edit" && targetComboId) {
        await updateCombo(Number(targetComboId), data);
        toast({ title: "Combo atualizado", description: "Atualizamos o combo." });
      } else {
        await createCombo(data);
        toast({ title: "Combo criado", description: "Novo combo adicionado." });
      }
      navigate(-1);
    } catch (error: any) {
      toast({ title: "Erro ao salvar combo", description: error?.message || "Tente novamente.", variant: "destructive" });
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
          {mode === "edit" ? "Editar combo" : "Novo combo"}
        </h1>
        <p className="text-sm text-gray-500">
          Preencha as informações abaixo para {mode === "edit" ? "atualizar" : "criar"} o combo.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-gray-500">
          Carregando informações do combo...
        </div>
      ) : (
        <ComboForm
          initialData={initialData}
          mode={mode}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          submitting={submitting}
          loadProducts={() => getProducts()}
          comboId={targetComboId ? Number(targetComboId) : undefined}
        />
      )}
    </div>
  );
};

export default ComboFormScreen;
