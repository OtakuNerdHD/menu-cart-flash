
import { z } from "zod";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { checkEmailExists } from "./registrationUtils";

// Define email schema
const emailSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
});

type EmailFormProps = {
  onSubmit: (email: string) => Promise<void>;
  isLoading: boolean;
};

export function EmailForm({ onSubmit, isLoading }: EmailFormProps) {
  const [isEmailChecking, setIsEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof emailSchema>) => {
    if (emailExists) {
      toast({
        title: "Email já cadastrado",
        description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
        variant: "destructive",
      });
      return;
    }

    await onSubmit(data.email.toLowerCase().trim());
  };

  // Check email when it changes
  const checkEmail = async (email: string) => {
    if (email && email.includes('@') && email.includes('.')) {
      setIsEmailChecking(true);
      try {
        const exists = await checkEmailExists(email);
        setEmailExists(exists);
        if (exists) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Erro ao verificar email:", error);
      } finally {
        setIsEmailChecking(false);
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input 
                  placeholder="seu-email@exemplo.com" 
                  {...field} 
                  autoComplete="email"
                  onChange={(e) => {
                    field.onChange(e);
                    const email = e.target.value.trim().toLowerCase();
                    const delayDebounceFn = setTimeout(() => checkEmail(email), 600);
                    return () => clearTimeout(delayDebounceFn);
                  }}
                />
              </FormControl>
              <FormMessage />
              {emailExists && (
                <p className="text-sm text-red-500 mt-1">
                  Este email já está cadastrado. Use outro ou faça login.
                </p>
              )}
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading || isEmailChecking || emailExists}>
          {isLoading ? "Verificando..." : (isEmailChecking ? "Verificando email..." : "Criar conta")}
        </Button>
      </form>
    </Form>
  );
}
