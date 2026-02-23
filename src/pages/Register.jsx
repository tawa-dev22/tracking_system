import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import Button from "../Components/ui/Button";

export default function Register() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState("");

  async function submit(e) {
    e.preventDefault();
    setMsg("");

    if (pw.length < 6) return setMsg("❌ Password must be at least 6 characters");
    if (pw !== pw2) return setMsg("❌ Passwords do not match");

    setMsg("Creating account...");
    const { error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: { data: { full_name: fullName } },
    });

    if (error) return setMsg("❌ " + error.message);
    setMsg("✅ Account created. Now login.");
    nav("/login");
  }

  return (
    <div className="min-h-screen bg-BLUE flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / title */}
        <div className="text-center mb-6">
          <div className="text-3xl font-extrabold text-white">Fault Tracking</div>
          <p className="text-white/60 text-sm mt-1">Create a new account</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <h2 className="text-lg font-bold text-white mb-4">Register</h2>

          <form className="space-y-4" onSubmit={submit}>
            {/* Full name */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-white/80">Full name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                placeholder="John Doe"
              />
            </div>

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

            {/* Confirm password */}
            <div className="grid gap-1">
              <label className="text-sm font-medium text-white/80">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 pr-16 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-xs text-white/60 underline"
                  onClick={() => setShowConfirm((s) => !s)}
                >
                  {showConfirm ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <Button type="submit" className="bg-white text-black hover:bg-white/90">Register</Button>

            {msg && <p className="text-sm text-white/80">{msg}</p>}

            <p className="text-sm text-white/60">
              Already have an account?{" "}
              <Link className="underline hover:text-white" to="/login">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
