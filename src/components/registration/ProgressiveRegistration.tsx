
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { EmailForm } from "./EmailForm";
import { checkEmailExists } from "./registrationUtils";
import { supabase } from '@/integrations/supabase/client';

export function ProgressiveRegistration() {
  const [isLoading, setIsLoading] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const { toast } = useToast();

  // Handle email form submission with Supabase Auth
  const handleEmailSubmit = async (email: string) => {
    setIsLoading(true);
    try {
      // First check if email already exists
      const emailExists = await checkEmailExists(email);
      
      if (emailExists) {
        toast({
          title: "Email já cadastrado",
          description: "Este email já está sendo utilizado. Por favor, faça login ou use outro email.",
          variant: "destructive",
        });
        return;
      }

      // Register user with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: 'temp-' + Math.random().toString(36), // Temporary password
        options: {
          emailRedirectTo: window.location.origin + '/auth/callback',
        }
      });
      
      if (error) {
        throw error;
      }
      
      setRegistrationComplete(true);
      toast({
        title: "Conta criada com sucesso",
        description: "Verifique sua caixa de entrada e clique no link de confirmação para ativar sua conta.",
        variant: "default"
      });

      // Redirect to login after 3 seconds
      setTimeout(() => {
        window.location.href = "/login?tab=login";
      }, 3000);
      
    } catch (error: any) {
      console.error("Erro no processo de registro:", error);
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro ao criar sua conta. Por favor, tente novamente.",
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
          {!registrationComplete ? (
            <EmailForm 
              onSubmit={handleEmailSubmit}
              isLoading={isLoading}
            />
          ) : (
            <div className="space-y-4 text-center">
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h3 className="text-green-800 font-medium">Cadastro realizado!</h3>
                <p className="text-green-700 text-sm mt-2">
                  Um email de confirmação foi enviado para você. Clique no link para ativar sua conta.
                </p>
              </div>
              <p className="text-sm text-gray-500">
                Você será redirecionado para a página de login em alguns segundos...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Export as default and named component for compatibility
export default ProgressiveRegistration;
