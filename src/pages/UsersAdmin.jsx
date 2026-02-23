import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useAdminGuard from "../admin/useAdminGuard";
import useRealtimeProfiles from "../hooks/useRealtimeProfiles";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

export default function UsersAdmin() {
  const nav = useNavigate();
  const { loading: guardLoading, isPrivileged, errMsg: guardErr } = useAdminGuard();

  // Realtime profiles hook (banner + toast/log)
  const { newUsers, isConnected } = useRealtimeProfiles();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);

  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  // ✅ init memoized and safe (no underline / no stale updates)
  const init = useCallback(async (signal) => {
    setLoading(true);
    setErrMsg("");
    setMsg("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .order("created_at", { ascending: false });

    // If component unmounted or effect was cleaned up, don't set state
    if (signal?.aborted) return;

    if (error) {
      setErrMsg("Users query error: " + error.message);
      setUsers([]);
    } else {
      setUsers(data || []);
    }

    setLoading(false);
  }, []); // supabase is a module singleton, safe to keep deps empty

  useEffect(() => {
    if (guardLoading || !isPrivileged) return;

    const controller = new AbortController();
    init(controller.signal);

    return () => controller.abort();
  }, [guardLoading, isPrivileged, init]);

  // Show notification when new users join
  useEffect(() => {
    if (newUsers?.length > 0) {
      console.log(`${newUsers.length} new user(s) joined`);
      // Replace with your toast lib if you want:
      // toast.info(`${newUsers.length} new user(s) joined`);
    }
  }, [newUsers]);

  const resetUserPassword = useCallback(async () => {
    setMsg("");

    if (!selectedUserId) return setMsg("❌ Select a user");
    if (newPw.length < 6) return setMsg("❌ Password must be at least 6 chars");

    setMsg("Resetting password...");

    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;

    if (!token) {
      setMsg("❌ Missing session token. Please log in again.");
      nav("/login", { replace: true });
      return;
    }

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

    let out = {};
    try {
      out = await res.json();
    } catch {
      out = {};
    }

    if (!res.ok) return setMsg("❌ " + (out.error || "Failed"));

    setMsg("✅ Password reset successfully");
    setNewPw("");
    setSelectedUserId("");

    // refresh list
    init();
  }, [selectedUserId, newPw, init, nav]);

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
        <div className="flex items-center gap-2">
          {/* Live indicator */}
          <div className="flex items-center gap-2 text-xs mr-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-white/60">
              {isConnected ? "Live" : "Offline"}
            </span>
          </div>

          <Button variant="ghost" onClick={() => nav("/admin")}>
            Back
          </Button>

          <Button
            variant="ghost"
            onClick={() =>
              nav("/change-password", { state: { redirectTo: "/admin/users" } })
            }
          >
            My Password
          </Button>

          <Button variant="ghost" onClick={() => init()}>
            Refresh
          </Button>
        </div>
      }
    >
      {/* Banner for new users */}
      {newUsers?.length > 0 && (
        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-3 text-sm text-blue-200 mb-3">
          {newUsers.length} new user{newUsers.length !== 1 ? "s" : ""} joined.
          Refresh to see them.
        </div>
      )}

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
                  className="w-full rounded-xl border border-black/15 px-3 py-2 text-black"
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

              {msg && <p className="text-sm">{msg}</p>}
            </div>
          </Card>
        </div>
      )}
    </PageShell>
  );
}