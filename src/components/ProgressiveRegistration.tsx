
// Corrigindo o erro TS2589: Type instantiation is excessively deep and possibly infinite
import { z } from "zod";
import { useState, useRef, useEffect } from "react";
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

  /**
   * Verifica se um e-mail já existe no Supabase
   * Retorna true se o e-mail já existe, false caso contrário
   */
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      setIsEmailChecking(true);
      console.log("Verificando se o e-mail existe:", email);

      // Abordagem mais segura: tentar fazer login com o e-mail
      const { data: signInData, error: signInError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false // Não queremos criar usuário, só verificar
        }
      });

      // Se não houver erro, o e-mail existe
      if (!signInError) {
        console.log("E-mail já existe (verificado via OTP):", email);
        return true;
      }

      // Verificar a mensagem específica de erro para determinar se o e-mail existe
      if (signInError) {
        // Se o erro for "User not found", então o e-mail não existe
        if (signInError.message.includes("User not found") || 
            signInError.message.includes("user not found")) {
          console.log("E-mail não existe (confirmado via OTP):", email);
          return false;
        }
        
        // Se o erro for outro, provavelmente o e-mail existe
        console.log("E-mail possivelmente existe (baseado no erro de OTP):", signInError.message);
        
        // Verificação adicional para confirmar
        const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);
        
        if (userData?.user) {
          console.log("E-mail confirmado como existente:", email);
          return true;
        }
      }
      
      // Usando a API getUser para verificar se o e-mail existe
      const { data, error } = await supabase.auth.getUser();
      
      if (error) {
        console.log("Erro ao obter usuário atual:", error.message);
      } else if (data?.user?.email === email) {
        console.log("E-mail corresponde ao usuário logado:", email);
        return true;
      }
      
      // Última alternativa: verificar na tabela de perfis
      const { data: profileData } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email);
      
      if (profileData && profileData.length > 0) {
        console.log("E-mail encontrado na tabela de perfis:", email);
        return true;
      }
      
      console.log(`E-mail ${email} parece não existir após verificações`);
      return false;
    } catch (err) {
      console.error("Erro ao verificar e-mail:", err);
      return false;
    } finally {
      setIsEmailChecking(false);
    }
  };

  // Função melhorada para enviar código OTP
  const sendOTP = async (email: string): Promise<boolean> => {
    console.log("Enviando OTP para:", email);
    
    try {
      // Verificar se já enviamos um OTP recentemente para evitar spam
      const currentTime = Date.now();
      if (otpSent && currentTime - otpSentTimestamp < 60000) { // 1 minuto
        const remainingTime = Math.ceil((60000 - (currentTime - otpSentTimestamp)) / 1000);
        toast({
          title: "Aguarde um momento",
          description: `Você poderá enviar um novo código em ${remainingTime} segundos`,
          variant: "destructive"
        });
        return false;
      }

      // Verificar se o e-mail já está registrado
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
      
      // Tenta enviar o OTP com opção para criar usuário se não existir
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true, // Permite criar usuário se não existir
        }
      });
      
      if (error) {
        console.error("Erro ao enviar OTP:", error);
        toast({
          title: "Erro ao enviar código",
          description: error.message || "Não foi possível enviar o código de verificação. Tente novamente.",
          variant: "destructive",
        });
        return false;
      }
      
      console.log("OTP enviado com sucesso para:", email);
      setOtpSent(true);
      setOtpSentTimestamp(currentTime);
      
      return true;
    } catch (error) {
      console.error("Erro ao enviar OTP:", error);
      toast({
        title: "Erro ao enviar código",
        description: "Ocorreu um erro ao enviar o código de verificação. Tente novamente.",
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
        
        // Enviar OTP para o e-mail fornecido
        const otpSent = await sendOTP(email);
        
        if (otpSent) {
          setFormData({ ...formData, email });
          toast({
            title: "Código enviado",
            description: "Verifique sua caixa de entrada e insira o código de verificação.",
          });
          nextStep();
        }
      } catch (error) {
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
                          onChange={async (e) => {
                            field.onChange(e);
                            // Verificação quando o usuário para de digitar por um momento
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
                  {isLoading ? "Verificando..." : (isEmailChecking ? "Verificando email..." : "Enviar código")}
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
                    onClick={() => sendOTP(formData.email)}
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
