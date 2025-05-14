// Corrigindo o erro TS2589: Type instantiation is excessively deep and possibly infinite
import { z } from "zod";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast"; // Usar a versão correta do hook
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.object({
  email: z.string().email({ message: "Por favor, insira um email válido." }),
});

const verificationCodeSchema = z.object({
  code: z.string().length(6, { message: "O código deve ter 6 dígitos." }),
});

const newPasswordSchema = z.object({
  password: z.string().min(8, { message: "A senha deve ter pelo menos 8 caracteres." }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"], // path of error
});

export function ProgressiveRegistration() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    password: "",
  });
  const codeInputRef = useRef<HTMLInputElement>(null);

  // Usando a versão correta do useToast para evitar recursão infinita
  const { toast } = useToast();

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: formData.email,
    },
  });

  const codeForm = useForm<z.infer<typeof verificationCodeSchema>>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      code: formData.code,
    },
  });

  const newPasswordForm = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: formData.password,
      confirmPassword: formData.password,
    },
  });

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  async function verifyEmail(email: string): Promise<boolean> {
    console.log("Verificando email:", email);
    try {
      // Simplesmente tenta enviar o código e verifica se há erro de duplicação
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false, // Não criar usuário, apenas verificar
        }
      });
      
      console.log("Resposta da verificação:", error ? error.message : "Sucesso");
      
      // Se o erro contém "already registered", o email já existe
      if (error && error.message && error.message.includes("already registered")) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Erro ao verificar email:", error);
      return false;
    }
  }

  const handleSubmit = async (data: any) => {
    console.log("handleSubmit chamado com:", data, "no passo:", step);

    if (step === 1) {
      setIsLoading(true);
      try {
        // Verificar se email já existe
        const emailExists = await verifyEmail(data.email);
        console.log("Email existe?", emailExists);
        
        if (emailExists) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Continua para o próximo passo se o email não existir
        setFormData({ ...formData, email: data.email });
        nextStep();
      } catch (error) {
        console.error("Erro ao verificar email:", error);
        toast({
          title: "Erro na verificação",
          description: "Não foi possível verificar o email. Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 2) {
      setIsLoading(true);
      try {
        const { data: authData, error } = await supabase.auth.verifyOtp({
          email: formData.email,
          token: data.code,
          type: 'email',
        });

        if (error) {
          console.error("Erro ao verificar código:", error);
          toast({
            title: "Código inválido",
            description: "O código de verificação está incorreto. Por favor, tente novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        setFormData({ ...formData, code: data.code });
        nextStep();
      } catch (error) {
        console.error("Erro ao verificar código:", error);
        toast({
          title: "Erro na verificação",
          description: "Não foi possível verificar o código. Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (step === 3) {
      setIsLoading(true);
      try {
        const { data: updateData, error } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (error) {
          console.error("Erro ao definir nova senha:", error);
          toast({
            title: "Erro ao definir senha",
            description: "Não foi possível definir a nova senha. Por favor, tente novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: "Senha atualizada",
          description: "Sua senha foi atualizada com sucesso!",
        });
        // Redirecionar ou atualizar o estado conforme necessário
      } catch (error) {
        console.error("Erro ao definir nova senha:", error);
        toast({
          title: "Erro ao definir senha",
          description: "Não foi possível definir a nova senha. Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
  };

  return (
    <div className="container py-12 flex justify-center items-start">
      <Card className="w-full max-w-md">
        <CardContent className="grid gap-4">
          {step === 1 && (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="seu-email@exemplo.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verificando..." : "Enviar código"}
                </Button>
              </form>
            </Form>
          )}

          {step === 2 && (
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={codeForm.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Verificação</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123456"
                          {...field}
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                          ref={codeInputRef}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verificando..." : "Verificar código"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={prevStep}>
                  Voltar
                </Button>
              </form>
            </Form>
          )}

          {step === 3 && (
            <Form {...newPasswordForm}>
              <form onSubmit={newPasswordForm.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={newPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={newPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Definir nova senha"}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
