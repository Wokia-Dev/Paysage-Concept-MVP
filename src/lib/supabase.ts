import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://cxcvngmniodppirpzzdz.supabase.co';

const supabaseKey = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_rm_SZIxXQeq1R3SqfUiTuA_f8dM1ett';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables d\'environnement Supabase manquantes.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);