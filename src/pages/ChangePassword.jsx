import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

function normalizeRole(r) {
  return String(r || "user").toLowerCase();
}
function isPrivileged(r) {
  const v = normalizeRole(r);
  return v === "admin" || v === "superuser";
}

function getStrength(pw) {
  const p = pw || "";
  let score = 0;

  if (p.length >= 8) score++;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p)) score++;

  if (p.length === 0) return { label: "", hint: "", level: 0 };
  if (score <= 1)
    return { label: "Weak", hint: "Use 12+ chars, mix letters & numbers.", level: 1 };
  if (score <= 3)
    return { label: "Medium", hint: "Add symbols or mixed case for stronger security.", level: 2 };
  return { label: "Strong", hint: "Nice — this is a strong password.", level: 3 };
}

export default function ChangePassword() {
  const nav = useNavigate();
  const location = useLocation();

  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const [msg, setMsg] = useState("");
  const [role, setRole] = useState("user");
  const [loadingRole, setLoadingRole] = useState(true);

  // ✅ role-aware guard (used for fallback redirect)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingRole(true);
      try {
        // Give Supabase a moment to process recovery token from URL if present
        if (window.location.hash.includes("access_token")) {
          await new Promise(r => setTimeout(r, 500));
        }

        const { data: sessData, error: sessErr } = await supabase.auth.getSession();
        const uid = sessData?.session?.user?.id;

        if (sessErr || !uid) {
          nav("/login", { replace: true });
          return;
        }

        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", uid)
          .single();

        if (!alive) return;

        if (profErr) {
          setRole("user");
        } else {
          setRole(normalizeRole(prof?.role));
        }
      } catch {
        if (!alive) return;
        setRole("user");
      } finally {
        // ✅ no "return" in finally — just guard the state update
        if (alive) setLoadingRole(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [nav]);

  // ✅ redirect: explicit state wins; else role decides
  const redirectTo = useMemo(() => {
    if (location.state?.redirectTo) return location.state.redirectTo;
    return isPrivileged(role) ? "/admin" : "/";
  }, [location.state, role]);

  const strength = useMemo(() => getStrength(pw1), [pw1]);

  async function save(e) {
    e.preventDefault();
    setMsg("");

    if (pw1.length < 6) return setMsg("❌ Password must be at least 6 chars");
    if (pw1 !== pw2) return setMsg("❌ Passwords do not match");

    setMsg("Updating password...");

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ Password updated");
    setPw1("");
    setPw2("");

    nav(redirectTo, { replace: true });
  }

  return (
    <PageShell
      title="Change Password"
      actions={
        <Button
          variant="ghost"
          onClick={() => nav(redirectTo, { replace: true })}
          disabled={loadingRole}
        >
          Back
        </Button>
      }
    >
      <Card title="Update your password">
        <form onSubmit={save} className="grid gap-3 max-w-lg">
          {/* New password + show/hide */}
          <div className="grid gap-2">
            <TextInput
              label="New password"
              type={show1 ? "text" : "password"}
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              placeholder="Use 12+ characters if possible"
            />

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="text-sm underline"
                onClick={() => setShow1((s) => !s)}
              >
                {show1 ? "Hide" : "Show"} new password
              </button>

              {strength.label && (
                <span className="text-sm">
                  Strength: <b>{strength.label}</b>
                </span>
              )}
            </div>

            {/* Strength bar (no hard-coded colors) */}
            {strength.level > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <div
                  className={`h-2 rounded-full bg-black/20 ${
                    strength.level >= 1 ? "opacity-100" : "opacity-30"
                  }`}
                />
                <div
                  className={`h-2 rounded-full bg-black/20 ${
                    strength.level >= 2 ? "opacity-100" : "opacity-30"
                  }`}
                />
                <div
                  className={`h-2 rounded-full bg-black/20 ${
                    strength.level >= 3 ? "opacity-100" : "opacity-30"
                  }`}
                />
              </div>
            )}

            {strength.hint && <p className="text-xs text-black/60">{strength.hint}</p>}
          </div>

          {/* Confirm password + show/hide */}
          <div className="grid gap-2">
            <TextInput
              label="Confirm new password"
              type={show2 ? "text" : "password"}
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
            />
            <button
              type="button"
              className="text-sm underline w-fit"
              onClick={() => setShow2((s) => !s)}
            >
              {show2 ? "Hide" : "Show"} confirm password
            </button>
          </div>

          <Button type="submit" disabled={loadingRole}>
            Save
          </Button>

          {msg && <p className="text-sm">{msg}</p>}
        </form>
      </Card>
    </PageShell>
  );
}
