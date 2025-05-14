
import { useState, useEffect, useCallback } from "react";

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
}

// Armazena a última instância do hook para uso global
let latestToasts: Toast[] = [];
let latestToast: (props: Omit<Toast, "id">) => string = () => "";
let latestDismiss: (id?: string) => void = () => {};

export const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(
    (props: Omit<Toast, "id">) => {
      const id = Math.random().toString(36).substring(2, 9);
      setState((state) => ({
        ...state,
        toasts: [...state.toasts, { id, ...props }],
      }));
      return id;
    },
    []
  );

  const dismiss = useCallback((id?: string) => {
    setState((state) => ({
      ...state,
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  }, []);

  // Atualiza as referências globais
  useEffect(() => {
    latestToasts = state.toasts;
    latestToast = toast;
    latestDismiss = dismiss;
  }, [state.toasts, toast, dismiss]);

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
};

// Função toast para uso sem hooks
// Este método pode ser chamado diretamente como toast({ title: "...", ... })
export const toast = (props: Omit<Toast, "id">): string => {
  // Se estamos dentro de um componente React que usa useToast, use essa instância
  if (latestToast) {
    return latestToast(props);
  }
  
  // Caso contrário, dispara um evento customizado para o sistema de fallback
  const event = new CustomEvent("toast-show", { detail: props });
  document.dispatchEvent(event);
  return "";
};

// Adiciona os métodos para manter compatibilidade com o código legado
toast.show = (props: Omit<Toast, "id">): void => {
  toast(props);
};

toast.dismiss = (id?: string): void => {
  if (latestDismiss) {
    latestDismiss(id);
  } else {
    const event = new CustomEvent("toast-dismiss", { detail: { id } });
    document.dispatchEvent(event);
  }
};

