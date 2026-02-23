import { useNavigate } from "react-router-dom";
import useAdminGuard from "../admin/useAdminGuard";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function AdminHome() {
  const nav = useNavigate();
  const { loading, errMsg, isPrivileged } = useAdminGuard();

  if (loading) {
    return (
      <PageShell title="Admin">
        <Card title="Loading...">Please wait.</Card>
      </PageShell>
    );
  }

  if (!isPrivileged) {
    return (
      <PageShell title="Admin">
        <Card title="Access denied">
          ❌ You are not allowed to access this page.
          {errMsg && <p className="mt-2 text-sm text-red-600">{errMsg}</p>}
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Admin"
      actions={
        <>
          <Button
            variant="ghost"
            onClick={() => nav("/change-password", { state: { redirectTo: "/admin" } })}
          >
            My Password
          </Button>
        </>
      }
    >
      {errMsg && (
        <Card title="Admin notice">
          <p className="text-sm text-red-600">{errMsg}</p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3 mt-4">
        <Card title="Users">
          <p className="text-sm text-black/70">Manage users and reset passwords.</p>
          <div className="mt-3">
            <Button onClick={() => nav("/admin/users")}>Open</Button>
          </div>
        </Card>

        <Card title="All Tickets">
          <p className="text-sm text-black/70">View tickets and download documents.</p>
          <div className="mt-3">
            <Button onClick={() => nav("/admin/tickets")}>Open</Button>
          </div>
        </Card>

        <Card title="Audit Logs">
          <p className="text-sm text-black/70">Track actions performed in the system.</p>
          <div className="mt-3">
            <Button onClick={() => nav("/admin/logs")}>Open</Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
