import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-supabase') || supabaseAnonKey.includes('your-supabase')) {
  if (typeof window !== 'undefined') {
    console.warn(
      '⚠️ Supabase credentials are missing or using placeholder values. ' +
      'Please update your .env.local file with real credentials from your Supabase project dashboard.'
    );
  }
}

const isPlaceholder = 
  !supabaseUrl || 
  !supabaseAnonKey || 
  supabaseUrl.includes('your-supabase') || 
  supabaseAnonKey.includes('your-supabase');

export const isSupabaseConfigured = !isPlaceholder;

// Export a proxy object if not configured so the app can boot successfully 
// and show a UI warning instead of crashing during module evaluation.
export const supabase = isPlaceholder
  ? new Proxy({} as any, {
      get(target, prop) {
        if (prop === 'channel') {
          return () => ({
            on: () => ({ subscribe: () => ({}) }),
          });
        }
        return () => {
          throw new Error(
            'Supabase credentials are not configured. Please edit .env.local and add your real credentials.'
          );
        };
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey);

