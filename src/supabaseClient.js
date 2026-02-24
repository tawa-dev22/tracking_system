import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file or hosting provider settings."
  );
}

/**
 * Supabase client configured with:
 * - JWT token auto-refresh (refreshes before expiry automatically)
 * - Persistent session via localStorage (survives page reloads and browser restarts)
 * - detectSessionInUrl: handles magic links, OAuth redirects, and password resets
 * - flowType: pkce for secure token exchange (prevents CSRF attacks)
 * - Load balancing: exponential backoff retry on server errors (5xx)
 */
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    // Persist the JWT session across page reloads and browser restarts
    persistSession: true,
    // Store session in localStorage so it survives refreshes
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    // Automatically refresh the JWT token before it expires
    autoRefreshToken: true,
    // Detect session from URL (for magic links, OAuth, password reset links)
    detectSessionInUrl: true,
    // Use PKCE flow for more secure token exchange
    flowType: "pkce",
  },
  // Global fetch options for load balancing: retry on transient server failures
  global: {
    fetch: async (url, options = {}) => {
      const MAX_RETRIES = 3;
      let lastError;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const response = await fetch(url, options);
          // Only retry on server errors (5xx), not client errors (4xx)
          if (response.ok || response.status < 500) return response;
          lastError = new Error(`HTTP ${response.status}`);
        } catch (err) {
          lastError = err;
        }
        // Exponential backoff: 200ms, 400ms, 800ms between retries
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((r) => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
      }
      throw lastError;
    },
  },
});

/**
 * Helper: get the current JWT access token for use in API/Edge Function calls
 */
export async function getAccessToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/**
 * Helper: check if the current session is valid and not expired
 * Returns false if session is missing or expires within 60 seconds
 */
export async function isSessionValid() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session) return false;
  const expiresAt = data.session.expires_at;
  if (!expiresAt) return true;
  // Valid if more than 60 seconds remaining
  return Date.now() / 1000 < expiresAt - 60;
}
