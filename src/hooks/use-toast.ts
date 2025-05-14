
import { type ToastProps, useToast as useToastShadcn } from "@/components/ui/toast";

export const useToast = useToastShadcn;

export const toast = (props: ToastProps) => {
  const { toast } = useToastShadcn();
  toast(props);
};
