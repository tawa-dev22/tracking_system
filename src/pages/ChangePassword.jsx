import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../supabaseClient";
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

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingRole(true);
      try {
        // Give Supabase a moment to process recovery token from URL if present
        if (window.location.hash.includes("access_token")) {
          await new Promise((r) => setTimeout(r, 500));
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
        if (alive) setLoadingRole(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [nav]);

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
    <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-white">Fault Tracking</div>
          <p className="text-white/60 text-sm mt-1">Change your password</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Update Password</h2>
            <Button
              variant="ghost"
              onClick={() => nav(redirectTo, { replace: true })}
              disabled={loadingRole}
            >
              Back
            </Button>
          </div>

          <form onSubmit={save} className="grid gap-4">
            {/* New password */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-white/80">New password</label>
              <div className="relative">
                <input
                  type={show1 ? "text" : "password"}
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  placeholder="Use 12+ characters if possible"
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-16 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-white/60 underline"
                  onClick={() => setShow1((s) => !s)}
                >
                  {show1 ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Strength indicator */}
            {strength.label && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>
                    Strength: <b>{strength.label}</b>
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div
                    className={`h-2 rounded-full ${
                      strength.level >= 1 ? "bg-white/60" : "bg-white/20"
                    }`}
                  />
                  <div
                    className={`h-2 rounded-full ${
                      strength.level >= 2 ? "bg-white/60" : "bg-white/20"
                    }`}
                  />
                  <div
                    className={`h-2 rounded-full ${
                      strength.level >= 3 ? "bg-white/60" : "bg-white/20"
                    }`}
                  />
                </div>
                {strength.hint && <p className="text-xs text-white/50">{strength.hint}</p>}
              </div>
            )}

            {/* Confirm password */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-white/80">Confirm new password</label>
              <div className="relative">
                <input
                  type={show2 ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-16 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-white/60 underline"
                  onClick={() => setShow2((s) => !s)}
                >
                  {show2 ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loadingRole}>
              Save Password
            </Button>

            {msg && <p className="text-sm text-white/80">{msg}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
