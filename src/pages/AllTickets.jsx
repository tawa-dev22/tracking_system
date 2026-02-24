import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function AllTickets() {
  const nav = useNavigate();
  const { loading: guardLoading, session, profile, privileged, err: guardErr } = useSessionProfile();
  const uid = session?.user?.id;
  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });

  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [docsByTicket, setDocsByTicket] = useState({});
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    if (guardLoading || !privileged) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErrMsg("");
      setMsg("");

      // Fetch tickets with creator profile info joined
      const ticketsRes = await supabase
        .from("tickets")
        .select(`
          id, created_at, created_by, customer_name, order_no, tel_no,
          faults_man, date_received, time_received, exchange, spv,
          customer_address, cabinet_name, dp_name,
          creator:profiles!tickets_created_by_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;
      if (ticketsRes.error) setErrMsg("Tickets error: " + ticketsRes.error.message);
      setTickets(ticketsRes.data || []);
      setLoading(false);
    })();

    const ch = supabase.channel("admin-tickets");
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, async () => {
      // Re-fetch to get joined creator name
      const r = await supabase
        .from("tickets")
        .select(`
          id, created_at, created_by, customer_name, order_no, tel_no,
          faults_man, date_received, time_received, exchange, spv,
          customer_address, cabinet_name, dp_name,
          creator:profiles!tickets_created_by_fkey(full_name, email)
        `)
        .order("created_at", { ascending: false })
        .limit(200);
      setTickets(r.data || []);
    });
    ch.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [guardLoading, privileged, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
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

  if (guardLoading) return null;
  if (!privileged) {
    nav("/");
    return null;
  }

  return (
    <DashboardShell
      title="All Tickets"
      subtitle="Latest 200"
      items={[
        { to: "/admin", label: "Dashboard", icon: "🏠" },
        { to: "/admin/tickets", label: "All Tickets", icon: "🎫", badge: notif.newTickets || 0 },
        { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
        { to: "/admin/users", label: "Users", icon: "👥", badge: notif.newUsers || 0 },
      ]}
      profile={{ ...profile, avatarUrl }}
      topRight={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav("/change-password", { state: { redirectTo: "/admin/tickets" } })}>
            My Password
          </Button>
          <Button variant="ghost" onClick={refresh}>Refresh</Button>
        </div>
      }
    >
      {(guardErr || errMsg) && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {guardErr || errMsg}
        </div>
      )}
      {msg && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">{msg}</div>
      )}

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Ticket Details</h2>
              <button onClick={() => setSelectedTicket(null)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-white/80">
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Ticket ID</span><br /><span className="font-mono text-xs">{selectedTicket.id}</span></div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Date Submitted</span><br />{new Date(selectedTicket.created_at).toLocaleString()}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Customer Name</span><br />{selectedTicket.customer_name || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Customer Address</span><br />{selectedTicket.customer_address || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Order No</span><br />{selectedTicket.order_no || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Tel No</span><br />{selectedTicket.tel_no || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Handled By (Faults Man)</span><br />{selectedTicket.faults_man || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Created By</span><br />{selectedTicket.creator?.full_name || selectedTicket.creator?.email || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Date Received</span><br />{selectedTicket.date_received || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Time Received</span><br />{selectedTicket.time_received || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Exchange</span><br />{selectedTicket.exchange || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">SPV</span><br />{selectedTicket.spv || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">Cabinet Name</span><br />{selectedTicket.cabinet_name || "-"}</div>
              <div><span className="text-white/50 text-xs uppercase tracking-wide">DP Name</span><br />{selectedTicket.dp_name || "-"}</div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedTicket(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 backdrop-blur">
          Loading tickets…
        </div>
      ) : (
        <Card
          title={`All Tickets (latest ${tickets.length})`}
          className="border-white/10 bg-white/5 text-white backdrop-blur"
          titleClassName="text-white"
        >
          <div className="grid gap-3">
            {tickets.map((t) => {
              const creatorName = t.creator?.full_name || t.creator?.email || "Unknown";
              const handlerName = t.faults_man || "Not assigned";
              const docs = docsByTicket[t.id];
              const hasLoadedDocs = docs !== undefined;

              return (
                <div key={t.id} className="rounded-2xl border border-white/10 p-3 bg-black/10">
                  <div className="font-semibold">
                    {t.customer_name || "No customer"} — Order: {t.order_no || "-"} — Tel: {t.tel_no || "-"}
                  </div>
                  <div className="text-xs text-white/50 mt-1">
                    <span>Created by: <strong className="text-white/70">{creatorName}</strong></span>
                    {" · "}
                    <span>Handled by: <strong className="text-white/70">{handlerName}</strong></span>
                    {" · "}
                    <span>{new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    <Button variant="ghost" onClick={() => setSelectedTicket(t)}>
                      View Details
                    </Button>
                    {/* Only show Load Documents button if docs haven't been loaded yet */}
                    {!hasLoadedDocs && (
                      <Button variant="ghost" onClick={() => loadDocs(t.id)}>
                        Load Documents
                      </Button>
                    )}
                  </div>
                  {/* Show documents if loaded */}
                  {hasLoadedDocs && (
                    <div className="mt-2">
                      {docs.length === 0 ? (
                        <p className="text-xs text-white/40 italic">No documents uploaded for this ticket.</p>
                      ) : (
                        <ul className="list-disc pl-6 text-sm text-white/80">
                          {docs.map((d) => (
                            <li key={d.id}>
                              {d.file_name}{" "}
                              <button className="underline text-sm" onClick={() => download(d.file_path)}>
                                Download
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {tickets.length === 0 && (
              <div className="text-sm text-white/50 text-center py-4">No tickets found.</div>
            )}
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}
