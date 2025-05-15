
// Arquivo para gerenciar notificações toast
import { type ToastActionElement, ToastProps } from "@/components/ui/toast";
import { toast as sonnerToast } from "sonner";

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
    sonnerToast(props.title as string, {
      description: props.description,
      action: props.action,
      duration: props.duration || 5000,
      // Mapear variant para o tipo do Sonner
      ...(props.variant === "destructive" ? { style: { backgroundColor: "rgb(240, 86, 86)", color: "white" } } : {}),
    });
  }

  function dismiss(toastId?: string) {
    if (toastId) {
      sonnerToast.dismiss(toastId);
    } else {
      sonnerToast.dismiss();
    }
  }

  return {
    toast,
    dismiss,
  };
}

// Exporta uma interface simplificada do toast para uso direto
export const toast = (props: Omit<ToastProps, "id">) => {
  sonnerToast(props.title as string, {
    description: props.description,
    action: props.action,
    duration: props.duration || 5000,
    // Mapear variant para o tipo do Sonner
    ...(props.variant === "destructive" ? { style: { backgroundColor: "rgb(240, 86, 86)", color: "white" } } : {}),
  });
};
