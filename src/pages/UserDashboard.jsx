import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
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

  const notif = useRealtimeNotifications({ userId: uid, isAdmin: false });

  // Realtime ticket updates hook (toast + live indicator)
  const { ticketUpdates, isConnected } = useRealtimeTickets(uid);

  const [tickets, setTickets] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!uid) nav("/login");
    if (privileged) nav("/admin");
  }, [loading, uid, privileged, nav]);

  // Show toast notification when ticket is updated
  useEffect(() => {
    if (ticketUpdates?.length > 0) {
      const latest = ticketUpdates[0];
      const message = `Ticket ${latest.event}: ${latest.id}`;
      // Replace with your toast library (sonner / react-hot-toast / etc)
      console.log(message);
    }
  }, [ticketUpdates]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;

    (async () => {
      setErr("");
      const res = await supabase
        .from("tickets")
        .select("id, created_at, customer_name, order_no, tel_no, created_by")
        .eq("created_by", uid)
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (res.error) setErr(res.error.message);
      setTickets(res.data || []);
    })();

    // realtime: my new ticket increments list
    const ch = supabase.channel(`my-tickets:${uid}`);
    ch.on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "tickets",
        filter: `created_by=eq.${uid}`,
      },
      (payload) => setTickets((prev) => [payload.new, ...prev])
    );
    ch.subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(ch);
    };
  }, [uid]);

  const items = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/new", label: "New Ticket", icon: "➕" },
    {
      to: "/messages",
      label: "Conversations",
      icon: "💬",
      badge: notif.unreadMessages || 0,
    },
  ];

  if (loading) return null;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Your submitted tickets"
      items={items}
      profile={{ ...profile, avatarUrl }}
      notificationBadge={notif.totalBadge}
      topRight={
        <div className="flex gap-2 items-center">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs mr-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-white/60">
              {isConnected ? "Live updates enabled" : "Offline"}
            </span>
          </div>

          <Button onClick={() => nav("/new")}>Create Ticket</Button>
          <Button variant="ghost" onClick={() => nav("/change-password")}>
            Change Password
          </Button>
        </div>
      }
    >
      {err && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {err}
        </div>
      )}

      <Card
        title={`My submissions (${tickets.length})`}
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
                <th>Ticket ID</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-white/5">
                  <td className="py-2">
                    {new Date(t.created_at).toLocaleString()}
                  </td>
                  <td>{t.customer_name || "-"}</td>
                  <td>{t.order_no || "-"}</td>
                  <td>{t.tel_no || "-"}</td>
                  <td className="font-mono text-xs">{t.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}