import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import ChatPanel from "../Components/chat/ChatPanel";

export default function AdminMessages() {
  const nav = useNavigate();
  const { loading, session, profile, privileged } = useSessionProfile();
  const uid = session?.user?.id;

  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!uid) nav("/login");
    if (!privileged) nav("/");
  }, [loading, uid, privileged, nav]);

  useEffect(() => {
    if (!uid || !privileged) return;
    let cancelled = false;

    (async () => {
      const res = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .neq("id", uid)
        .order("created_at", { ascending: false })
        .limit(500);

      if (cancelled) return;
      setUsers(res.data || []);
      if (!selected && res.data?.length) setSelected(res.data[0].id);
    })();

    return () => {
      cancelled = true;
    };
  }, [uid, privileged, selected]);

  const items = [
    { to: "/admin", label: "Dashboard", icon: "🏠" },
    { to: "/admin/tickets", label: "All Tickets", icon: "🎫", badge: notif.newTickets || 0 },
    { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
    { to: "/admin/users", label: "Users", icon: "👥", badge: notif.newUsers || 0 },
    { to: "/admin/messages", label: "Conversations", icon: "💬", badge: notif.unreadMessages || 0 },
  ];

  if (loading) return null;

  const selectedUser = users.find((u) => u.id === selected);

  return (
    <DashboardShell
      title="Conversations"
      subtitle="Chat with any user"
      items={items}
      profile={{ ...profile, avatarUrl }}
      notificationBadge={notif.totalBadge}
    >
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden">
          <div className="p-3 border-b border-white/10 text-sm font-semibold text-white/80">
            Users
          </div>
          <div className="max-h-[70vh] overflow-auto">
            {users.map((u) => {
              const active = u.id === selected;
              return (
                <button
                  key={u.id}
                  onClick={() => setSelected(u.id)}
                  className={`w-full text-left px-3 py-2 border-b border-white/5 hover:bg-white/10 transition ${
                    active ? "bg-white/10" : ""
                  }`}
                >
                  <div className="text-sm font-semibold text-white/90 truncate">
                    {u.full_name || u.email || u.id}
                  </div>
                  <div className="text-xs text-white/50 truncate">{u.email || u.id}</div>
                </button>
              );
            })}
            {users.length === 0 && (
              <div className="p-3 text-sm text-white/60">No users found.</div>
            )}
          </div>
        </div>

        <div>
          {selectedUser ? (
            <ChatPanel meId={uid} peerId={selectedUser.id} />
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
              Select a user to start chatting.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

