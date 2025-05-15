
import { supabase } from '@/integrations/supabase/client';

/**
 * Checks if an email already exists in the Supabase auth or profiles table
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    // First check auth.users for direct match
    const { count: authCount, error: authError } = await supabase
      .rpc('check_email_exists', { email_to_check: email });
      
    if (authError) throw authError;
    
    // If found in auth system, email exists
    if (authCount && authCount > 0) return true;
    
    // As fallback, check profiles table
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
      
    if (error) throw error;
    
    // Return true if email found in either check
    return (data && data.length > 0) || false;
  } catch (error) {
    console.error('Error checking if email exists:', error);
    return false;
  }
}
