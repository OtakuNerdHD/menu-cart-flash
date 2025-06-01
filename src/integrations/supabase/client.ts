
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = "https://jzosgtmmjswjtjvibpye.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6b3NndG1tanN3anRqdmlicHllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MDkxNjQsImV4cCI6MjA1OTQ4NTE2NH0.Ky2APyH6-3v52zWQonNV9fJr9PG5L5oS9zaZe12IWp0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);
