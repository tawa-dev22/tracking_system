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
  const [showPreview, setShowPreview] = useState(false);
  const [previewTimestamp, setPreviewTimestamp] = useState(null);

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

  // Validate form before preview
  const validateForm = () => {
    const requiredFields = ["date", "username", "order_number", "olt_exchange", "job_received_by", "received_from", "done_by", "faults_type", "installation_migration", "time_taken"];
    const emptyFields = requiredFields.filter(field => !form[field]);
    
    if (emptyFields.length > 0) {
      setMsg(`❌ Please fill all required fields: ${emptyFields.join(", ")}`);
      return false;
    }
    return true;
  };

  const handlePreview = () => {
    if (!validateForm()) return;
    setPreviewTimestamp(new Date());
    setShowPreview(true);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validateForm()) return;

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

  // Field display labels mapping
  const fieldLabels = {
    date: "DATE",
    username: "USERNAME",
    order_number: "ORDER NUMBER",
    olt_exchange: "OLT / EXCHANGE",
    job_received_by: "JOB RECEIVED BY EMAIL OR PHONE",
    received_from: "RECEIVED FROM",
    done_by: "DONE BY",
    faults_type: "FAULTS ADSL / GPON",
    installation_migration: "INSTALLATION / MIGRATION",
    time_taken: "TIME TAKEN",
  };

  return (
    <PageShell title="Create Ticket" actions={actions}>
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Ticket Preview</h2>
              <button 
                onClick={() => setShowPreview(false)} 
                className="text-white/60 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            {/* System Generated Fields */}
            <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <h3 className="text-sm font-semibold text-blue-300 mb-3">System Generated Information</h3>
              <div className="grid gap-3 text-sm text-white/80">
                <div>
                  <span className="text-white/50 text-xs uppercase tracking-wide">Date Submitted</span>
                  <br />
                  <span className="text-white font-semibold">{previewTimestamp?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Form Fields Preview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(form).map(([key, value]) => (
                <div key={key} className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <span className="text-xs font-semibold text-white/60 uppercase tracking-wide">{fieldLabels[key]}</span>
                  <p className="mt-2 text-sm text-white font-medium break-words">{value || "—"}</p>
                </div>
              ))}
            </div>

            {/* Preview Actions */}
            <div className="mt-8 flex gap-3 justify-end">
              <Button 
                variant="ghost" 
                onClick={() => setShowPreview(false)}
              >
                Edit Form
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={saving}
              >
                {saving ? "Submitting..." : "Confirm & Submit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }} className="grid gap-6">
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
              label="USERNAME" 
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

          <div className="mt-6 flex justify-end gap-3">
            <Button 
              variant="ghost" 
              onClick={() => nav("/")}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit">
              Preview & Continue
            </Button>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
