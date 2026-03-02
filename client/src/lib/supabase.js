import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && key
  ? createClient(url, key)
  : null;

export function assertSupabaseConfigured() {
  if (!supabase) {
    console.warn(
      "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Auth features will be disabled."
    );
  }
  return Boolean(supabase);
}
