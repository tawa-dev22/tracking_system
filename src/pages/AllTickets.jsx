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

  useEffect(() => {
    if (guardLoading || !privileged) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrMsg("");
      setMsg("");

      const ticketsRes = await supabase
        .from("tickets")
        .select("id, created_at, created_by, customer_name, order_no, tel_no")
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (ticketsRes.error) setErrMsg("Tickets error: " + ticketsRes.error.message);
      setTickets(ticketsRes.data || []);
      setLoading(false);
    })();

    const ch = supabase.channel("admin-tickets");
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, (payload) => {
      setTickets((prev) => [payload.new, ...prev].slice(0, 200));
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
        { to: "/admin/messages", label: "Conversations", icon: "💬", badge: notif.unreadMessages || 0 },
      ]}
      profile={{ ...profile, avatarUrl }}
      notificationBadge={notif.totalBadge}
      topRight={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav("/change-password", { state: { redirectTo: "/admin/tickets" } })}>
            My Password
          </Button>
          <Button variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        </div>
      }
    >
      {(guardErr || errMsg) && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {guardErr || errMsg}
        </div>
      )}

      {msg && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">
          {msg}
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
            {tickets.map((t) => (
              <div key={t.id} className="rounded-2xl border border-white/10 p-3 bg-black/10">
                <div className="font-semibold">
                  {t.customer_name || "No customer"} — Order: {t.order_no || "-"} — Tel:{" "}
                  {t.tel_no || "-"}
                </div>
                <div className="text-xs text-white/50 font-mono">
                  {t.id} | By: {t.created_by} | {new Date(t.created_at).toLocaleString()}
                </div>

                <div className="mt-2 flex gap-2 flex-wrap">
                  <Button variant="ghost" onClick={() => loadDocs(t.id)}>
                    Load Documents
                  </Button>
                </div>

                <ul className="mt-2 list-disc pl-6 text-sm text-white/80">
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
    </DashboardShell>
  );
}
