import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

import ProtectedRoute from "./Components/auth/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/UserDashboard";
import ChangePassword from "./pages/ChangePassword";
import NewTicketWizard from "./pages/NewTicketWizard";
import { RealtimeProvider } from './contexts/RealtimeContext';
// ✅ replace old AdminDashboard usage with the new pages
import AdminHome from "./pages/AdminHome";
import UsersAdmin from "./pages/UsersAdmin";
import AllTickets from "./pages/AllTickets";
import AuditLogs from "./pages/AuditLogs";

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
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
          <ProtectedRoute session={session}>
            <UserDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/change-password"
        element={
          <ProtectedRoute session={session}>
            <ChangePassword />
          </ProtectedRoute>
        }
      />

      <Route
        path="/new"
        element={
          <ProtectedRoute session={session}>
            <NewTicketWizard />
          </ProtectedRoute>
        }
      />

      {/* ✅ Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute session={session}>
            <AdminHome />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute session={session}>
            <UsersAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <ProtectedRoute session={session}>
            <AllTickets />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute session={session}>
            <AuditLogs />
          </ProtectedRoute>
        }
      />
    </Routes>
    </RealtimeProvider>
  );
}
