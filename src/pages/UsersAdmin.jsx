import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useSessionProfile from "../hooks/useSessionProfile";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import { getAvatarUrlFromPath } from "../lib/avatar";

import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

export default function UsersAdmin() {
  const nav = useNavigate();
  const { loading: guardLoading, session, profile, privileged, err: guardErr } = useSessionProfile();
  const uid = session?.user?.id;

  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");

  const [editRole, setEditRole] = useState("");
  const [editFullName, setEditFullName] = useState("");

  useEffect(() => {
    if (guardLoading || !privileged) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrMsg("");
      setMsg("");

      const usersRes = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at, avatar_path")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (usersRes.error) setErrMsg("Users query error: " + usersRes.error.message);
      setUsers(usersRes.data || []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [guardLoading, privileged, refreshKey]);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  async function resetUserPassword() {
    setMsg("");
    if (!selectedUserId) return setMsg("❌ Select a user");
    if (newPw.length < 6) return setMsg("❌ Password must be at least 6 chars");

    setMsg("Resetting password...");

    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: selectedUserId, new_password: newPw }),
      }
    );

    const out = await res.json();
    if (!res.ok) return setMsg("❌ " + (out.error || "Failed"));

    setMsg("✅ Password reset successfully");
    setNewPw("");
    refresh();
  }

  async function createUser() {
    setMsg("");
    if (!newUserEmail.trim()) return setMsg("❌ Email required");
    if (newUserPassword.length < 6) return setMsg("❌ Password must be at least 6 chars");

    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;

    if (!token) return setMsg("❌ Missing session token");

    // This requires an Edge Function using the Supabase service role key.
    // If you don't have it yet, you'll see an error until you deploy it.
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        email: newUserEmail.trim(),
        password: newUserPassword,
        full_name: newUserFullName.trim(),
        role: newUserRole,
      }),
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg("❌ " + (out.error || "Create user failed (deploy admin-create-user Edge Function)"));

    setMsg("✅ User created");
    setNewUserEmail("");
    setNewUserPassword("");
    setNewUserFullName("");
    setNewUserRole("user");
    refresh();
  }

  async function saveProfileEdits() {
    setMsg("");
    if (!selectedUserId) return setMsg("❌ Select a user");

    const upd = await supabase
      .from("profiles")
      .update({
        role: editRole || undefined,
        full_name: editFullName || undefined,
      })
      .eq("id", selectedUserId);

    if (upd.error) return setMsg("❌ " + upd.error.message);
    setMsg("✅ User profile updated");
    refresh();
  }

  useEffect(() => {
    const u = users.find((x) => x.id === selectedUserId);
    setEditRole(String(u?.role || "user").toLowerCase());
    setEditFullName(u?.full_name || "");
  }, [selectedUserId, users]);

  // Realtime: when a profile is created, refresh the list quickly
  useEffect(() => {
    if (!uid || !privileged) return;
    const ch = supabase.channel("admin-users");
    ch.on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, () => refresh());
    ch.on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => refresh());
    ch.subscribe();
    return () => supabase.removeChannel(ch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, privileged]);

  if (guardLoading) return null;
  if (!privileged) {
    nav("/");
    return null;
  }

  return (
    <DashboardShell
      title="Users"
      subtitle="Create and manage user accounts"
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
          <Button variant="ghost" onClick={() => nav("/change-password", { state: { redirectTo: "/admin/users" } })}>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          title={`All Users (${users.length})`}
          className="border-white/10 bg-white/5 text-white backdrop-blur"
          titleClassName="text-white"
        >
          {loading ? (
            <div className="text-sm text-white/60">Loading…</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b border-white/10 text-white/70">
                  <tr>
                    <th className="py-2">Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5">
                      <td className="py-2">{u.full_name || "-"}</td>
                      <td>{u.email || "-"}</td>
                      <td>{u.role}</td>
                      <td className="font-mono text-xs">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="grid gap-4">
          <Card
            title="Create new user"
            className="border-white/10 bg-white/5 text-white backdrop-blur"
            titleClassName="text-white"
          >
            <div className="grid gap-3">
              <TextInput
                label="Full name"
                value={newUserFullName}
                onChange={(e) => setNewUserFullName(e.target.value)}
                inputClassName="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-violet-500/40"
              />
              <TextInput
                label="Email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                inputClassName="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-violet-500/40"
              />
              <TextInput
                label="Password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                inputClassName="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-violet-500/40"
              />
              <div className="grid gap-1">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superuser">superuser</option>
                </select>
              </div>
              <Button onClick={createUser}>Create user</Button>
              <div className="text-xs text-white/50">
                Note: this calls the Edge Function <code>admin-create-user</code> (needs to be deployed).
              </div>
            </div>
          </Card>

          <Card
            title="Edit user profile / reset password"
            className="border-white/10 bg-white/5 text-white backdrop-blur"
            titleClassName="text-white"
          >
            <div className="grid gap-3">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Select user</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- choose --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.email || u.full_name || u.id}
                    </option>
                  ))}
                </select>
              </div>

              <TextInput
                label="Full name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                inputClassName="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-violet-500/40"
              />

              <div className="grid gap-1">
                <label className="text-sm font-medium">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500/40"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superuser">superuser</option>
                </select>
              </div>

              <Button variant="ghost" onClick={saveProfileEdits}>
                Save profile changes
              </Button>

              <div className="h-px bg-white/10 my-1" />

              <TextInput
                label="New password"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 6 chars"
                inputClassName="bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:ring-violet-500/40"
              />

              <Button variant="danger" onClick={resetUserPassword}>
                Reset Password
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
