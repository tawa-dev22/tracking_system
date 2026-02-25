import { useState, useEffect, useMemo } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import useSessionProfile from "../hooks/useSessionProfile";
import { getAvatarUrlFromPath } from "../lib/avatar";
import DashboardShell from "../Components/layout/DashboardShell";
import Card from "../Components/ui/Card";
import TextInput from "../Components/ui/TextInput";
import Button from "../Components/ui/Button";
import jsPDF from "jspdf";
import "jspdf-autotable";

export default function Reports() {
  const nav = useNavigate();
  const { loading, session, profile, privileged } = useSessionProfile();
  const uid = session?.user?.id;
  const avatarUrl = useMemo(
    () => getAvatarUrlFromPath(profile?.avatar_path),
    [profile?.avatar_path]
  );

  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [err, setErr] = useState("");

  // Filters
  const [searchName, setSearchName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    if (loading) return;
    if (!uid) nav("/login");
    loadTickets();
  }, [loading, uid, privileged]);

  async function loadTickets() {
    setLoadingTickets(true);
    setErr("");
    
    let query = supabase
      .from("tickets")
      .select(`
        *,
        profiles:created_by (full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (!privileged) {
      query = query.eq("created_by", uid);
    }

    const { data, error } = await query;
    
    if (error) {
      setErr(error.message);
    } else {
      setTickets(data || []);
      setFilteredTickets(data || []);
    }
    setLoadingTickets(false);
  }

  useEffect(() => {
    let filtered = tickets;

    if (searchName) {
      const search = searchName.toLowerCase();
      filtered = filtered.filter(t => 
        (t.username && t.username.toLowerCase().includes(search)) ||
        (t.profiles?.full_name && t.profiles.full_name.toLowerCase().includes(search)) ||
        (t.customer_name && t.customer_name.toLowerCase().includes(search))
      );
    }

    if (fromDate) {
      filtered = filtered.filter(t => new Date(t.date || t.created_at) >= new Date(fromDate));
    }

    if (toDate) {
      filtered = filtered.filter(t => new Date(t.date || t.created_at) <= new Date(toDate));
    }

    setFilteredTickets(filtered);
  }, [searchName, fromDate, toDate, tickets]);

  const exportToPDF = (ticket = null) => {
    const doc = new jsPDF();
    const dataToExport = ticket ? [ticket] : filteredTickets;

    doc.setFontSize(18);
    doc.text("Ticket Report", 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

    const tableData = dataToExport.map(t => [
      t.username || t.profiles?.full_name || "N/A",
      t.date || new Date(t.created_at).toLocaleDateString(),
      t.order_number || t.order_no || "N/A",
      t.olt_exchange || t.exchange || "N/A",
      t.faults_type || (t.adsl ? "ADSL" : t.voice ? "VOICE" : "N/A"),
      t.time_taken || "N/A"
    ]);

    doc.autoTable({
      startY: 40,
      head: [['User Name', 'Date', 'Order No', 'Exchange', 'Fault Type', 'Time Taken']],
      body: tableData,
    });

    doc.save(`report_${ticket ? ticket.id : 'filtered'}_${Date.now()}.pdf`);
  };

  const items = privileged ? [
    { to: "/admin", label: "Dashboard", icon: "🏠" },
    { to: "/admin/tickets", label: "All Tickets", icon: "🎫" },
    { to: "/admin/logs", label: "Audit Logs", icon: "🧾" },
    { to: "/admin/users", label: "Users", icon: "👥" },
    { to: "/reports", label: "Reports", icon: "📊" },
  ] : [
    { to: "/", label: "Dashboard", icon: "🏠" },
    { to: "/new", label: "New Ticket", icon: "➕" },
    { to: "/reports", label: "Reports", icon: "📊" },
  ];

  return (
    <DashboardShell
      title="Reports"
      subtitle={privileged ? "Extract and manage system reports" : "Your submission history and exports"}
      items={items}
      profile={{ ...profile, avatarUrl }}
    >
      <div className="grid gap-6">
        <Card title="Filters">
          <div className="grid gap-4 md:grid-cols-3">
            <TextInput 
              label="Search by Name" 
              placeholder="User or Customer name..." 
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <TextInput 
              label="From Date" 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
            <TextInput 
              label="To Date" 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => {
              setSearchName("");
              setFromDate("");
              setToDate("");
            }}>Reset</Button>
            <Button onClick={() => exportToPDF()}>Export Filtered to PDF</Button>
          </div>
        </Card>

        <Card title={`Results (${filteredTickets.length})`}>
          {loadingTickets ? (
            <p className="text-white/50 text-center py-4">Loading reports...</p>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm text-white/80">
                <thead className="text-left border-b border-white/10 text-white/70">
                  <tr>
                    <th className="py-2">User</th>
                    <th>Date</th>
                    <th>Order No</th>
                    <th>Exchange</th>
                    <th>Fault Type</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2">{t.username || t.profiles?.full_name || "N/A"}</td>
                      <td>{t.date || new Date(t.created_at).toLocaleDateString()}</td>
                      <td>{t.order_number || t.order_no || "N/A"}</td>
                      <td>{t.olt_exchange || t.exchange || "N/A"}</td>
                      <td>{t.faults_type || (t.adsl ? "ADSL" : t.voice ? "VOICE" : "N/A")}</td>
                      <td className="text-right">
                        <button 
                          onClick={() => exportToPDF(t)}
                          className="text-xs text-violet-300 hover:text-violet-100 underline"
                        >
                          Export PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-white/50">No records found matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  );
}
