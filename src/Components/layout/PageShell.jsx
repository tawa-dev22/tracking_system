import { useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

const PageShell = ({ title, actions, children, showLogout = true }) => {
  const nav = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    nav("/login");
  }

  return (
    <div className="min-h-screen bg-BLUE text-white">
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-2xl font-extrabold text-white">{title}</h1>
          <div className="flex gap-2 flex-wrap items-center">
            {actions}
            {showLogout && (
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 transition"
                title="Logout"
              >
                <span>🚪</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

export default PageShell;
