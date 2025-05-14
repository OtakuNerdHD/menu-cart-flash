
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();
  const [customToasts, setCustomToasts] = useState<typeof toasts>([]);

  // Event listener para toasts disparados fora do React
  useEffect(() => {
    const handleCustomToast = (e: CustomEvent) => {
      const props = e.detail;
      const id = Math.random().toString(36).substring(2, 9);
      setCustomToasts(prev => [...prev, { id, ...props }]);
      
      // Auto-dismiss após a duração especificada ou 5 segundos
      const duration = props.duration || 5000;
      setTimeout(() => {
        setCustomToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    };

    const handleDismissToast = (e: CustomEvent) => {
      const { id } = e.detail;
      if (id) {
        setCustomToasts(prev => prev.filter(toast => toast.id !== id));
      } else {
        setCustomToasts([]);
      }
    };

    document.addEventListener("toast-show", handleCustomToast as EventListener);
    document.addEventListener("toast-dismiss", handleDismissToast as EventListener);

    return () => {
      document.removeEventListener("toast-show", handleCustomToast as EventListener);
      document.removeEventListener("toast-dismiss", handleDismissToast as EventListener);
    };
  }, []);

  // Combina os toasts do hook e os toasts customizados
  const allToasts = [...toasts, ...customToasts];

  return (
    <ToastProvider>
      {allToasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
