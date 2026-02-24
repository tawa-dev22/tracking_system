import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import useRealtimeAuditLogs from "../hooks/useRealtimeAuditLogs";
import { getAvatarUrlFromPath } from "../lib/avatar";

import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function AuditLogs() {
  const nav = useNavigate();
  const { loading: guardLoading, session, profile, privileged, err: guardErr } =
    useSessionProfile();
  const uid = session?.user?.id;

  const avatarUrl = useMemo(
    () => getAvatarUrlFromPath(profile?.avatar_path),
    [profile?.avatar_path]
  );

  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });
  const { newLogs } = useRealtimeAuditLogs();

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
        .select(
          "id, created_at, actor, action, entity, entity_id, actor_profile:profiles!audit_logs_actor_fkey(full_name, email)"
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (cancelled) return;

      if (logsRes.error) setErrMsg("Logs error: " + logsRes.error.message);
      setLogs(logsRes.data || []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
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
        {
          to: "/admin/tickets",
          label: "All Tickets",
          icon: "🎫",
          badge: notif.newTickets || 0,
        },
        { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
        {
          to: "/admin/users",
          label: "Users",
          icon: "👥",
          badge: notif.newUsers || 0,
        },
      ]}
      profile={{ ...profile, avatarUrl }}
      notificationBadge={notif.totalBadge}
      topRight={
        <div className="flex gap-2 items-center">
          <Button
            variant="ghost"
            onClick={() =>
              nav("/change-password", { state: { redirectTo: "/admin/logs" } })
            }
          >
            My Password
          </Button>
          <Button variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        </div>
      }
    >
      {/* Show notification if new logs arrived */}
      {newLogs?.length > 0 && (
        <div className="mb-3 rounded-2xl border border-green-400/20 bg-green-500/10 p-3 text-sm text-green-200">
          {newLogs.length} new audit log{newLogs.length !== 1 ? "s" : ""}{" "}
          received. Refresh to see them.
        </div>
      )}

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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left border-b border-white/10 text-white/70">
                <tr>
                  <th className="py-2 px-2">Date & Time</th>
                  <th className="py-2 px-2">User</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Details</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {logs.map((l) => (
                  <tr
                    key={l.id}
                    className="border-b border-white/5 hover:bg-white/5"
                  >
                    <td className="py-2 px-2">
                      {new Date(l.created_at).toLocaleString()}
                    </td>
                    <td className="py-2 px-2 font-medium">
                      {l.actor_profile?.full_name || l.actor_profile?.email || l.actor || "-"}
                    </td>
                    <td className="py-2 px-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        l.action === "USER_LOGIN" ? "bg-green-500/20 text-green-300" :
                        l.action === "USER_LOGOUT" ? "bg-orange-500/20 text-orange-300" :
                        l.action?.includes("DELETE") ? "bg-red-500/20 text-red-300" :
                        l.action?.includes("CREATE") || l.action?.includes("INSERT") ? "bg-blue-500/20 text-blue-300" :
                        l.action?.includes("UPDATE") ? "bg-yellow-500/20 text-yellow-300" :
                        "bg-white/10 text-white/70"
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-white/60 text-xs">
                      {l.entity}{l.entity_id ? ` • ${String(l.entity_id).slice(0, 8)}...` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </DashboardShell>
  );
}