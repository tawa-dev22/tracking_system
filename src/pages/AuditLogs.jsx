import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import { getAvatarUrlFromPath } from "../lib/avatar";

import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function AuditLogs() {
  const nav = useNavigate();
  const { loading: guardLoading, session, profile, privileged, err: guardErr } = useSessionProfile();
  const uid = session?.user?.id;

  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [errMsg, setErrMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (guardLoading || !privileged) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrMsg("");

      const logsRes = await supabase
        .from("audit_logs")
        .select("id, created_at, actor, action, entity, entity_id")
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (logsRes.error) setErrMsg("Logs error: " + logsRes.error.message);
      setLogs(logsRes.data || []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [guardLoading, privileged, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  if (guardLoading) return null;
  if (!privileged) {
    nav("/");
    return null;
  }

  return (
    <DashboardShell
      title="Audit Logs"
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
          <Button variant="ghost" onClick={() => nav("/change-password", { state: { redirectTo: "/admin/logs" } })}>
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

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60 backdrop-blur">
          Loading logs…
        </div>
      ) : (
        <Card
          title={`Audit Logs (latest ${logs.length})`}
          className="border-white/10 bg-white/5 text-white backdrop-blur"
          titleClassName="text-white"
        >
          <ul className="text-sm list-disc pl-6 text-white/80">
            {logs.map((l) => (
              <li key={l.id}>
                {new Date(l.created_at).toLocaleString()} — {l.action} {l.entity} —{" "}
                {String(l.entity_id || "")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </DashboardShell>
  );
}
