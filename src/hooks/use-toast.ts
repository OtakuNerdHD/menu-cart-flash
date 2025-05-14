
// Arquivo atualizado para evitar referência circular
import { type ToastActionElement, ToastProps } from "@/components/ui/toast";
import { useToast as useToastImpl } from "@radix-ui/react-toast";
import { toast as originalToast } from "sonner";

// Define a interface do Toast
export interface Toast {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive";
  duration?: number;
}

// Define o retorno do hook useToast
export interface UseToastReturn {
  toast: (props: Omit<ToastProps, "id">) => void;
  dismiss: (toastId?: string) => void;
}

// Hook useToast
export function useToast(): UseToastReturn {
  // Função para enviar um toast
  function toast(props: Omit<ToastProps, "id">) {
    originalToast(props.title as string, {
      description: props.description,
      action: props.action,
      duration: props.duration,
      // Mapear outras props conforme necessário
    });
  }

  function dismiss(toastId?: string) {
    // Implementação da função dismiss
    if (toastId) {
      originalToast.dismiss(toastId);
    } else {
      originalToast.dismiss();
    }
  }

  return {
    toast,
    dismiss,
  };
}

// Exporta uma interface simplificada do toast para uso direto
export const toast = (props: Omit<ToastProps, "id">) => {
  originalToast(props.title as string, {
    description: props.description,
    action: props.action,
    duration: props.duration,
  });
};
