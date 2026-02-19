import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import ChatPanel from "../Components/chat/ChatPanel";

export default function UserMessages() {
  const nav = useNavigate();
  const { loading, session, profile, privileged } = useSessionProfile();
  const uid = session?.user?.id;

  const [adminId, setAdminId] = useState("");
  const [adminName, setAdminName] = useState("");

  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: false });

  useEffect(() => {
    if (loading) return;
    if (!uid) nav("/login");
    if (privileged) nav("/admin/messages");
  }, [loading, uid, privileged, nav]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      // pick a single admin/superuser to chat with (you can expand to multiple later)
      const res = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["admin", "superuser"])
        .order("created_at", { ascending: true })
        .limit(1);
      const a = res.data?.[0];
      setAdminId(a?.id || "");
      setAdminName(a?.full_name || a?.email || "Admin");
    })();
  }, [uid]);

  const items = [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/new", label: "New Ticket", icon: "➕" },
    { to: "/messages", label: "Conversations", icon: "💬", badge: notif.unreadMessages || 0 },
  ];

  if (loading) return null;

  return (
    <DashboardShell
      title="Conversations"
      subtitle={`Chat with ${adminName || "Admin"}`}
      items={items}
      profile={{ ...profile, avatarUrl }}
      notificationBadge={notif.totalBadge}
    >
      {!adminId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          No admin account found yet. Create an admin user (role: <b>admin</b> or <b>superuser</b>) to enable chat.
        </div>
      ) : (
        <ChatPanel meId={uid} peerId={adminId} />
      )}
    </DashboardShell>
  );
}

