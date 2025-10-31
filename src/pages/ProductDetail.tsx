import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Minus, Plus, MessageSquarePlus, Loader2 } from "lucide-react";

import { getMediaUrl } from "@/lib/media";
import { Product } from "@/types/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useCart } from "@/context/CartContext";
import { useSupabaseWithMultiTenant } from "@/hooks/useSupabaseWithMultiTenant";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const fallbackImage = "/placeholder.svg";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { getProductById, ensureRls } = useSupabaseWithMultiTenant();
  const getProductByIdRef = useRef(getProductById);
  const ensureRlsRef = useRef(ensureRls);
  useEffect(() => { getProductByIdRef.current = getProductById; }, [getProductById]);
  useEffect(() => { ensureRlsRef.current = ensureRls; }, [ensureRls]);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [showNotesField, setShowNotesField] = useState(false);

  const productId = useMemo(() => {
    if (!id) return null;
    const numeric = Number(id);
    return Number.isNaN(numeric) ? null : numeric;
  }, [id]);

  useEffect(() => {
    if (!productId) {
      setError("Produto não encontrado");
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        await ensureRlsRef.current();
        const data = await getProductByIdRef.current(productId);

        if (!cancelled) {
          if (data) {
            setProduct(data as Product);
            setError(null);
          } else {
            setError("Produto não encontrado");
          }
        }
      } catch (err) {
        console.error("Erro ao carregar produto", err);
        if (!cancelled) {
          setError("Não foi possível carregar este prato");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const images = useMemo(() => {
    if (!product) return [fallbackImage];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.map((u) => getMediaUrl(u));
    }
    if (product.image_url) {
      return [getMediaUrl(product.image_url)];
    }
    return [fallbackImage];
  }, [product]);

  const ingredients = useMemo(() => {
    if (!product?.nutritional_info) return [];
    const info = product.nutritional_info as Record<string, unknown>;
    const ing = info["ingredients"];
    if (Array.isArray(ing)) return ing as string[];
    return [];
  }, [product]);

  const handleIncrease = () => setQuantity((prev) => Math.min(prev + 1, 99));
  const handleDecrease = () => setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  const handleToggleNotes = () => {
    setShowNotesField((prev) => !prev);
    if (showNotesField) {
      setNotes("");
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image_url,
      imageUrl: product.image_url,
      description: product.description,
      category: product.category,
      quantity,
      notes: notes.trim() || undefined,
    });

    toast({
      title: "Item adicionado ao carrinho",
      description: `${quantity}x ${product.name} foi adicionado ao seu pedido`,
    });

    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <main className="container mx-auto px-4 pb-32 pt-5 sm:pb-36">
        <div className="mb-5 flex items-center gap-3 text-sm text-menu-primary">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 rounded-full border border-menu-primary/30 px-3 py-1 text-menu-primary transition-colors hover:bg-menu-primary/5"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-menu-primary" />
          </div>
        ) : error ? (
          <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-gray-800">{error}</h1>
            <p className="mt-2 text-sm text-gray-500">
              Verifique se o prato ainda está disponível ou tente novamente mais tarde.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => navigate('/')}>Voltar ao cardápio</Button>
            </div>
          </div>
        ) : product ? (
          <div className="space-y-8">
            <section className="overflow-hidden rounded-3xl bg-white shadow-sm">
              <div className="relative">
                <Carousel className="w-full">
                  <CarouselContent>
                    {images.map((image, index) => (
                      <CarouselItem key={`${image}-${index}`}>
                        <img
                          src={image}
                          alt={`${product.name} - ${index + 1}`}
                          className="h-64 w-full object-cover sm:h-[360px]"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {images.length > 1 && (
                    <>
                      <CarouselPrevious className="left-4 top-1/2 h-9 w-9 -translate-y-1/2 bg-white/80 text-gray-700 shadow" />
                      <CarouselNext className="right-4 top-1/2 h-9 w-9 -translate-y-1/2 bg-white/80 text-gray-700 shadow" />
                    </>
                  )}
                </Carousel>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 py-6 text-white">
                  <h1 className="text-2xl font-semibold sm:text-3xl">{product.name}</h1>
                  <span className="mt-1 inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-sm font-medium text-gray-900">
                    R$ {product.price.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-6 px-5 py-6 sm:px-8">
                <section>
                  <h2 className="text-base font-semibold text-menu-secondary">Descrição</h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {product.description || "Este prato ainda não possui uma descrição detalhada."}
                  </p>
                </section>

                {ingredients.length > 0 && (
                  <section>
                    <h2 className="text-base font-semibold text-menu-secondary">Ingredientes</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                      {ingredients.map((ingredient, idx) => (
                        <li key={`${ingredient}-${idx}`}>{ingredient}</li>
                      ))}
                    </ul>
                  </section>
                )}

                <section className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-menu-secondary">Observações</h3>
                      <p className="text-xs text-gray-500">
                        Informe preferências ou restrições para o preparo.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleToggleNotes}
                      className="h-8 rounded-full px-3 text-xs"
                    >
                      <MessageSquarePlus className="mr-2 h-3.5 w-3.5" />
                      {showNotesField ? "Remover" : "Adicionar"}
                    </Button>
                  </div>
                  {showNotesField && (
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex: sem cebola, ponto da carne, etc."
                      className="mt-3 text-sm"
                      rows={3}
                    />
                  )}
                </section>
              </div>
            </section>
          </div>
        ) : null}
      </main>

      {product && !loading && !error && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.35)]">
          <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={handleDecrease}
                className="h-9 w-9"
                disabled={quantity <= 1}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="min-w-[32px] text-center text-lg font-semibold">{quantity}</span>
              <Button variant="outline" size="icon" onClick={handleIncrease} className="h-9 w-9">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleAddToCart} className="flex-1 rounded-full py-6 text-base font-semibold">
              Adicionar • R$ {(product.price * quantity).toFixed(2)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
