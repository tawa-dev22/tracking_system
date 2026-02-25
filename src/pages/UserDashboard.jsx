import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeTickets from "../hooks/useRealtimeTickets";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function UserDashboard() {
  const nav = useNavigate();
  const { loading, session, profile, privileged } = useSessionProfile();
  const uid = session?.user?.id;
  const avatarUrl = useMemo(
    () => getAvatarUrlFromPath(profile?.avatar_path),
    [profile?.avatar_path]
  );

  const { ticketUpdates } = useRealtimeTickets(uid);
  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);

  useEffect(() => {
    if (loading) return;
    if (!uid) nav("/login");
    if (privileged) nav("/admin");
  }, [loading, uid, privileged, nav]);

  useEffect(() => {
    if (ticketUpdates?.length > 0 && uid) loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketUpdates]);

  async function loadTickets() {
    if (!uid) return;
    setErr("");
    const res = await supabase
      .from("tickets")
      .select("id, created_at, customer_name, order_no, tel_no, created_by, faults_man, date_received, time_received, exchange, spv, customer_address, cabinet_name, dp_name")
      .eq("created_by", uid)
      .order("created_at", { ascending: false });
    if (res.error) setErr(res.error.message);
    setTickets(res.data || []);
  }

  useEffect(() => {
    if (!uid) return;
    loadTickets();
    const ch = supabase.channel(`my-tickets:${uid}`);
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "tickets", filter: `created_by=eq.${uid}` },
      (payload) => setTickets((prev) => [payload.new, ...prev])
    );
    ch.subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  const items = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/new", label: "New Ticket", icon: "➕" },
    { to: "/reports", label: "Reports", icon: "📊" },
  ];

  if (loading) return null;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Your submitted tickets"
      items={items}
      profile={{ ...profile, avatarUrl }}
      topRight={
        <div className="flex gap-2 items-center">
          <Button onClick={() => nav("/new")}>Create Ticket</Button>
          <Button variant="ghost" onClick={() => nav("/change-password")}>Change Password</Button>
        </div>
      }
    >
      {err && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{err}</div>
      )}

      {/* Ticket Preview Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#1a1a2e] p-6 overflow-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Ticket Preview</h2>
              <button onClick={() => setSelectedTicket(null)} className="text-white/60 hover:text-white text-xl">✕</button>
            </div>
            <div className="grid gap-3 text-sm text-white/80">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Ticket ID</span><br /><span className="font-mono text-xs">{selectedTicket.id}</span></div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Date Submitted</span><br />{new Date(selectedTicket.created_at).toLocaleString()}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Customer Name</span><br />{selectedTicket.customer_name || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Customer Address</span><br />{selectedTicket.customer_address || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Order No</span><br />{selectedTicket.order_no || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Tel No</span><br />{selectedTicket.tel_no || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Handled By (Faults Man)</span><br />{selectedTicket.faults_man || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Date Received</span><br />{selectedTicket.date_received || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Time Received</span><br />{selectedTicket.time_received || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Exchange</span><br />{selectedTicket.exchange || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">SPV</span><br />{selectedTicket.spv || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">Cabinet Name</span><br />{selectedTicket.cabinet_name || "-"}</div>
                <div><span className="text-white/50 text-xs uppercase tracking-wide">DP Name</span><br />{selectedTicket.dp_name || "-"}</div>
              </div>
            </div>
            <div className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={() => setSelectedTicket(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <Card
        title={`My Submissions (${tickets.length})`}
        className="border-white/10 bg-white/5 text-white backdrop-blur"
        titleClassName="text-white"
      >
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b border-white/10 text-white/70">
              <tr>
                <th className="py-2">Date</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Tel</th>
                <th>Handled By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2">{new Date(t.created_at).toLocaleString()}</td>
                  <td>{t.customer_name || "-"}</td>
                  <td>{t.order_no || "-"}</td>
                  <td>{t.tel_no || "-"}</td>
                  <td>{t.faults_man || "-"}</td>
                  <td>
                    <button
                      onClick={() => setSelectedTicket(t)}
                      className="text-xs text-violet-300 hover:text-violet-100 underline"
                    >
                      Preview
                    </button>
                  </td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-white/50">No tickets submitted yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
