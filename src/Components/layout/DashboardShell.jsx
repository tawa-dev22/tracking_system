import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import Avatar from "../ui/Avatar";

function NavItem({ to, label, icon, badge }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition"
    >
      <span className="flex items-center gap-2">
        <span className="opacity-80">{icon}</span>
        <span className="font-medium">{label}</span>
      </span>
      {badge ? (
        <span className="min-w-6 h-6 px-2 grid place-items-center rounded-full bg-violet-500/90 text-xs font-bold text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

function IconDot() {
  return <span className="inline-block size-2 rounded-full bg-white/50" />;
}

export default function DashboardShell({
  appName = "Fault Tracking",
  menuTitle = "MAIN MENU",
  title,
  subtitle,
  items,
  topRight,
  profile,
  notificationBadge,
  children,
}) {
  const nav = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    nav("/login");
  }

  return (
    <div className="min-h-screen bg-[#07070c] text-white">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(800px_circle_at_40%_0%,rgba(139,92,246,0.22),transparent_55%),radial-gradient(600px_circle_at_90%_10%,rgba(59,130,246,0.12),transparent_50%)]" />

      <div className="relative grid min-h-screen grid-cols-1 lg:grid-cols-[280px_1fr]">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="p-5 flex items-center gap-3">
            <div className="size-9 rounded-xl bg-gradient-to-tr from-violet-500 to-fuchsia-500" />
            <div>
              <div className="text-sm font-bold tracking-wide">{appName}</div>
              <div className="text-xs text-white/60">{menuTitle}</div>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="text-xs tracking-widest text-white/40 px-3 mb-2">MENU</div>
            <nav className="grid gap-1">
              {(items || []).map((it) => (
                <NavItem key={it.to} {...it} />
              ))}
            </nav>
          </div>

          <div className="mt-auto p-4 border-t border-white/10">
            <div className="flex items-center gap-3">
              <Avatar name={profile?.full_name || profile?.email} src={profile?.avatarUrl} size={36} />
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">
                  {profile?.full_name || profile?.email || "Account"}
                </div>
                <div className="text-xs text-white/50 truncate">{profile?.email || ""}</div>
              </div>
              <button
                className="ml-auto text-xs text-white/70 hover:text-white underline"
                onClick={logout}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="p-4 sm:p-6 lg:p-8">
          <div className="flex flex-col gap-4">
            {/* Topbar */}
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
                  {title}
                </div>
                {subtitle && <div className="text-sm text-white/50">{subtitle}</div>}
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to="/profile"
                  className="hidden sm:flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                >
                  <IconDot />
                  <span>Profile</span>
                </Link>

                <Link
                  to={profile?.role === "admin" || profile?.role === "superuser" ? "/admin/messages" : "/messages"}
                  className="relative flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10"
                  title="Notifications"
                >
                  <span className="text-white/80">🔔</span>
                  <span className="hidden sm:inline">Notifications</span>
                  {notificationBadge ? (
                    <span className="absolute -top-2 -right-2 size-5 grid place-items-center rounded-full bg-violet-500 text-xs font-bold">
                      {notificationBadge > 9 ? "9+" : notificationBadge}
                    </span>
                  ) : null}
                </Link>

                {topRight}
              </div>
            </div>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

