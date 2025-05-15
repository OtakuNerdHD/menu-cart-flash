
import { z } from "zod";
import { useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Define verification code schema
const verificationCodeSchema = z.object({
  code: z.string().length(6, { message: "O código deve ter 6 dígitos." }),
});

type VerificationCodeFormProps = {
  email: string;
  onSubmit: (code: string) => Promise<void>;
  onResendCode: () => Promise<void>;
  onPrevious: () => void;
  isLoading: boolean;
  canResend: boolean;
};

export function VerificationCodeForm({ 
  email, 
  onSubmit, 
  onResendCode, 
  onPrevious, 
  isLoading,
  canResend
}: VerificationCodeFormProps) {
  const codeInputRef = useRef<HTMLInputElement>(null);
  
  const form = useForm<z.infer<typeof verificationCodeSchema>>({
    resolver: zodResolver(verificationCodeSchema),
    defaultValues: {
      code: "",
    },
  });

  const handleSubmit = async (data: z.infer<typeof verificationCodeSchema>) => {
    await onSubmit(data.code);
  };

  // Focus on the code input when the component mounts
  useEffect(() => {
    if (codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="text-center mb-4">
          <p>Enviamos um código de verificação para:</p>
          <p className="font-semibold">{email}</p>
        </div>
        <FormField
          control={form.control}
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
          <Button type="button" variant="ghost" size="sm" onClick={onPrevious} className="text-sm">
            Voltar
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={onResendCode}
            disabled={isLoading || !canResend}
            className="text-sm"
          >
            Reenviar código
          </Button>
        </div>
      </form>
    </Form>
  );
}
