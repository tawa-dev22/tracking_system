import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useAdminGuard from "../admin/useAdminGuard";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function AllTickets() {
  const nav = useNavigate();
  const { loading: guardLoading, isPrivileged, errMsg: guardErr } = useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [docsByTicket, setDocsByTicket] = useState({});
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!guardLoading && isPrivileged) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardLoading, isPrivileged]);

  async function init() {
    setLoading(true);
    setErrMsg("");
    setMsg("");

    const ticketsRes = await supabase
      .from("tickets")
      .select("id, created_at, created_by, customer_name, order_no, tel_no")
      .order("created_at", { ascending: false })
      .limit(200);

    if (ticketsRes.error) setErrMsg("Tickets error: " + ticketsRes.error.message);
    setTickets(ticketsRes.data || []);
    setLoading(false);
  }

  async function loadDocs(ticketId) {
    setMsg("");

    const res = await supabase
      .from("ticket_documents")
      .select("id, file_name, file_path, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    if (res.error) return setMsg("Docs error: " + res.error.message);

    setDocsByTicket((p) => ({ ...p, [ticketId]: res.data || [] }));
  }

  async function download(file_path) {
    setMsg("");
    const { data, error } = await supabase.storage
      .from("ticket-docs")
      .createSignedUrl(file_path, 60);

    if (error) return setMsg("Download error: " + error.message);
    window.open(data.signedUrl, "_blank");
  }

  if (guardLoading) {
    return (
      <PageShell title="Admin • Tickets">
        <Card title="Loading...">Please wait.</Card>
      </PageShell>
    );
  }

  if (!isPrivileged) {
    return (
      <PageShell title="Admin • Tickets">
        <Card title="Access denied">
          ❌ You are not allowed to access this page.
          {guardErr && <p className="mt-2 text-sm text-red-600">{guardErr}</p>}
        </Card>
        <Button variant="ghost" onClick={() => nav("/")}>
          Go to Dashboard
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Admin • All Tickets"
      actions={
        <>
          <Button variant="ghost" onClick={() => nav("/admin")}>
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav("/change-password", { state: { redirectTo: "/admin/tickets" } })}
          >
            My Password
          </Button>
          <Button variant="ghost" onClick={init}>
            Refresh
          </Button>
        </>
      }
    >
      {(guardErr || errMsg) && (
        <Card title="Notice">
          <p className="text-sm text-red-600">{guardErr || errMsg}</p>
        </Card>
      )}

      {msg && (
        <Card title="Message">
          <p className="text-sm">{msg}</p>
        </Card>
      )}

      {loading ? (
        <Card title="Loading tickets...">Please wait.</Card>
      ) : (
        <Card title={`All Tickets (latest ${tickets.length})`}>
          <div className="grid gap-3">
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl border border-black/10 p-3 bg-white">
                <div className="font-semibold">
                  {t.customer_name || "No customer"} — Order: {t.order_no || "-"} — Tel:{" "}
                  {t.tel_no || "-"}
                </div>
                <div className="text-xs text-black/60 font-mono">
                  {t.id} | By: {t.created_by} | {new Date(t.created_at).toLocaleString()}
                </div>

                <div className="mt-2 flex gap-2 flex-wrap">
                  <Button variant="ghost" onClick={() => loadDocs(t.id)}>
                    Load Documents
                  </Button>
                </div>

                <ul className="mt-2 list-disc pl-6 text-sm">
                  {(docsByTicket[t.id] || []).map((d) => (
                    <li key={d.id}>
                      {d.file_name}{" "}
                      <button className="underline text-sm" onClick={() => download(d.file_path)}>
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </PageShell>
  );
}
