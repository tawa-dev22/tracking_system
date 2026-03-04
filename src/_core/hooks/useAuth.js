import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase, assertSupabaseConfigured } from "@/lib/supabase";

export function useAuth(options) {
  const { redirectOnUnauthenticated = false, redirectPath = "/" } =
    options ?? {};

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    assertSupabaseConfigured();
    let unsub = () => {};
    (async () => {
      try {
        setLoading(true);
        if (!supabase) {
          setUser(null);
          return;
        }
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          setError(error);
        }
        setUser(data?.user ?? null);
      } finally {
        setLoading(false);
      }
      unsub = supabase?.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      })?.data?.subscription?.unsubscribe ?? (() => {});
    })();
    return () => {
      try { unsub(); } catch {}
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      if (!supabase) return;
      await supabase.auth.signOut();
      setUser(null);
    } catch (e) {
      setError(e);
    }
  }, []);

  const state = useMemo(() => {
    try {
      localStorage.setItem(
        "manus-runtime-user-info",
        JSON.stringify(user)
      );
    } catch {}
    return {
      user,
      loading,
      error,
      isAuthenticated: Boolean(user),
    };
  }, [user, loading, error]);

  useEffect(() => {
    if (!redirectOnUnauthenticated) return;
    if (loading) return;
    if (state.user) return;
    if (typeof window === "undefined") return;
    if (window.location.pathname === redirectPath) return;

    window.location.href = redirectPath;
  }, [redirectOnUnauthenticated, redirectPath, loading, state.user]);

  return {
    ...state,
    refresh: async () => {
      if (!supabase) return;
      const { data, error } = await supabase.auth.getUser();
      if (error) setError(error);
      setUser(data?.user ?? null);
    },
    logout,
  };
}
