import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import useSessionProfile from "../hooks/useSessionProfile";
import { getAvatarUrlFromPath } from "../lib/avatar";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import SelectInput from "../Components/ui/SelectInput";
import Button from "../Components/ui/Button";

export default function CreateTicket() {
  const nav = useNavigate();
  const { loading, session, profile } = useSessionProfile();
  const uid = session?.user?.id;
  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    username: "",
    order_number: "",
    olt_exchange: "",
    job_received_by: "",
    received_from: "",
    done_by: "",
    faults_type: "",
    installation_migration: "",
    time_taken: "",
  });

  // Autofill "done_by" with user's full name on component mount or when profile loads
  useEffect(() => {
    if (profile?.full_name) {
      setForm(prev => ({ ...prev, done_by: profile.full_name }));
    }
  }, [profile?.full_name]);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("Saving ticket...");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess?.session?.user;

    if (!user) {
      setSaving(false);
      return setMsg("❌ Not logged in");
    }

    const payload = { 
      ...form, 
      created_by: user.id,
    };

    const { error } = await supabase
      .from("tickets")
      .insert(payload);

    setSaving(false);

    if (error) {
      setMsg("❌ " + error.message);
    } else {
      setMsg("✅ Ticket created successfully!");
      setTimeout(() => nav("/"), 1500);
    }
  }

  const actions = (
    <Button variant="ghost" onClick={() => nav("/")}>Back to Dashboard</Button>
  );

  if (loading) return null;

  return (
    <PageShell title="Create Ticket" actions={actions}>
      <form onSubmit={handleSubmit} className="grid gap-6">
        <Card title="Ticket Information">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <TextInput 
              label="DATE" 
              type="date" 
              value={form.date} 
              onChange={(e) => set("date", e.target.value)} 
              required 
            />
            <TextInput 
              label="CLIENT NUMBER" 
              value={form.username} 
              onChange={(e) => set("username", e.target.value)} 
              required 
            />
            <TextInput 
              label="ORDER NUMBER" 
              value={form.order_number} 
              onChange={(e) => set("order_number", e.target.value)} 
              required 
            />
            
            <SelectInput 
              label="OLT / EXCHANGE" 
              value={form.olt_exchange} 
              onChange={(e) => set("olt_exchange", e.target.value)} 
              options={[
                { label: "OLT", value: "OLT" },
                { label: "EXCHANGE", value: "EXCHANGE" }
              ]}
              required 
            />

            <SelectInput 
              label="JOB RECEIVED BY EMAIL OR PHONE" 
              value={form.job_received_by} 
              onChange={(e) => set("job_received_by", e.target.value)} 
              options={[
                { label: "EMAIL", value: "EMAIL" },
                { label: "PHONE", value: "PHONE" }
              ]}
              required 
            />

            <TextInput 
              label="RECEIVED FROM" 
              value={form.received_from} 
              onChange={(e) => set("received_from", e.target.value)} 
              required 
            />

            <TextInput 
              label="DONE BY" 
              value={form.done_by} 
              onChange={(e) => set("done_by", e.target.value)} 
              placeholder="Auto-filled with your name"
              required 
            />

            <SelectInput 
              label="FAULTS ADSL / GPON" 
              value={form.faults_type} 
              onChange={(e) => set("faults_type", e.target.value)} 
              options={[
                { label: "ADSL", value: "ADSL" },
                { label: "GPON", value: "GPON" }
              ]}
              required 
            />

            <SelectInput 
              label="INSTALLATION / MIGRATION" 
              value={form.installation_migration} 
              onChange={(e) => set("installation_migration", e.target.value)} 
              options={[
                { label: "INSTALLATION", value: "INSTALLATION" },
                { label: "MIGRATION", value: "MIGRATION" }
              ]}
              required 
            />

            <TextInput 
              label="TIME TAKEN" 
              value={form.time_taken} 
              onChange={(e) => set("time_taken", e.target.value)} 
              placeholder="e.g. 2 hours"
              required 
            />
          </div>

          {msg && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${msg.startsWith("✅") ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
              {msg}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Submit Ticket"}
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
