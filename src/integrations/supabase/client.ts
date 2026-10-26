// Supabase client — only initialized when credentials are provided via environment variables.
// When running locally without a .env file, the client is a no-op stub so the rest of
// the app can still import this module without crashing.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/** True when Supabase credentials have been provided via environment variables. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL) && Boolean(SUPABASE_PUBLISHABLE_KEY);

// Only create the real client when we have valid credentials.
// Cast to the full type so consumers don't need to handle undefined.
export const supabase: SupabaseClient<Database> = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!)
  : ({} as SupabaseClient<Database>);