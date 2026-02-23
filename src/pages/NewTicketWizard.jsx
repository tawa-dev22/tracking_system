import { useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import Section from "../Components/ui/Section";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";
import StepTabs from "../Components/ui/StepTabs";
import Checkbox from "../Components/ui/CheckBox";


function emptyStep() {
  return { time_in: "", time_out: "", duration_min: "", initials: "" };
}

function ProcessRow({ label, value, onChange }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5 items-end border border-black/10 rounded-2xl p-3">
      <div className="sm:col-span-1 font-semibold text-sm">{label}</div>
      <TextInput label="Time in" value={value.time_in} onChange={(e)=>onChange("time_in", e.target.value)} />
      <TextInput label="Time out" value={value.time_out} onChange={(e)=>onChange("time_out", e.target.value)} />
      <TextInput label="Duration (min)" value={value.duration_min} onChange={(e)=>onChange("duration_min", e.target.value)} />
      <TextInput label="Initials" value={value.initials} onChange={(e)=>onChange("initials", e.target.value)} />
    </div>
  );
}

export default function NewTicketWizard() {
  const nav = useNavigate();
  const steps = useMemo(() => ["Header", "Details", "Process", "Customer", "Uploads"], []);
  const [step, setStep] = useState(0);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ticketId, setTicketId] = useState(null);

  const [docs, setDocs] = useState([]);
  const [uploading, setUploading] = useState(false);
  const progressPercent = ((step + 1) / steps.length) * 100;

  const [form, setForm] = useState({
    // Header
    date_received: "",
    time_received: "",
    faults_man: "",
    transfer: false,
    tr: false,
    adsl: false,
    voice: false,

    // Details
    tel_no: "",
    order_no: "",
    spv: "",
    muxy_card_port: "",
    strip: "",
    adsl_port: "",
    exchange: "",

    // TRACE/RECOVER/RUN
    trace_spv: "", trace_strip: "", trace_alcatel_port: "", trace_remarks: "",
    recover_spv: "", recover_strip: "", recover_alcatel_port: "", recover_remarks: "",
    run_spv: "", run_strip: "", run_alcatel_port: "", run_remarks: "",

    // Process jsonb
    process_provide_details: emptyStep(),
    process_mdf_in_tray: emptyStep(),
    process_job_execution: emptyStep(),
    process_mdf_log_book: emptyStep(),
    process_records_update: emptyStep(),
    process_records_filing: emptyStep(),
    process_total_time_taken: emptyStep(),

    // Customer
    customer_name: "",
    customer_address: "",
    cabinet_name: "",
    cabinet_in: "",
    cabinet_out: "",
    dp_name: "",
    dp_pair: "",
  });

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const setProc = (k, field, v) =>
    setForm((p) => ({ ...p, [k]: { ...p[k], [field]: v } }));

  function next() { setStep((s) => Math.min(s + 1, steps.length - 1)); }
  function back() { setStep((s) => Math.max(s - 1, 0)); }

  async function saveTicket() {
    setSaving(true);
    setMsg("Saving to database...");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess?.session?.user;

    if (!user) {
      setSaving(false);
      return setMsg("❌ Not logged in");
    }

    const payload = { ...form, created_by: user.id };

    const { data, error } = await supabase
      .from("tickets")
      .insert(payload)
      .select("id")
      .single();

    setSaving(false);

    if (error) return setMsg("❌ " + error.message);

    setTicketId(data.id);
    setMsg("✅ Saved to Supabase. Now go to Uploads to attach documents.");
  }

  async function uploadSelectedFiles() {
    if (!ticketId) return setMsg("❌ Save the form first to get a Ticket ID.");
    if (!docs.length) return setMsg("❌ Select files first.");

    const { data: sess } = await supabase.auth.getSession();
    const user = sess?.session?.user;
    if (!user) return setMsg("❌ Not logged in");

    setUploading(true);
    setMsg("Uploading files...");

    for (const file of docs) {
      const path = `${user.id}/${ticketId}/${Date.now()}-${file.name}`;

      const up = await supabase.storage.from("ticket-docs").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

      if (up.error) {
        setUploading(false);
        return setMsg("❌ Upload failed: " + up.error.message);
      }

      const ins = await supabase.from("ticket_documents").insert({
        ticket_id: ticketId,
        uploaded_by: user.id,
        file_path: path,
        file_name: file.name,
        mime_type: file.type,
      });

      if (ins.error) {
        setUploading(false);
        return setMsg("❌ Metadata insert failed: " + ins.error.message);
      }
    }

    setUploading(false);
    setDocs([]);
    setMsg("✅ Upload complete (saved in Storage + DB).");
  }

  async function cancelAndGoBack() {
    nav("/");
  }

  const actions = (
    <>
      <Button variant="ghost" onClick={cancelAndGoBack}>Dashboard</Button>
      <Button variant="ghost" onClick={() => nav("/change-password")}>Change Password</Button>
    </>
  );

  return (
    <PageShell title="New Form (Step-by-step)" actions={actions}>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-white">Progress</span>
          <span className="text-xs text-white/60">{step + 1} of {steps.length}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid gap-4">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <StepTabs steps={steps} current={step} onSelect={setStep} />
            <div className="flex gap-2 flex-wrap">
              <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
              <Button variant="ghost" onClick={next} disabled={step === steps.length - 1}>Next</Button>
              <Button onClick={saveTicket} disabled={saving}>
                {saving ? "Saving..." : (ticketId ? "Saved ✅" : "Save")}
              </Button>
            </div>
          </div>

          <div className="mt-3 text-sm">
            <span className="font-semibold">Ticket ID:</span>{" "}
            <span className="font-mono">{ticketId || "Not saved yet"}</span>
          </div>

          {msg && <p className="mt-2 text-sm">{msg}</p>}
        </Card>

        {/* STEP 1 */}
        {step === 0 && (
          <Section title="Header">
            <div className="grid gap-3 sm:grid-cols-3">
              <TextInput label="Date received" type="date" value={form.date_received} onChange={(e)=>set("date_received", e.target.value)} />
              <TextInput label="Time received" type="time" value={form.time_received} onChange={(e)=>set("time_received", e.target.value)} />
              <TextInput label="Faults Man" value={form.faults_man} onChange={(e)=>set("faults_man", e.target.value)} />
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-4">
              <Checkbox label="TRANSFER" checked={form.transfer} onChange={(e)=>set("transfer", e.target.checked)} />
              <Checkbox label="TR" checked={form.tr} onChange={(e)=>set("tr", e.target.checked)} />
              <Checkbox label="ADSL" checked={form.adsl} onChange={(e)=>set("adsl", e.target.checked)} />
              <Checkbox label="VOICE" checked={form.voice} onChange={(e)=>set("voice", e.target.checked)} />
            </div>

            <p className="mt-4 text-xs text-black/60">
              Fill the form step-by-step. Press <b>Save</b> anytime. Uploads require a Ticket ID.
            </p>
          </Section>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div className="grid gap-4">
            <Section title="Details provided by">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="Tel No" value={form.tel_no} onChange={(e)=>set("tel_no", e.target.value)} />
                <TextInput label="Order No" value={form.order_no} onChange={(e)=>set("order_no", e.target.value)} />
                <TextInput label="SPV" value={form.spv} onChange={(e)=>set("spv", e.target.value)} />
                <TextInput label="Muxy/Card/Port" value={form.muxy_card_port} onChange={(e)=>set("muxy_card_port", e.target.value)} />
                <TextInput label="Strip" value={form.strip} onChange={(e)=>set("strip", e.target.value)} />
                <TextInput label="ADSL Port" value={form.adsl_port} onChange={(e)=>set("adsl_port", e.target.value)} />
                <TextInput label="Exchange" value={form.exchange} onChange={(e)=>set("exchange", e.target.value)} />
              </div>
            </Section>

            <Section title="TRACE">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="SPV" value={form.trace_spv} onChange={(e)=>set("trace_spv", e.target.value)} />
                <TextInput label="Strip" value={form.trace_strip} onChange={(e)=>set("trace_strip", e.target.value)} />
                <TextInput label="Alcatel Port" value={form.trace_alcatel_port} onChange={(e)=>set("trace_alcatel_port", e.target.value)} />
                <TextInput label="Remarks" value={form.trace_remarks} onChange={(e)=>set("trace_remarks", e.target.value)} />
              </div>
            </Section>

            <Section title="RECOVER">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="SPV" value={form.recover_spv} onChange={(e)=>set("recover_spv", e.target.value)} />
                <TextInput label="Strip" value={form.recover_strip} onChange={(e)=>set("recover_strip", e.target.value)} />
                <TextInput label="Alcatel Port" value={form.recover_alcatel_port} onChange={(e)=>set("recover_alcatel_port", e.target.value)} />
                <TextInput label="Remarks" value={form.recover_remarks} onChange={(e)=>set("recover_remarks", e.target.value)} />
              </div>
            </Section>

            <Section title="RUN">
              <div className="grid gap-3 sm:grid-cols-2">
                <TextInput label="SPV" value={form.run_spv} onChange={(e)=>set("run_spv", e.target.value)} />
                <TextInput label="Strip" value={form.run_strip} onChange={(e)=>set("run_strip", e.target.value)} />
                <TextInput label="Alcatel Port" value={form.run_alcatel_port} onChange={(e)=>set("run_alcatel_port", e.target.value)} />
                <TextInput label="Remarks" value={form.run_remarks} onChange={(e)=>set("run_remarks", e.target.value)} />
              </div>
            </Section>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <Section title="Process times (time in / time out / duration / initials)">
            <div className="grid gap-3">
              <ProcessRow label="Provide Details" value={form.process_provide_details} onChange={(f,v)=>setProc("process_provide_details", f, v)} />
              <ProcessRow label="MDF In tray" value={form.process_mdf_in_tray} onChange={(f,v)=>setProc("process_mdf_in_tray", f, v)} />
              <ProcessRow label="Job execution" value={form.process_job_execution} onChange={(f,v)=>setProc("process_job_execution", f, v)} />
              <ProcessRow label="MDF Log book" value={form.process_mdf_log_book} onChange={(f,v)=>setProc("process_mdf_log_book", f, v)} />
              <ProcessRow label="Records Update" value={form.process_records_update} onChange={(f,v)=>setProc("process_records_update", f, v)} />
              <ProcessRow label="Records Filing" value={form.process_records_filing} onChange={(f,v)=>setProc("process_records_filing", f, v)} />
              <ProcessRow label="Total time taken" value={form.process_total_time_taken} onChange={(f,v)=>setProc("process_total_time_taken", f, v)} />
            </div>
          </Section>
        )}

        {/* STEP 4 */}
        {step === 3 && (
          <Section title="Customer details">
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Customer Name" value={form.customer_name} onChange={(e)=>set("customer_name", e.target.value)} />
              <TextInput label="Customer Address" value={form.customer_address} onChange={(e)=>set("customer_address", e.target.value)} />
              <TextInput label="Cabinet Name" value={form.cabinet_name} onChange={(e)=>set("cabinet_name", e.target.value)} />
              <TextInput label="Cabinet In" value={form.cabinet_in} onChange={(e)=>set("cabinet_in", e.target.value)} />
              <TextInput label="Cabinet Out" value={form.cabinet_out} onChange={(e)=>set("cabinet_out", e.target.value)} />
              <TextInput label="DP Name" value={form.dp_name} onChange={(e)=>set("dp_name", e.target.value)} />
              <TextInput label="DP Pair" value={form.dp_pair} onChange={(e)=>set("dp_pair", e.target.value)} />
            </div>
          </Section>
        )}

        {/* STEP 5 */}
        {step === 4 && (
          <Section title="Upload documents">
            <div className="grid gap-3 max-w-xl">
              <p className="text-sm">
                <b>Note:</b> You must save the form first. Uploads are stored in Supabase Storage and metadata in DB.
              </p>

              <input
                className="block w-full text-sm"
                type="file"
                multiple
                onChange={(e) => setDocs(Array.from(e.target.files || []))}
              />

              <div className="flex gap-2 flex-wrap">
                <Button onClick={uploadSelectedFiles} disabled={uploading}>
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button variant="ghost" onClick={()=>{ setDocs([]); setMsg(""); }}>Clear</Button>
              </div>

              {docs.length > 0 && (
                <div className="text-sm">
                  <div className="font-semibold mb-1">Selected files:</div>
                  <ul className="list-disc pl-6">
                    {docs.map((f) => <li key={f.name}>{f.name}</li>)}
                  </ul>
                </div>
              )}

              <p className="text-sm">{msg}</p>
              {!ticketId && <p className="text-sm text-red-600">❌ Save first to generate Ticket ID.</p>}
            </div>
          </Section>
        )}
      </div>
    </PageShell>
  );
}
