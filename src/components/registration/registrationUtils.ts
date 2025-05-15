
import { supabase } from "@/integrations/supabase/client";

// Verify if an email already exists in Supabase
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    console.log("Verificando se o e-mail existe:", email);

    // First method: Check profiles table
    const { data: profileData } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (profileData) {
      console.log("E-mail encontrado na tabela profiles:", email);
      return true;
    }

    // Second method: Try login with invalid credentials
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: `random-password-${Date.now()}`
      });

      if (signInError && signInError.message.includes("Invalid login credentials")) {
        console.log("E-mail possivelmente existe (tentativa de login falhou com Invalid credentials)");
        return true;
      }
    } catch (err) {
      console.log("Erro ao tentar login:", err);
    }

    // Third method: Try OTP without user creation
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      });

      if (otpError) {
        if (otpError.message.includes("User not found") || 
            otpError.message.includes("user not found")) {
          console.log("E-mail não existe (confirmado via OTP):", email);
          return false;
        }
        
        if (otpError.message.includes("Signups not allowed")) {
          console.log("Email já existe (baseado no erro):", otpError.message);
          return true;
        }
      }
    } catch (err) {
      console.log("Erro ao verificar com OTP:", err);
    }

    // If we got here without confirming, assume email doesn't exist
    console.log("E-mail não encontrado após todas as verificações:", email);
    return false;
  } catch (err) {
    console.error("Erro ao verificar e-mail:", err);
    return false; // In case of error, assume it doesn't exist to allow registration
  }
}

// Register a new user
export async function registerUser(email: string): Promise<boolean> {
  console.log("Registrando usuário com email:", email);
  
  try {
    // Verify again if the email already exists
    const emailAlreadyExists = await checkEmailExists(email);
    
    if (emailAlreadyExists) {
      console.log("E-mail já cadastrado:", email);
      return false;
    }
    
    // Create user directly (signUp instead of signInWithOtp)
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
      return false;
    }
    
    console.log("Usuário criado com sucesso, enviando email de redefinição de senha");
    
    // After creating user, send password reset email
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login?tab=login',
    });
    
    if (resetError) {
      console.error("Erro ao enviar email de verificação:", resetError);
      return false;
    }
    
    console.log("Email de verificação enviado com sucesso para:", email);
    return true;
  } catch (error: any) {
    console.error("Erro ao criar conta:", error);
    return false;
  }
}

// Verify OTP code
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    if (error) {
      console.error("Erro ao verificar código:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Erro ao verificar código:", error);
    return false;
  }
}

// Update user password
export async function updateUserPassword(password: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error("Erro ao definir nova senha:", error);
      return false;
    }

    // Create user profile if successful
    if (data.user) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: data.user.id,
              email: data.user.email,
              username: data.user.email?.split('@')[0] || 'usuário',
              name: data.user.email?.split('@')[0] || 'usuário'
            }
          ]);
          
        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
        }
      } catch (profileErr) {
        console.error("Erro ao inserir perfil:", profileErr);
      }
    }

    return true;
  } catch (error) {
    console.error("Erro ao definir nova senha:", error);
    return false;
  }
}
