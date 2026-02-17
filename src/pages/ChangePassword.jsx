import { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

export default function ChangePassword() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");

  async function change() {
    setMsg("");
    if (pw.length < 6) return setMsg("❌ Password must be at least 6 characters");
    if (pw !== pw2) return setMsg("❌ Passwords do not match");

    setMsg("Updating...");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return setMsg("❌ " + error.message);

    setMsg("✅ Password updated");
    nav("/");
  }

  return (
    <PageShell title="Change Password" actions={<Button variant="ghost" onClick={()=>nav("/")}>Back</Button>}>
      <Card title="Update your password">
        <div className="grid gap-3 max-w-md">
          <TextInput
            label="New password"
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
            label="Confirm new password"
            type={show ? "text" : "password"}
            value={pw2}
            onChange={(e)=>setPw2(e.target.value)}
          />
          <Button onClick={change}>Change password</Button>
          <p className="text-sm">{msg}</p>
        </div>
      </Card>
    </PageShell>
  );
}
