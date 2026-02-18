import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const normalizeRole = (r) => String(r || "user").toLowerCase();
const isPrivileged = (r) => {
  const v = normalizeRole(r);
  return v === "superuser" || v === "admin";
};

export default function useAdminGuard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("user");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErrMsg("");

      try {
        const { data: sessData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) {
          if (!alive) return;
          setErrMsg("Session error: " + sessErr.message);
          nav("/login");
          return;
        }

        const uid = sessData?.session?.user?.id;
        if (!uid) {
          nav("/login");
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();

        if (profErr) {
          if (!alive) return;
          setErrMsg("Profile read error: " + profErr.message);
          nav("/");
          return;
        }

        const r = normalizeRole(prof?.role);
        if (!alive) return;
        setRole(r);

        if (!isPrivileged(r)) {
          nav("/");
          return;
        }
      } catch (e) {
        if (!alive) return;
        setErrMsg("Guard crash: " + String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [nav]);

  return { loading, role, errMsg, isPrivileged: isPrivileged(role) };
}
