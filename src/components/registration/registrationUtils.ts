
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if an email already exists in the Supabase auth system
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    // Check if email exists by trying to trigger a password reset
    // This is the most reliable way to check email existence in Supabase auth
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    
    // If no error, email exists in auth system
    if (!error) return true;
    
    // Check specific error messages to determine if email exists
    if (error.message.includes('Unable to validate email address') || 
        error.message.includes('Email not confirmed')) {
      return true; // Email exists but may not be confirmed
    }
    
    // As fallback, check profiles table
    const { data, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
      
    if (profileError) {
      console.error('Error checking profiles table:', profileError);
      return false;
    }
    
    return data && data.length > 0;
  } catch (error) {
    console.error('Error checking if email exists:', error);
    return false;
  }
}

/**
 * Register a new user using Supabase Auth
 */
export async function registerUser(email: string): Promise<boolean> {
  try {
    // Use Supabase auth signup with email confirmation
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: 'temporary-password-' + Math.random().toString(36), // Temporary password
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      }
    });
    
    if (error) {
      console.error('Error registering user:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in registerUser:', error);
    throw error;
  }
}

/**
 * Verify OTP code (not needed with current email confirmation flow)
 */
export async function verifyOtp(email: string, code: string): Promise<boolean> {
  try {
    // With email confirmation, this step is handled by Supabase automatically
    // when user clicks the confirmation link
    console.log('OTP verification not needed with email confirmation flow');
    return true;
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return false;
  }
}

/**
 * Update user password after email confirmation
 */
export async function updateUserPassword(password: string): Promise<boolean> {
  try {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      console.error('Error updating password:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserPassword:', error);
    throw error;
  }
}
