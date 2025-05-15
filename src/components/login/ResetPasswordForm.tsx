
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ResetPasswordFormProps {
  onSetActiveTab: (tab: string) => void;
}

export const ResetPasswordForm = ({ onSetActiveTab }: ResetPasswordFormProps) => {
  const [isResetting, setIsResetting] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetEmail || !resetEmail.includes('@')) {
      toast({
        title: "Email inválido",
        description: "Por favor, informe um email válido.",
        variant: "destructive"
      });
      return;
    }
    
    setIsResetting(true);
    
    try {
      // Enviar email de recuperação de senha
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: window.location.origin + '/reset-password',
      });
      
      if (error) throw error;
      
      setResetSent(true);
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    } catch (error: any) {
      console.error('Erro ao enviar email de recuperação:', error);
      toast({
        title: "Erro ao enviar email",
        description: error.message || "Não foi possível enviar o email de recuperação.",
        variant: "destructive"
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-4">
      {resetSent ? (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-md p-4 text-sm text-green-800">
            <p>Email enviado com sucesso!</p>
            <p className="mt-2">Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.</p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => {
            setResetSent(false);
            setResetEmail('');
          }}>
            Enviar para outro email
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onSetActiveTab('login')}>
            Voltar para o login
          </Button>
        </div>
      ) : (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
              <Input
                id="reset-email"
                type="email"
                placeholder="seu@email.com"
                className="pl-10"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
              />
            </div>
          </div>
          
          <Button type="submit" className="w-full" disabled={isResetting}>
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : "Enviar email de recuperação"}
          </Button>

          <div className="text-center mt-4">
            <p className="text-sm text-gray-500">
              Lembrou sua senha? <Button variant="link" className="p-0" onClick={() => onSetActiveTab('login')}>Fazer login</Button>
            </p>
          </div>
        </form>
      )}
    </div>
  );
};
