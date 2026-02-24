import { Navigate, useLocation } from "react-router-dom";

/**
 * ProtectedRoute
 * - Shows a loading spinner while session is being resolved from localStorage/JWT
 * - Saves the current path to sessionStorage so the app can resume after login
 * - Redirects to /login if no session is found
 */
export default function ProtectedRoute({ session, sessionLoading, children }) {
  const location = useLocation();

  // While the session is being resolved from localStorage/JWT, show a loader
  // This prevents a flash redirect to /login on page refresh
  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0f0f1a]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/50 text-sm">Restoring session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Save the current path so we can redirect back after login
    sessionStorage.setItem("redirect_after_login", location.pathname + location.search);
    return <Navigate to="/login" replace />;
  }

  return children;
}
