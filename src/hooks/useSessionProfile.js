import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";

function normalizeRole(r) {
  return String(r || "user").toLowerCase();
}

export function isPrivilegedRole(role) {
  const r = normalizeRole(role);
  return r === "admin" || r === "superuser";
}

export default function useSessionProfile() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      const { data, error } = await supabase.auth.getSession();
      if (!alive) return;
      if (error) {
        setErr(error.message);
        setLoading(false);
        return;
      }
      setSession(data.session || null);

      const uid = data.session?.user?.id;
      if (!uid) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const profRes = await supabase
        .from("profiles")
        .select("id, full_name, email, role, avatar_path, created_at")
        .eq("id", uid)
        .single();

      if (!alive) return;
      if (profRes.error) {
        setErr(profRes.error.message);
        setProfile(null);
      } else {
        setProfile({ ...profRes.data, role: normalizeRole(profRes.data?.role) });
      }

      setLoading(false);
    }

    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const privileged = useMemo(() => isPrivilegedRole(profile?.role), [profile?.role]);

  return { loading, session, profile, privileged, err };
}

