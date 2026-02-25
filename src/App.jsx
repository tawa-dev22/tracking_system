import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import ProtectedRoute from "./Components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import ChangePassword from "./pages/ChangePassword";
import CreateTicket from "./pages/CreateTicket";
import Reports from "./pages/Reports";
import { RealtimeProvider } from "./contexts/RealtimeContext";
import AdminHome from "./pages/AdminHome";
import UsersAdmin from "./pages/UsersAdmin";
import AllTickets from "./pages/AllTickets";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  const [session, setSession] = useState(null);
  // sessionLoading is true until we've checked localStorage for an existing session
  // This prevents a flash redirect to /login on page refresh
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage on mount (JWT persisted by Supabase)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setSessionLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setSessionLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <RealtimeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/change-password"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <ChangePassword />
            </ProtectedRoute>
          }
        />

        <Route
          path="/new"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <CreateTicket />
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <AdminHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <UsersAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <AllTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute session={session} sessionLoading={sessionLoading}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
      </Routes>
    </RealtimeProvider>
  );
}
