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
  const [previewMode, setPreviewMode] = useState(false);

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
      const toDateObj = new Date(toDate);
      toDateObj.setHours(23, 59, 59, 999);
      filtered = filtered.filter(t => new Date(t.date || t.created_at) <= toDateObj);
    }

    setFilteredTickets(filtered);
  }, [searchName, fromDate, toDate, tickets]);

  const generatePDF = (ticketsToExport) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(40, 40, 40);
    doc.text("Ticket Report", 14, 22);
    
    // Metadata
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Total Records: ${ticketsToExport.length}`, 14, 36);
    
    if (searchName) doc.text(`Filter - Name: ${searchName}`, 14, 42);
    if (fromDate || toDate) {
      const dateRange = `${fromDate || "N/A"} to ${toDate || "N/A"}`;
      doc.text(`Filter - Date Range: ${dateRange}`, 14, fromDate || toDate ? 48 : 42);
    }

    // Table Data
    const tableData = ticketsToExport.map(t => [
      t.username || t.profiles?.full_name || "N/A",
      t.date || new Date(t.created_at).toLocaleDateString(),
      t.order_number || t.order_no || "N/A",
      t.olt_exchange || t.exchange || "N/A",
      t.faults_type || (t.adsl ? "ADSL" : t.voice ? "VOICE" : "N/A"),
      t.time_taken || "N/A",
      t.done_by || "N/A"
    ]);

    doc.autoTable({
      startY: 54,
      head: [['User Name', 'Date', 'Order No', 'Exchange', 'Fault Type', 'Time Taken', 'Done By']],
      body: tableData,
      theme: 'grid',
      headerStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      bodyStyles: { textColor: 50 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 54 },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.pages.length - 1;
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }
    });

    const fileName = `ticket_report_${Date.now()}.pdf`;
    doc.save(fileName);
  };

  const handleExport = () => {
    if (filteredTickets.length === 0) {
      setErr("No records to export. Please adjust filters.");
      return;
    }
    generatePDF(filteredTickets);
    setErr("");
  };

  const handleExportSingle = (ticket) => {
    generatePDF([ticket]);
  };

  const resetFilters = () => {
    setSearchName("");
    setFromDate("");
    setToDate("");
    setPreviewMode(false);
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
        {/* Filters Card */}
        <Card title="Search & Filter Reports">
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
          <div className="mt-4 flex justify-end gap-2 flex-wrap">
            <Button 
              variant="ghost" 
              onClick={resetFilters}
            >
              Reset Filters
            </Button>
            <Button 
              onClick={() => setPreviewMode(!previewMode)}
            >
              {previewMode ? "Hide Preview" : "Preview Data"}
            </Button>
          </div>
        </Card>

        {/* Preview Mode */}
        {previewMode && (
          <Card title="Preview Filtered Data" className="border-blue-500/20 bg-blue-500/5">
            <p className="text-sm text-white/70 mb-4">
              Showing {filteredTickets.length} record{filteredTickets.length !== 1 ? "s" : ""} matching your filters.
            </p>
            <div className="overflow-auto">
              <table className="w-full text-xs text-white/80">
                <thead className="text-left border-b border-white/10 text-white/70">
                  <tr>
                    <th className="py-2 px-2">User</th>
                    <th className="px-2">Date</th>
                    <th className="px-2">Order</th>
                    <th className="px-2">Exchange</th>
                    <th className="px-2">Fault</th>
                    <th className="px-2">Done By</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.slice(0, 10).map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-2 px-2">{t.username || t.profiles?.full_name || "N/A"}</td>
                      <td className="px-2">{t.date || new Date(t.created_at).toLocaleDateString()}</td>
                      <td className="px-2">{t.order_number || t.order_no || "N/A"}</td>
                      <td className="px-2">{t.olt_exchange || t.exchange || "N/A"}</td>
                      <td className="px-2">{t.faults_type || "N/A"}</td>
                      <td className="px-2">{t.done_by || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTickets.length > 10 && (
                <p className="text-xs text-white/50 mt-2">Showing first 10 of {filteredTickets.length} records...</p>
              )}
            </div>
          </Card>
        )}

        {/* Error Message */}
        {err && (
          <div className="p-3 rounded-xl bg-red-500/10 text-red-600 text-sm">
            {err}
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-end">
          <Button 
            onClick={handleExport}
            disabled={filteredTickets.length === 0}
          >
            📥 Export {filteredTickets.length > 0 ? `(${filteredTickets.length})` : ""} to PDF
          </Button>
        </div>

        {/* Results Table */}
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
                    <th>Done By</th>
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
                      <td>{t.done_by || "N/A"}</td>
                      <td className="text-right">
                        <button 
                          onClick={() => handleExportSingle(t)}
                          className="text-xs text-violet-300 hover:text-violet-100 underline"
                        >
                          Export
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-4 text-center text-white/50">No records found matching filters.</td>
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
