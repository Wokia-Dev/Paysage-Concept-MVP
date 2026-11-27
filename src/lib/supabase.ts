import { createClient } from '@supabase/supabase-js';

const env = typeof import.meta !== 'undefined' && typeof import.meta.env !== 'undefined'
  ? import.meta.env
  : undefined;

const directSupabaseUrl =
  env?.VITE_SUPABASE_URL ||
  'https://cxcvngmniodppirpzzdz.supabase.co';

const isBrowserDevProxy =
  Boolean(env?.DEV) &&
  typeof window !== 'undefined' &&
  typeof window.location?.origin === 'string' &&
  window.location.origin.startsWith('http');

const normalizedBase = (env?.BASE_URL || '/').replace(/\/$/, '');

const supabaseUrl = isBrowserDevProxy
  ? `${window.location.origin}${normalizedBase}/supabase-proxy`
  : directSupabaseUrl;

const supabaseKey =
  env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_rm_SZIxXQeq1R3SqfUiTuA_f8dM1ett';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Variables d\'environnement Supabase manquantes.');
}

const projectRef = new URL(directSupabaseUrl).hostname.split('.')[0] || 'paysage';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storageKey: `sb-${projectRef}-auth-token`,
  },
});
