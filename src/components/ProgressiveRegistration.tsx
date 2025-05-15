
// Corrigindo o erro TS2589: Type instantiation is excessively deep and possibly infinite
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast"; // Import directly from the hooks folder
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
  const [isEmailChecking, setIsEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    password: "",
  });
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentTimestamp, setOtpSentTimestamp] = useState(0);

  // Use the hook directly from the proper location
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

  /**
   * Verifica se um e-mail já existe no Supabase
   * Retorna true se o e-mail já existe, false caso contrário
   */
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      setIsEmailChecking(true);
      console.log("Verificando se o e-mail existe:", email);

      // Verificar através da tentativa de registro sem criar o usuário
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });

      // Se o e-mail já existe, podemos receber diferentes erros
      if (error) {
        if (error.message.includes("User not found") || 
            error.message.includes("user not found")) {
          // User not found significa que o email não existe
          console.log("E-mail não existe (confirmado via OTP):", email);
          return false;
        }
        
        if (error.message.includes("Signups not allowed")) {
          // Signups not allowed para OTP geralmente significa que o email já existe
          console.log("Email já existe (baseado no erro):", error.message);
          return true;
        }
      }

      // Método adicional: consulte a tabela profiles
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('email', email)
          .maybeSingle();
        
        if (profileData) {
          console.log("E-mail encontrado na tabela profiles:", email);
          return true;
        }
      } catch (err) {
        console.log("Erro ao verificar tabela profiles:", err);
      }

      // Se chegamos até aqui sem uma confirmação clara, tentamos um login com senha aleatória
      try {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password: `random-password-${Date.now()}`
        });

        // Se o erro for "Invalid login credentials", o e-mail provavelmente existe
        if (signInError && signInError.message.includes("Invalid login credentials")) {
          console.log("E-mail possivelmente existe (tentativa de login falhou com Invalid credentials)");
          return true;
        }
      } catch (err) {
        console.log("Erro ao tentar login:", err);
      }

      // Se chegou até aqui e não conseguiu confirmar, assumimos que o email não existe
      console.log("E-mail não encontrado após todas as verificações:", email);
      return false;
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
      return false; // Em caso de erro, assumir que não existe para permitir o registro
    } finally {
      setIsEmailChecking(false);
    }
  };

  // Função para registro direto (sem OTP)
  const registerUser = async (email: string): Promise<boolean> => {
    console.log("Registrando usuário com email:", email);
    
    try {
      const currentTime = Date.now();
      if (otpSent && currentTime - otpSentTimestamp < 60000) {
        const remainingTime = Math.ceil((60000 - (currentTime - otpSentTimestamp)) / 1000);
        toast({
          title: "Aguarde um momento",
          description: `Você poderá enviar um novo cadastro em ${remainingTime} segundos`,
          variant: "destructive"
        });
        return false;
      }

      // Verificar novamente se o email já existe
      const emailAlreadyExists = await checkEmailExists(email);
      
      if (emailAlreadyExists) {
        console.log("E-mail já cadastrado:", email);
        setEmailExists(true);
        toast({
          title: "Email já cadastrado",
          description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
          variant: "destructive",
        });
        return false;
      }
      
      setEmailExists(false);

      // Vamos criar o usuário diretamente (signUp em vez de signInWithOtp)
      const tempPassword = `temp-password-${Math.random().toString(36).substring(2, 15)}`;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: tempPassword,
        options: {
          emailRedirectTo: window.location.origin + '/login?tab=login'
        }
      });

      if (signUpError) {
        console.error("Erro ao criar usuário:", signUpError);
        toast({
          title: "Erro ao criar conta",
          description: signUpError.message || "Não foi possível criar sua conta. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }
      
      console.log("Usuário criado com sucesso, enviando email de redefinição de senha");
      
      // Após criar usuário, enviamos email de redefinição de senha
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login?tab=login',
      });
      
      if (resetError) {
        console.error("Erro ao enviar email de verificação:", resetError);
        toast({
          title: "Erro ao enviar verificação",
          description: resetError.message || "Não foi possível enviar o email de verificação. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }
      
      console.log("Email de verificação enviado com sucesso para:", email);
      setOtpSent(true);
      setOtpSentTimestamp(currentTime);
      
      return true;
    } catch (error: any) {
      console.error("Erro ao criar conta:", error);
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Ocorreu um erro ao criar sua conta. Tente novamente.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleSubmit = async (data: any) => {
    console.log("handleSubmit chamado com:", data, "no passo:", step);

    if (step === 1) {
      setIsLoading(true);
      try {
        const email = data.email.toLowerCase().trim();
        
        // Verificar e-mail existente
        const emailRegistered = await checkEmailExists(email);
        
        if (emailRegistered) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
            variant: "destructive",
          });
          return;
        }
        
        // Registrar usuário diretamente (sem OTP)
        const registered = await registerUser(email);
        
        if (registered) {
          setFormData({ ...formData, email });
          toast({
            title: "Conta criada com sucesso",
            description: "Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.",
            variant: "default"
          });
          // Redirecionar para o login após cadastro bem-sucedido
          setTimeout(() => {
            window.location.href = "/login?tab=login";
          }, 3000);
        }
      } catch (error: any) {
        console.error("Erro no processo de verificação de e-mail:", error);
        toast({
          title: "Erro na verificação",
          description: "Ocorreu um erro ao verificar seu e-mail. Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Etapas abaixo são mantidas apenas para compatibilidade
    // já que o fluxo agora finaliza na etapa 1 com redirecionamento
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
          return;
        }

        setFormData({ ...formData, code: data.code });
        toast({
          title: "Código verificado",
          description: "Seu código foi verificado com sucesso. Defina sua senha para concluir o cadastro.",
        });
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
        // No passo final, definimos a senha para a conta
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
          return;
        }

        toast({
          title: "Cadastro concluído",
          description: "Sua conta foi criada com sucesso! Agora você pode fazer login.",
        });
        
        // Criar perfil do usuário para garantir que temos as informações corretas
        if (updateData.user) {
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert([
                { 
                  id: updateData.user.id,
                  email: updateData.user.email,
                  username: updateData.user.email?.split('@')[0] || 'usuário',
                  name: updateData.user.email?.split('@')[0] || 'usuário'
                }
              ]);
              
            if (profileError) {
              console.error("Erro ao criar perfil:", profileError);
            }
          } catch (profileErr) {
            console.error("Erro ao inserir perfil:", profileErr);
          }
        }
        
        // Redirecionar para a página de login
        window.location.href = "/login?tab=login";
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

  // Efeito para limpar os formulários quando o step muda
  useEffect(() => {
    if (step === 2 && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  return (
    <div className="py-6 flex justify-center items-start">
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
                        <Input 
                          placeholder="seu-email@exemplo.com" 
                          {...field} 
                          autoComplete="email"
                          onChange={(e) => {
                            field.onChange(e);
                            const email = e.target.value.trim().toLowerCase();
                            if (email && email.includes('@') && email.includes('.')) {
                              const delayDebounceFn = setTimeout(async () => {
                                const exists = await checkEmailExists(email);
                                setEmailExists(exists);
                                if (exists) {
                                  toast({
                                    title: "Email já cadastrado",
                                    description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
                                    variant: "destructive",
                                  });
                                }
                              }, 600);
                              return () => clearTimeout(delayDebounceFn);
                            }
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
          )}

          {step === 2 && (
            <Form {...codeForm}>
              <form onSubmit={codeForm.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="text-center mb-4">
                  <p>Enviamos um código de verificação para:</p>
                  <p className="font-semibold">{formData.email}</p>
                </div>
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
                          className="text-center text-lg tracking-widest"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Verificando..." : "Verificar código"}
                </Button>
                <div className="flex justify-between items-center pt-2">
                  <Button type="button" variant="ghost" size="sm" onClick={prevStep} className="text-sm">
                    Voltar
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => registerUser(formData.email)}
                    disabled={isLoading || (otpSent && Date.now() - otpSentTimestamp < 60000)}
                    className="text-sm"
                  >
                    Reenviar código
                  </Button>
                </div>
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
                        <Input type="password" {...field} autoComplete="new-password" />
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
                        <Input type="password" {...field} autoComplete="new-password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Salvando..." : "Concluir cadastro"}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={prevStep} className="text-sm">
                  Voltar
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Exporta como componente padrão e nomeado para compatibilidade
export default ProgressiveRegistration;
