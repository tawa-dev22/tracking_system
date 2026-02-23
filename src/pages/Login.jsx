import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import Button from "../Components/ui/Button";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [resetMsg, setResetMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("Signing in...");
    setResetMsg("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pw,
    });

    if (error) return setMsg("❌ " + error.message);

    const uid = data?.user?.id;
    if (!uid) {
      nav("/");
      return;
    }

    setMsg("Checking role...");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", uid)
      .single();

    const role = String(profile?.role || "user").toLowerCase();

    if (role === "admin" || role === "superuser") {
      nav("/admin");
    } else {
      nav("/");
    }
  }

  async function sendReset() {
    setResetMsg("");
    if (!email) {
      setResetMsg("❌ Enter your email first");
      return;
    }

    setResetMsg("Sending reset email...");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/change-password`,
    });

    if (error) {
      setResetMsg("❌ " + error.message);
    } else {
      setResetMsg("✅ Reset link sent. Check your email.");
    }
  }

  return (
    <div className="min-h-screen bg-BLUE flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-white">Fault Tracking</div>
          <p className="text-white/60 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-lg font-bold text-white mb-4">Login</h2>

          <form className="space-y-4" onSubmit={submit}>
            {/* Email */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-white/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="you@example.com"
              />
            </div>

            {/* Password */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-white/80">Password</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-16 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-white/60 underline"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Links row */}
            <div className="flex items-center justify-between text-xs text-white/60">
              <button
                type="button"
                onClick={sendReset}
                className="underline hover:text-white"
              >
                Forgot password?
              </button>

              <span>
                No account?{" "}
                <Link className="underline hover:text-white" to="/register">
                  Register
                </Link>
              </span>
            </div>

            <Button type="submit" className="bg-white text-BLUE hover:bg-white/90">Login</Button>

            {msg && <p className="text-sm text-white/80">{msg}</p>}
            {resetMsg && <p className="text-xs text-white/60">{resetMsg}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
