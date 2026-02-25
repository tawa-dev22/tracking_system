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
import SelectInput from "../Components/ui/SelectInput";
import Button from "../Components/ui/Button";

const ROLES = [
  { label: "User", value: "user" },
  { label: "Admin", value: "admin" },
  { label: "Superuser", value: "superuser" }
];

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

  // Form States
  const [selectedUserId, setSelectedUserId] = useState("");
  
  // Update Info Form
  const [updateName, setUpdateName] = useState("");
  
  // Assign Role Form
  const [roleVal, setRoleVal] = useState("user");
  
  // Reset Password Form
  const [newPw, setNewPw] = useState("");

  // Add User Form
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addPw, setAddPw] = useState("");
  const [addRole, setAddRole] = useState("user");

  const init = useCallback(async (signal) => {
    setLoading(true);
    setErrMsg("");
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

  const handleUserSelect = (id) => {
    setSelectedUserId(id);
    const u = users.find(u => u.id === id);
    if (u) {
      setUpdateName(u.full_name || "");
      setRoleVal(u.role || "user");
    }
  };

  async function updateUserInfo(e) {
    e.preventDefault();
    if (!selectedUserId) return setMsg("❌ Select a user first");
    setMsg("Updating info...");
    const { error } = await supabase.from("profiles").update({ full_name: updateName }).eq("id", selectedUserId);
    if (error) return setMsg("❌ Failed: " + error.message);
    setMsg("✅ User info updated");
    init();
  }

  async function assignRole(e) {
    e.preventDefault();
    if (!selectedUserId) return setMsg("❌ Select a user first");
    setMsg("Updating role...");
    const { error } = await supabase.from("profiles").update({ role: roleVal }).eq("id", selectedUserId);
    if (error) return setMsg("❌ Failed: " + error.message);
    setMsg("✅ Role updated successfully");
    init();
  }

  async function resetPassword(e) {
    e.preventDefault();
    if (!selectedUserId) return setMsg("❌ Select a user first");
    if (newPw.length < 6) return setMsg("❌ Password must be at least 6 chars");
    setMsg("Resetting password...");
    
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    
    const res = await fetch(
      import.meta.env.VITE_SUPABASE_URL + "/functions/v1/admin-reset-password",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ user_id: selectedUserId, new_password: newPw }),
      }
    );
    
    if (!res.ok) {
      const out = await res.json().catch(() => ({}));
      return setMsg("❌ Failed: " + (out.error || "Unknown error"));
    }
    
    setMsg("✅ Password reset successfully");
    setNewPw("");
  }

  async function toggleAccountStatus() {
    if (!selectedUserId) return setMsg("❌ Select a user first");
    setMsg("Feature coming soon: Account activation/deactivation requires Edge Function.");
  }

  async function addNewUser(e) {
    e.preventDefault();
    setMsg("Creating user...");
    const { data: signupData, error: signupErr } = await supabase.auth.signUp({
      email: addEmail,
      password: addPw,
      options: { data: { full_name: addName } },
    });
    if (signupErr) return setMsg("❌ Failed: " + signupErr.message);
    if (signupData?.user?.id) {
      await supabase.from("profiles").upsert({
        id: signupData.user.id,
        email: addEmail,
        full_name: addName,
        role: addRole,
      });
    }
    setMsg("✅ User created successfully");
    setAddEmail(""); setAddName(""); setAddPw("");
    init();
  }

  if (guardLoading || sessionLoading) return null;
  if (!isPrivileged) { nav("/"); return null; }

  const items = [
    { to: "/admin", label: "Dashboard", icon: "🏠" },
    { to: "/admin/tickets", label: "All Tickets", icon: "🎫", badge: notif.newTickets || 0 },
    { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
    { to: "/admin/users", label: "Users", icon: "👥", badge: notif.newUsers || 0 },
    { to: "/reports", label: "Reports", icon: "📊" },
  ];

  return (
    <DashboardShell
      title="User Management"
      subtitle="Manage system users with independent actions"
      items={items}
      profile={{ ...profile, avatarUrl }}
    >
      <div className="grid gap-6">
        {msg && (
          <div className={`p-3 rounded-xl text-sm ${msg.startsWith("✅") ? "bg-green-500/10 text-green-600" : "bg-blue-500/10 text-blue-600"}`}>
            {msg}
          </div>
        )}

        <Card title="1. Select User to Manage">
          <SelectInput 
            label="Choose a user from the list"
            value={selectedUserId}
            onChange={(e) => handleUserSelect(e.target.value)}
            options={users.map(u => ({ label: `${u.full_name || u.email} (${u.role})`, value: u.id }))}
          />
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Update Info Form */}
          <Card title="Update User Information">
            <form onSubmit={updateUserInfo} className="grid gap-4">
              <TextInput 
                label="Full Name" 
                value={updateName} 
                onChange={(e) => setUpdateName(e.target.value)} 
                required 
              />
              <Button type="submit" disabled={!selectedUserId}>Update Info</Button>
            </form>
          </Card>

          {/* Assign Role Form */}
          <Card title="Assign Role">
            <form onSubmit={assignRole} className="grid gap-4">
              <SelectInput 
                label="Select New Role" 
                value={roleVal} 
                onChange={(e) => setRoleVal(e.target.value)} 
                options={ROLES}
                required 
              />
              <Button type="submit" disabled={!selectedUserId}>Assign Role</Button>
            </form>
          </Card>

          {/* Reset Password Form */}
          <Card title="Reset Password">
            <form onSubmit={resetPassword} className="grid gap-4">
              <TextInput 
                label="New Password" 
                type="password" 
                value={newPw} 
                onChange={(e) => setNewPw(e.target.value)} 
                placeholder="Min 6 characters"
                required 
              />
              <Button type="submit" disabled={!selectedUserId}>Reset Password</Button>
            </form>
          </Card>

          {/* Account Status Form */}
          <Card title="Account Status">
            <div className="grid gap-4">
              <p className="text-sm text-white/60">Activate or deactivate this user's access to the system.</p>
              <Button 
                variant="ghost" 
                onClick={toggleAccountStatus} 
                disabled={!selectedUserId}
                className="border-red-500/50 text-red-400 hover:bg-red-500/10"
              >
                Activate / Deactivate Account
              </Button>
            </div>
          </Card>
        </div>

        <Card title="Add New User">
          <form onSubmit={addNewUser} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-end">
            <TextInput label="Email" type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} required />
            <TextInput label="Full Name" value={addName} onChange={(e) => setAddName(e.target.value)} required />
            <TextInput label="Password" type="password" value={addPw} onChange={(e) => setAddPw(e.target.value)} required />
            <SelectInput label="Role" value={addRole} onChange={(e) => setAddRole(e.target.value)} options={ROLES} required />
            <div className="lg:col-span-4 flex justify-end">
              <Button type="submit">Create User Account</Button>
            </div>
          </form>
        </Card>

        <Card title="User List Preview">
          <div className="overflow-auto">
            <table className="w-full text-sm text-white/80">
              <thead className="text-left border-b border-white/10 text-white/70">
                <tr>
                  <th className="py-2">Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={`border-b border-white/5 hover:bg-white/5 cursor-pointer ${selectedUserId === u.id ? 'bg-white/10' : ''}`} onClick={() => handleUserSelect(u.id)}>
                    <td className="py-2">{u.full_name || "-"}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${u.role === 'admin' ? 'bg-blue-500/20 text-blue-300' : 'bg-white/10 text-white/60'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="text-white/50">{new Date(u.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
