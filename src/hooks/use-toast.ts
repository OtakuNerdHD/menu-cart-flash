
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

export const useToast = () => {
  const [state, setState] = useState<ToastState>({ toasts: [] });

  const toast = useCallback(
    ({ ...props }: Omit<Toast, "id">) => {
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

  return {
    toast,
    dismiss,
    toasts: state.toasts,
  };
};

// Exportando um objeto toast para uso sem hooks
export const toast = {
  show: (props: Omit<Toast, "id">) => {
    const event = new CustomEvent("toast-show", { detail: props });
    document.dispatchEvent(event);
  },
  dismiss: (id?: string) => {
    const event = new CustomEvent("toast-dismiss", { detail: { id } });
    document.dispatchEvent(event);
  },
};
