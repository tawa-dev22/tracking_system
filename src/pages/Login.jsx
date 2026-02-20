import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
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
    <div className="min-h-screen bg-black/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card title="Login">
          <form className="space-y-4" onSubmit={submit}>
            <TextInput
              label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <TextInput
              label="Password"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              rightSlot={
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => setShow((s) => !s)}
                >
                  {show ? "Hide" : "Show"}
                </button>
              }
            />

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={sendReset}
                className="underline text-black"
              >
                Forgot password?
              </button>

              <span>
                No account?{" "}
                <Link className="underline" to="/register">
                  Register
                </Link>
              </span>
            </div>

            <Button type="submit">Login</Button>

            <p className="text-sm">{msg}</p>
            {resetMsg && <p className="text-xs mt-1">{resetMsg}</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
