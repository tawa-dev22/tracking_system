import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";

export default function AdminDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("user");

  const [users, setUsers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [docsByTicket, setDocsByTicket] = useState({});

  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPw, setNewPw] = useState("");
  const [msg, setMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const normalizeRole = (r) => String(r || "user").toLowerCase();
  const isPrivileged = (r) => {
    const v = normalizeRole(r);
    return v === "superuser" || v === "admin";
  };

  async function init() {
    setLoading(true);
    setErrMsg("");
    setMsg("");

    try {
      // 1) session
      const { data: sessData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        setErrMsg("Session error: " + sessErr.message);
        nav("/login");
        return;
      }

      const uid = sessData?.session?.user?.id;
      if (!uid) {
        nav("/login");
        return;
      }

      // 2) role check
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .single();

      if (profErr) {
        setErrMsg("Profile read error: " + profErr.message);
        // If we can't read profile, treat as not allowed
        nav("/dashboard");
        return;
      }

      const r = normalizeRole(prof?.role);
      setRole(r);

      // not privileged? send to normal dashboard
      if (!isPrivileged(r)) {
        nav("/");
        return;
      }

      // 3) users list
      const usersRes = await supabase
        .from("profiles")
        .select("id, full_name, email, role, created_at")
        .order("created_at", { ascending: false });

      if (usersRes.error) {
        setErrMsg("Users query error: " + usersRes.error.message);
      } else {
        setUsers(usersRes.data || []);
      }

      // 4) tickets list
      const ticketsRes = await supabase
        .from("tickets")
        .select("id, created_at, created_by, customer_name, order_no, tel_no")
        .order("created_at", { ascending: false })
        .limit(200);

      if (ticketsRes.error) {
        setErrMsg((prev) =>
          prev
            ? prev + " | Tickets error: " + ticketsRes.error.message
            : "Tickets error: " + ticketsRes.error.message
        );
      } else {
        setTickets(ticketsRes.data || []);
      }

      // 5) audit logs
      const logsRes = await supabase
        .from("audit_logs")
        .select("id, created_at, actor, action, entity, entity_id")
        .order("created_at", { ascending: false })
        .limit(100);

      if (logsRes.error) {
        setErrMsg((prev) =>
          prev
            ? prev + " | Logs error: " + logsRes.error.message
            : "Logs error: " + logsRes.error.message
        );
      } else {
        setLogs(logsRes.data || []);
      }
    } catch (e) {
      setErrMsg("Init crash: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  async function loadDocs(ticketId) {
    const res = await supabase
      .from("ticket_documents")
      .select("id, file_name, file_path, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: false });

    if (res.error) {
      setMsg("Docs error: " + res.error.message);
      return;
    }

    setDocsByTicket((p) => ({ ...p, [ticketId]: res.data || [] }));
  }

  async function download(file_path) {
    const { data, error } = await supabase.storage
      .from("ticket-docs")
      .createSignedUrl(file_path, 60);

    if (error) return setMsg("Download error: " + error.message);
    window.open(data.signedUrl, "_blank");
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
    init();
  }

  if (loading) {
    return (
      <PageShell title="Admin Dashboard">
        <Card title="Loading...">Please wait.</Card>
      </PageShell>
    );
  }

  // If user gets here but role isn't privileged, show message (should be rare because we redirect)
  if (!isPrivileged(role)) {
    return (
      <PageShell title="Admin Dashboard">
        <Card title="Access denied">
          ❌ You are not allowed to access this page.
          <p className="mt-2 text-sm">
            Detected role: <b>{String(role || "unknown")}</b>
          </p>
          {errMsg && <p className="mt-2 text-sm text-red-600">{errMsg}</p>}
        </Card>
        <Button variant="ghost" onClick={() => nav("/")}>
          Go to Dashboard
        </Button>
      </PageShell>
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    nav("/login");
  }

  return (
    <PageShell
      title="Admin Dashboard"
      actions={
        <>
          <Button variant="ghost" onClick={() => nav("/change-password")}>
            My Password
          </Button>
          <Button variant="ghost" onClick={init}>
            Refresh
          </Button>
          <Button variant="ghost" onClick={logout}>
            Logout
          </Button>
        </>
      }
    >
      {errMsg && (
        <Card title="Dashboard error">
          <p className="text-sm text-red-600">{errMsg}</p>
        </Card>
      )}

      <div className="grid gap-4 mt-4">
        <Card title="Users">
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

        <Card title="All Tickets (latest 200)">
          <div className="grid gap-3">
            {tickets.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-black/10 p-3 bg-white"
              >
                <div className="font-semibold">
                  {t.customer_name || "No customer"} — Order: {t.order_no || "-"} — Tel:{" "}
                  {t.tel_no || "-"}
                </div>
                <div className="text-xs text-black/60 font-mono">
                  {t.id} | By: {t.created_by} | {new Date(t.created_at).toLocaleString()}
                </div>

                <div className="mt-2 flex gap-2 flex-wrap">
                  <Button variant="ghost" onClick={() => loadDocs(t.id)}>
                    Load Documents
                  </Button>
                </div>

                <ul className="mt-2 list-disc pl-6 text-sm">
                  {(docsByTicket[t.id] || []).map((d) => (
                    <li key={d.id}>
                      {d.file_name}{" "}
                      <button className="underline text-sm" onClick={() => download(d.file_path)}>
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Audit Logs (latest 100)">
          <ul className="text-sm list-disc pl-6">
            {logs.map((l) => (
              <li key={l.id}>
                {new Date(l.created_at).toLocaleString()} — {l.action} {l.entity} —{" "}
                {String(l.entity_id || "")}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
