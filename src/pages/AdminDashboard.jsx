import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
      <div className="text-xs tracking-widest text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
      {hint && <div className="mt-1 text-xs text-white/40">{hint}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const nav = useNavigate();
  const { loading, session, profile, privileged } = useSessionProfile();
  const uid = session?.user?.id;

  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });

  const [usersCount, setUsersCount] = useState(0);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [auditCount, setAuditCount] = useState(0);

  const [latestTickets, setLatestTickets] = useState([]);
  const [latestUsers, setLatestUsers] = useState([]);
  const [latestLogs, setLatestLogs] = useState([]);

  const [errMsg, setErrMsg] = useState("");

  async function refresh() {
    setErrMsg("");

    const u = await supabase.from("profiles").select("id", { count: "exact", head: true });
    if (u.error) setErrMsg((p) => (p ? p + " | " : "") + u.error.message);
    setUsersCount(u.count || 0);

    const t = await supabase.from("tickets").select("id", { count: "exact", head: true });
    if (t.error) setErrMsg((p) => (p ? p + " | " : "") + t.error.message);
    setTicketsCount(t.count || 0);

    const a = await supabase.from("audit_logs").select("id", { count: "exact", head: true });
    if (a.error) setErrMsg((p) => (p ? p + " | " : "") + a.error.message);
    setAuditCount(a.count || 0);

    const latestT = await supabase
      .from("tickets")
      .select("id, created_at, customer_name, order_no, tel_no, created_by")
      .order("created_at", { ascending: false })
      .limit(6);
    setLatestTickets(latestT.data || []);

    const latestU = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false })
      .limit(6);
    setLatestUsers(latestU.data || []);

    const latestL = await supabase
      .from("audit_logs")
      .select("id, created_at, actor, action, entity, entity_id")
      .order("created_at", { ascending: false })
      .limit(6);
    setLatestLogs(latestL.data || []);
  }

  useEffect(() => {
    if (!uid) return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // Realtime: keep counts fresh + keep latest cards fresh
  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel("admin-dashboard");

    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets" }, () => {
      setTicketsCount((c) => c + 1);
      supabase
        .from("tickets")
        .select("id, created_at, customer_name, order_no, tel_no, created_by")
        .order("created_at", { ascending: false })
        .limit(6)
        .then((r) => setLatestTickets(r.data || []));
    });

    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => {
      setUsersCount((c) => c + 1);
      supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(6)
        .then((r) => setLatestUsers(r.data || []));
    });

    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, () => {
      setAuditCount((c) => c + 1);
      supabase
        .from("audit_logs")
        .select("id, created_at, actor, action, entity, entity_id")
        .order("created_at", { ascending: false })
        .limit(6)
        .then((r) => setLatestLogs(r.data || []));
    });

    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  useEffect(() => {
    if (loading) return;
    if (!uid) nav("/login");
    if (!privileged) nav("/");
  }, [loading, uid, privileged, nav]);

  if (loading) return null;

  const items = [
    { to: "/admin", label: "Dashboard", icon: "🏠" },
    { to: "/admin/tickets", label: "All Tickets", icon: "🎫", badge: notif.newTickets || 0 },
    { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
    { to: "/admin/users", label: "Users", icon: "👥", badge: notif.newUsers || 0 },
    { to: "/admin/messages", label: "Conversations", icon: "💬", badge: notif.unreadMessages || 0 },
  ];

  return (
    <DashboardShell
      appName="Fault Tracking"
      title="Dashboard"
      subtitle="Here is today’s report and performance"
      items={items}
      profile={{ ...profile, avatarUrl }}
      notificationBadge={notif.totalBadge}
      topRight={
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => nav("/change-password", { state: { redirectTo: "/admin" } })}>
            My Password
          </Button>
          <Button variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        </div>
      }
    >
      {errMsg && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {errMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="TOTAL USERS" value={usersCount} hint="Includes admins and users" />
        <StatCard label="ALL TICKETS" value={ticketsCount} hint="Updates live when a new ticket is created" />
        <StatCard label="AUDIT LOGS" value={auditCount} hint="Latest actions recorded" />
        <StatCard label="UNREAD MESSAGES" value={notif.unreadMessages} hint="New user messages" />
      </div>

      {/* Middle */}
      <div className="grid gap-4 mt-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-white/90">Latest Tickets</div>
            <button className="text-sm text-white/60 underline" onClick={() => nav("/admin/tickets")}>
              View all
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {latestTickets.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="text-sm font-semibold">
                  {t.customer_name || "No customer"} • Order {t.order_no || "-"} • Tel {t.tel_no || "-"}
                </div>
                <div className="mt-1 text-xs text-white/50 font-mono">
                  {t.id} • {new Date(t.created_at).toLocaleString()}
                </div>
              </div>
            ))}
            {latestTickets.length === 0 && <div className="text-sm text-white/60">No tickets yet.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-white/90">New Users</div>
            <button className="text-sm text-white/60 underline" onClick={() => nav("/admin/users")}>
              Manage
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {latestUsers.map((u) => (
              <div key={u.id} className="rounded-xl border border-white/10 bg-black/10 p-3">
                <div className="text-sm font-semibold">{u.full_name || u.email || u.id}</div>
                <div className="mt-1 text-xs text-white/50">
                  {u.email || ""} • role: {String(u.role || "user")}
                </div>
              </div>
            ))}
            {latestUsers.length === 0 && <div className="text-sm text-white/60">No users yet.</div>}
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="grid gap-4 mt-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-white/90">Audit Logs</div>
            <button className="text-sm text-white/60 underline" onClick={() => nav("/admin/logs")}>
              View all
            </button>
          </div>
          <div className="mt-3 grid gap-2">
            {latestLogs.map((l) => (
              <div key={l.id} className="rounded-xl border border-white/10 bg-black/10 p-3 text-sm">
                <div className="text-white/80">
                  {l.action} {l.entity} • {String(l.entity_id || "")}
                </div>
                <div className="mt-1 text-xs text-white/50">{new Date(l.created_at).toLocaleString()}</div>
              </div>
            ))}
            {latestLogs.length === 0 && <div className="text-sm text-white/60">No logs yet.</div>}
          </div>
        </div>

        <Card
          title="Quick actions"
          className="border-white/10 bg-white/5 text-white backdrop-blur"
          titleClassName="text-white"
        >
          <div className="grid gap-2">
            <Button onClick={() => nav("/admin/tickets")}>Open tickets</Button>
            <Button onClick={() => nav("/admin/users")}>Manage users</Button>
            <Button onClick={() => nav("/admin/messages")}>Open conversations</Button>
          </div>
          <div className="mt-3 text-xs text-white/50">
            These sections are all wired to the system and update live via Supabase Realtime.
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
