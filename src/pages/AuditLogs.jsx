import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import useAdminGuard from "../admin/useAdminGuard";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function AuditLogs() {
  const nav = useNavigate();
  const { loading: guardLoading, isPrivileged, errMsg: guardErr } = useAdminGuard();

  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    if (!guardLoading && isPrivileged) init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardLoading, isPrivileged]);

  async function init() {
    setLoading(true);
    setErrMsg("");

    const logsRes = await supabase
      .from("audit_logs")
      .select("id, created_at, actor, action, entity, entity_id")
      .order("created_at", { ascending: false })
      .limit(200);

    if (logsRes.error) setErrMsg("Logs error: " + logsRes.error.message);
    setLogs(logsRes.data || []);
    setLoading(false);
  }

  if (guardLoading) {
    return (
      <PageShell title="Admin • Audit Logs">
        <Card title="Loading...">Please wait.</Card>
      </PageShell>
    );
  }

  if (!isPrivileged) {
    return (
      <PageShell title="Admin • Audit Logs">
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
      title="Admin • Audit Logs"
      actions={
        <>
          <Button variant="ghost" onClick={() => nav("/admin")}>
            Back
          </Button>
          <Button
            variant="ghost"
            onClick={() => nav("/change-password", { state: { redirectTo: "/admin/audit" } })}
          >
            My Password
          </Button>
          <Button variant="ghost" onClick={init}>
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
        <Card title="Loading logs...">Please wait.</Card>
      ) : (
        <Card title={`Audit Logs (latest ${logs.length})`}>
          <ul className="text-sm list-disc pl-6">
            {logs.map((l) => (
              <li key={l.id}>
                {new Date(l.created_at).toLocaleString()} — {l.action} {l.entity} —{" "}
                {String(l.entity_id || "")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </PageShell>
  );
}
