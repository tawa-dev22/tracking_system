import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";
import TextInput from "../Components/ui/TextInput";

export default function Profile() {
  const nav = useNavigate();
  const { loading, session, profile, privileged } = useSessionProfile();

  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);

  const [fullName, setFullName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setFullName(profile?.full_name || "");
  }, [profile?.full_name]);

  async function saveName() {
    setMsg("");
    const uid = session?.user?.id;
    if (!uid) return setMsg("❌ Not logged in");

    const res = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", uid);

    if (res.error) return setMsg("❌ " + res.error.message);
    setMsg("✅ Profile updated");
  }

  async function onPickAvatar(file) {
    setMsg("");
    const uid = session?.user?.id;
    if (!uid) return setMsg("❌ Not logged in");
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${uid}/${Date.now()}.${ext}`;

      const up = await supabase.storage.from("avatars").upload(path, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
      if (up.error) return setMsg("❌ Upload failed: " + up.error.message);

      const upd = await supabase.from("profiles").update({ avatar_path: path }).eq("id", uid);
      if (upd.error) return setMsg("❌ Profile update failed: " + upd.error.message);

      setMsg("✅ Profile picture updated");
    } finally {
      setUploading(false);
    }
  }

  const items = privileged
    ? [
        { to: "/admin", label: "Dashboard", icon: "🏠" },
        { to: "/admin/tickets", label: "All Tickets", icon: "🎫" },
        { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
        { to: "/admin/users", label: "Users", icon: "👥" },
        { to: "/admin/messages", label: "Conversations", icon: "💬" },
      ]
    : [
        { to: "/", label: "Dashboard", icon: "🏠" },
        { to: "/new", label: "New Ticket", icon: "➕" },
        { to: "/messages", label: "Conversations", icon: "💬" },
      ];

  if (loading) return null;

  return (
    <DashboardShell
      title="Profile"
      subtitle="Manage your profile details"
      items={items}
      profile={{
        ...profile,
        avatarUrl,
      }}
      notificationBadge={0}
      topRight={
        <Button variant="ghost" onClick={() => nav(privileged ? "/admin" : "/")}>
          Back
        </Button>
      }
    >
      <div className="grid gap-4 max-w-3xl">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <img
              src={avatarUrl || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96'%3E%3Crect width='96' height='96' rx='48' fill='%2311111a'/%3E%3C/svg%3E"}
              alt="Profile avatar"
              className="size-20 rounded-full border border-white/10 object-cover bg-white/5"
            />
            <div className="grid gap-2">
              <div className="text-sm text-white/60">Change profile picture</div>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(e) => onPickAvatar(e.target.files?.[0])}
                className="text-sm"
              />
              {uploading && <div className="text-xs text-white/60">Uploading...</div>}
            </div>
          </div>
        </div>

        <Card
          title="Profile details"
          className="border-white/10 bg-white/5 text-white backdrop-blur"
          titleClassName="text-white"
        >
          <div className="grid gap-3 max-w-lg">
            <TextInput label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <div className="text-sm text-white/60">Email: {profile?.email || "-"}</div>
            <div className="flex gap-2">
              <Button onClick={saveName}>Save</Button>
              <Button variant="ghost" onClick={() => nav("/change-password")}>
                Change password
              </Button>
            </div>
            {msg && <div className="text-sm">{msg}</div>}
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}

