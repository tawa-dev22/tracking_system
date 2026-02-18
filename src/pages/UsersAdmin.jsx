import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useAdminGuard from "../admin/useAdminGuard";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

export default function UsersAdmin() {
  const nav = useNavigate();
  const { loading: guardLoading, isPrivileged, errMsg: guardErr } = useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (guardLoading || !isPrivileged) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      setErrMsg("");
      setMsg("");

      const usersRes = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (usersRes.error) setErrMsg("Users query error: " + usersRes.error.message);
      setUsers(usersRes.data || []);
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [guardLoading, isPrivileged, refreshKey]);

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

  if (guardLoading) {
    return (
      <PageShell title="Admin • Users">
        <Card title="Loading...">Please wait.</Card>
      </PageShell>
    );
  }

  if (!isPrivileged) {
    return (
      <PageShell title="Admin • Users">
        <Card title="Access denied">
          ❌ You are not allowed to access this page.
          {guardErr && <p className="mt-2 text-sm text-red-600">{guardErr}</p>}
        </Card>
        <Button variant="ghost" onClick={() => nav("/")}>
          Go to Dashboard
        </Button>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Admin • Users"
      actions={
        <>
          <Button variant="ghost" onClick={() => nav("/admin")}>
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav("/change-password", { state: { redirectTo: "/admin/users" } })}
          >
            My Password
          </Button>
          <Button variant="ghost" onClick={refresh}>
            Refresh
          </Button>
        </>
      }
    >
      {(guardErr || errMsg) && (
        <Card title="Notice">
          <p className="text-sm text-red-600">{guardErr || errMsg}</p>
        </Card>
      )}

      {loading ? (
        <Card title="Loading users...">Please wait.</Card>
      ) : (
        <div className="grid gap-4 mt-4">
          <Card title={`Users (${users.length})`}>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-left border-b">
                  <tr>
                    <th className="py-2">Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>User ID</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b">
                      <td className="py-2">{u.full_name || "-"}</td>
                      <td>{u.email || "-"}</td>
                      <td>{u.role}</td>
                      <td className="font-mono text-xs">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card title="Reset a user's password">
            <div className="grid gap-3 max-w-xl">
              <div className="grid gap-1">
                <label className="text-sm font-medium">Select user</label>
                <select
                  className="w-full rounded-xl border border-black/15 px-3 py-2"
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
                label="New password"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="Min 6 chars"
              />

              <Button variant="danger" onClick={resetUserPassword}>
                Reset Password
              </Button>

              <p className="text-sm">{msg}</p>
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}
