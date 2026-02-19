import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link, useNavigate } from "react-router-dom";

import PageShell from "../Components/layout/PageShell";
import Card from "../Components/ui/Card";
import Button from "../Components/ui/Button";

export default function UserDashboard() {
  const nav = useNavigate();
  const [role, setRole] = useState("user");
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    async function load() {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;
      if (!user) return;

      const prof = await supabase.from("profiles").select("role").eq("id", user.id).single();
      setRole(prof.data?.role || "user");

      const { data } = await supabase
        .from("tickets")
        .select("id, created_at, customer_name, order_no, tel_no")
        .order("created_at", { ascending: false });

      setTickets(data || []);
    }
    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    nav("/login");
  }

  const actions = (
    <>
      <Link to="/new"><Button>Create Form</Button></Link>
      <Link to="/change-password"><Button variant="ghost">Change Password</Button></Link>
      {role === "superuser" && <Link to="/admin"><Button variant="ghost">Superuser</Button></Link>}
      <Button variant="ghost" onClick={logout}>Logout</Button>
    </>
  );

  return (
    <PageShell title="Dashboard" actions={actions}>
      <Card title="My submissions">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="text-left border-b">
              <tr>
                <th className="py-2">Date</th>
                <th>Customer</th>
                <th>Order</th>
                <th>Tel</th>
                <th>Ticket ID</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b">
                  <td className="py-2">{new Date(t.created_at).toLocaleString()}</td>
                  <td>{t.customer_name || "-"}</td>
                  <td>{t.order_no || "-"}</td>
                  <td>{t.tel_no || "-"}</td>
                  <td className="font-mono text-xs">{t.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
