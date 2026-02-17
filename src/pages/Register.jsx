import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate, Link } from "react-router-dom";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

export default function Register() {
  const nav = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
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
    <div className="min-h-screen bg-black/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card title="Create account">
          <form className="space-y-3" onSubmit={submit}>
            <TextInput label="Full name" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
            <TextInput label="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />

            <TextInput
              label="Password"
              type={show ? "text" : "password"}
              value={pw}
              onChange={(e)=>setPw(e.target.value)}
              rightSlot={
                <button type="button" className="text-xs underline" onClick={()=>setShow(s=>!s)}>
                  {show ? "Hide" : "Show"}
                </button>
              }
            />

            <TextInput
              label="Confirm password"
              type={show ? "text" : "password"}
              value={pw2}
              onChange={(e)=>setPw2(e.target.value)}
            />

            <Button type="submit">Register</Button>
            <p className="text-sm">{msg}</p>

            <p className="text-sm">
              Already have an account?{" "}
              <Link className="underline" to="/login">Login</Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  );
}
