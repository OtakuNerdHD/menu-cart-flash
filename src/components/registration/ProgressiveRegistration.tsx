
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { EmailForm } from "./EmailForm";
import { VerificationCodeForm } from "./VerificationCodeForm";
import { PasswordForm } from "./PasswordForm";
import { registerUser, verifyOtp, updateUserPassword } from "./registrationUtils";

export function ProgressiveRegistration() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    code: "",
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentTimestamp, setOtpSentTimestamp] = useState(0);
  const { toast } = useToast();

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  // Check if enough time has passed to resend OTP
  const canResendOtp = () => {
    return !otpSent || (Date.now() - otpSentTimestamp >= 60000);
  };

  // Handle email form submission
  const handleEmailSubmit = async (email: string) => {
    setIsLoading(true);
    try {
      const registered = await registerUser(email);
      
      if (registered) {
        setFormData({ ...formData, email });
        setOtpSent(true);
        setOtpSentTimestamp(Date.now());
        toast({
          title: "Conta criada com sucesso",
          description: "Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.",
          variant: "default"
        });
        // Redirect to login after successful registration
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
  };

  // Handle verification code form submission
  const handleCodeSubmit = async (code: string) => {
    setIsLoading(true);
    try {
      const verified = await verifyOtp(formData.email, code);

      if (verified) {
        setFormData({ ...formData, code });
        toast({
          title: "Código verificado",
          description: "Seu código foi verificado com sucesso. Defina sua senha para concluir o cadastro.",
        });
        nextStep();
      } else {
        toast({
          title: "Código inválido",
          description: "O código de verificação está incorreto. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
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
  };

  // Handle password form submission
  const handlePasswordSubmit = async (password: string) => {
    setIsLoading(true);
    try {
      const updated = await updateUserPassword(password);

      if (updated) {
        toast({
          title: "Cadastro concluído",
          description: "Sua conta foi criada com sucesso! Agora você pode fazer login.",
        });
        
        // Redirect to login page
        window.location.href = "/login?tab=login";
      } else {
        toast({
          title: "Erro ao definir senha",
          description: "Não foi possível definir a nova senha. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
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
  };

  // Handle resend verification code
  const handleResendCode = async () => {
    if (!canResendOtp()) {
      const remainingTime = Math.ceil((60000 - (Date.now() - otpSentTimestamp)) / 1000);
      toast({
        title: "Aguarde um momento",
        description: `Você poderá enviar um novo cadastro em ${remainingTime} segundos`,
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const registered = await registerUser(formData.email);
      
      if (registered) {
        setOtpSent(true);
        setOtpSentTimestamp(Date.now());
        toast({
          title: "Código reenviado",
          description: "Um novo código de verificação foi enviado para seu email.",
        });
      }
    } catch (error) {
      console.error("Erro ao reenviar código:", error);
      toast({
        title: "Erro ao reenviar código",
        description: "Não foi possível reenviar o código. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-6 flex justify-center items-start">
      <Card className="w-full max-w-md">
        <CardContent className="grid gap-4">
          {step === 1 && (
            <EmailForm 
              onSubmit={handleEmailSubmit}
              isLoading={isLoading}
            />
          )}

          {step === 2 && (
            <VerificationCodeForm 
              email={formData.email}
              onSubmit={handleCodeSubmit}
              onResendCode={handleResendCode}
              onPrevious={prevStep}
              isLoading={isLoading}
              canResend={canResendOtp()}
            />
          )}

          {step === 3 && (
            <PasswordForm 
              onSubmit={handlePasswordSubmit}
              onPrevious={prevStep}
              isLoading={isLoading}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export as default and named component for compatibility
export default ProgressiveRegistration;
