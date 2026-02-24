import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useAdminGuard from "../admin/useAdminGuard";
import useRealtimeProfiles from "../hooks/useRealtimeProfiles";
import useRealtimeNotifications from "../hooks/useRealtimeNotifications";
import useSessionProfile from "../hooks/useSessionProfile";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

const ROLES = ["user", "admin", "superuser"];

export default function UsersAdmin() {
  const nav = useNavigate();
  const { loading: guardLoading, isPrivileged, errMsg: guardErr } = useAdminGuard();
  const { loading: sessionLoading, session, profile } = useSessionProfile();
  const uid = session?.user?.id;
  const avatarUrl = useMemo(() => getAvatarUrlFromPath(profile?.avatar_path), [profile?.avatar_path]);
  const notif = useRealtimeNotifications({ userId: uid, isAdmin: true });
  const { newUsers } = useRealtimeProfiles();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // Password reset
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPw, setNewPw] = useState("");

  // Add user
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addPw, setAddPw] = useState("");
  const [addRole, setAddRole] = useState("user");
  const [addMsg, setAddMsg] = useState("");

  // Role change / delete
  const [roleChangeId, setRoleChangeId] = useState("");
  const [roleChangeVal, setRoleChangeVal] = useState("user");

  const init = useCallback(async (signal) => {
    setLoading(true);
    setErrMsg("");
    setMsg("");
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false });
    if (signal?.aborted) return;
    if (error) {
      setErrMsg("Users query error: " + error.message);
      setUsers([]);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (guardLoading || !isPrivileged) return;
    const controller = new AbortController();
    init(controller.signal);
    return () => controller.abort();
  }, [guardLoading, isPrivileged, init]);

  async function resetUserPassword() {
    setMsg("");
    if (!selectedUserId) return setMsg("❌ Select a user");
    if (newPw.length < 6) return setMsg("❌ Password must be at least 6 chars");
    setMsg("Resetting password...");
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) { nav("/login", { replace: true }); return; }
    const res = await fetch(
      import.meta.env.VITE_SUPABASE_URL + "/functions/v1/admin-reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ user_id: selectedUserId, new_password: newPw }),
      }
    );
    let out = {};
    try { out = await res.json(); } catch { out = {}; }
    if (!res.ok) return setMsg("❌ Failed: " + (out.error || "Unknown error"));
    setMsg("✅ Password reset successfully");
    setNewPw("");
    setSelectedUserId("");
    init();
  }

  async function changeUserRole() {
    setMsg("");
    if (!roleChangeId) return setMsg("❌ Select a user to change role");
    setMsg("Updating role...");
    const { error } = await supabase.from("profiles").update({ role: roleChangeVal }).eq("id", roleChangeId);
    if (error) return setMsg("❌ Failed: " + error.message);
    const { data: sess } = await supabase.auth.getSession();
    const actorId = sess?.session?.user?.id;
    if (actorId) {
      await supabase.from("audit_logs").insert({
        actor: actorId,
        action: "UPDATE_USER_ROLE",
        entity: "profiles",
        entity_id: roleChangeId,
      });
    }
    setMsg("✅ Role updated successfully");
    setRoleChangeId("");
    init();
  }

  async function deleteUser() {
    setMsg("");
    if (!roleChangeId) return setMsg("❌ Select a user to delete");
    const confirmed = window.confirm("Are you sure you want to delete this user? This cannot be undone.");
    if (!confirmed) return;
    setMsg("Deleting user...");
    const { error } = await supabase.from("profiles").delete().eq("id", roleChangeId);
    if (error) return setMsg("❌ Failed: " + error.message);
    const { data: sess } = await supabase.auth.getSession();
    const actorId = sess?.session?.user?.id;
    if (actorId) {
      await supabase.from("audit_logs").insert({
        actor: actorId,
        action: "DELETE_USER",
        entity: "profiles",
        entity_id: roleChangeId,
      });
    }
    setMsg("✅ User deleted successfully");
    setRoleChangeId("");
    init();
  }

  async function addUser() {
    setAddMsg("");
    if (!addEmail) return setAddMsg("❌ Email is required");
    if (addPw.length < 6) return setAddMsg("❌ Password must be at least 6 chars");
    setAddMsg("Creating user...");
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email: addEmail,
      password: addPw,
      options: { data: { full_name: addName } },
    });
    if (signupErr) return setAddMsg("❌ Failed: " + signupErr.message);
    if (signupData?.user?.id) {
      await supabase.from("profiles").upsert({
        id: signupData.user.id,
        email: addEmail,
        full_name: addName,
        role: addRole,
      });
      const { data: sess } = await supabase.auth.getSession();
      const actorId = sess?.session?.user?.id;
      if (actorId) {
        await supabase.from("audit_logs").insert({
          actor: actorId,
          action: "CREATE_USER",
          entity: "profiles",
          entity_id: signupData.user.id,
        });
      }
    }
    setAddMsg("✅ User created (pending email confirmation)");
    setAddEmail("");
    setAddName("");
    setAddPw("");
    setAddRole("user");
    init();
  }

  if (guardLoading || sessionLoading) return null;
  if (!isPrivileged) { nav("/"); return null; }

  return (
    <DashboardShell
      title="User Management"
      subtitle="Manage system users"
      items={[
        { to: "/admin", label: "Dashboard", icon: "🏠" },
        { to: "/admin/tickets", label: "All Tickets", icon: "🎫", badge: notif.newTickets || 0 },
        { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
        { to: "/admin/users", label: "Users", icon: "👥", badge: notif.newUsers || 0 },
      ]}
      profile={{ ...profile, avatarUrl }}
      topRight={
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="ghost" onClick={() => nav("/admin")}>Dashboard</Button>
          <Button variant="ghost" onClick={() => nav("/admin/logs")}>Audit Logs</Button>
          <Button variant="ghost" onClick={() => nav("/change-password", { state: { redirectTo: "/admin/users" } })}>My Password</Button>
          <Button variant="ghost" onClick={() => init()}>Refresh</Button>
        </div>
      }
    >
      {newUsers?.length > 0 && (
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm text-blue-200 mb-3">
          {newUsers.length} new user{newUsers.length !== 1 ? "s" : ""} joined. Refresh to see them.
        </div>
      )}
      {(guardErr || errMsg) && (
        <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">{guardErr || errMsg}</div>
      )}
      {msg && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80">{msg}</div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">Loading users...</div>
      ) : (
        <div className="grid gap-4 mt-4">
          {/* Users Table */}
          <Card
            title={`All Users (${users.length})`}
            className="border-white/10 bg-white/5 text-white backdrop-blur"
            titleClassName="text-white"
          >
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b border-white/10 text-white/70">
                  <tr>
                    <th className="py-2 px-2">Name</th>
                    <th className="px-2">Email</th>
                    <th className="px-2">Role</th>
                    <th className="px-2">Joined</th>
                  </tr>
                </thead>
                <tbody className="text-white/80">
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2 font-medium">{u.full_name || "-"}</td>
                      <td className="px-2">{u.email || "-"}</td>
                      <td className="px-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === "superuser" ? "bg-purple-500/20 text-purple-300" :
                          u.role === "admin" ? "bg-blue-500/20 text-blue-300" :
                          "bg-white/10 text-white/60"
                        }`}>{u.role}</span>
                      </td>
                      <td className="px-2 text-white/50 text-xs">{new Date(u.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Change Role & Delete */}
            <Card
              title="Change Role / Delete User"
              className="border-white/10 bg-white/5 text-white backdrop-blur"
              titleClassName="text-white"
            >
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-white/80">Select user</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                    value={roleChangeId}
                    onChange={(e) => {
                      setRoleChangeId(e.target.value);
                      const u = users.find(u => u.id === e.target.value);
                      if (u) setRoleChangeVal(u.role || "user");
                    }}
                  >
                    <option value="">-- choose user --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>{u.full_name || u.email || u.id}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-white/80">New Role</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                    value={roleChangeVal}
                    onChange={(e) => setRoleChangeVal(e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={changeUserRole}>Update Role</Button>
                  <Button variant="danger" onClick={deleteUser}>Delete User</Button>
                </div>
              </div>
            </Card>

            {/* Add New User */}
            <Card
              title="Add New User"
              className="border-white/10 bg-white/5 text-white backdrop-blur"
              titleClassName="text-white"
            >
              <div className="grid gap-3">
                <TextInput
                  label="Full Name"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="John Doe"
                />
                <TextInput
                  label="Email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="user@example.com"
                />
                <TextInput
                  label="Password"
                  type="password"
                  value={addPw}
                  onChange={(e) => setAddPw(e.target.value)}
                  placeholder="Min 6 chars"
                />
                <div className="grid gap-1">
                  <label className="text-sm font-medium text-white/80">Role</label>
                  <select
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <Button onClick={addUser}>Create User</Button>
                {addMsg && <p className="text-sm text-white/80">{addMsg}</p>}
              </div>
            </Card>
          </div>

          {/* Reset Password */}
          <Card
            title="Reset a User Password"
            className="border-white/10 bg-white/5 text-white backdrop-blur"
            titleClassName="text-white"
          >
            <div className="grid gap-3 max-w-xl">
              <div className="grid gap-1">
                <label className="text-sm font-medium text-white/80">Select user</label>
                <select
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">-- choose --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.email || u.full_name || u.id}</option>
                  ))}
                </select>
              </div>
              <TextInput
                label="New password"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 6 chars"
              />
              <Button variant="danger" onClick={resetUserPassword}>Reset Password</Button>
            </div>
          </Card>
        </div>
      )}
    </DashboardShell>
  );
}
