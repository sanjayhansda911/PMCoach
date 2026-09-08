import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith('https://') &&
    supabaseUrl !== 'https://your-project-id.supabase.co' &&
    supabaseAnonKey !== 'your-supabase-anon-key'
  );
};

// Initialize real client if configured, otherwise create a dummy fallback
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
