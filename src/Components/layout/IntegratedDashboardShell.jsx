import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarInset, SidebarTrigger } from "@/Components/ui/sidebar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/Components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/Components/ui/avatar";
import { LayoutDashboard, LogOut, PanelLeft, User, Key, PlusCircle, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";

export default function IntegratedDashboardShell({ children, title, subtitle, profile, items }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  const menuItems = items || [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/new", label: "New Ticket", icon: PlusCircle },
    { to: "/reports", label: "Reports", icon: BarChart3 },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-[#0f172a] text-slate-200">
        <Sidebar collapsible="icon" className="border-r border-white/10 bg-[#1e293b]/50 backdrop-blur-xl">
          <SidebarHeader className="h-16 justify-center border-b border-white/5">
            <div className="flex items-center gap-3 px-4">
              <div className="size-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <div className="size-4 rounded-sm bg-indigo-400" />
              </div>
              <span className="font-bold tracking-tight group-data-[collapsible=icon]:hidden">Fault Tracking</span>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="py-4">
            <SidebarMenu className="px-2">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.to;
                const Icon = typeof item.icon === 'string' ? LayoutDashboard : item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      tooltip={item.label}
                      className={`h-10 px-3 rounded-lg transition-all ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'}`}
                    >
                      <Link to={item.to}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t border-white/5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors group-data-[collapsible=icon]:justify-center">
                  <Avatar className="size-8 border border-white/10">
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xs">
                      {(profile?.full_name || profile?.email || "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate">{profile?.full_name || "User"}</p>
                    <p className="text-xs text-slate-500 truncate">{profile?.email}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1e293b] border-white/10 text-slate-200">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="hover:bg-white/5 cursor-pointer">
                  <User className="mr-2 size-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/change-password")} className="hover:bg-white/5 cursor-pointer">
                  <Key className="mr-2 size-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-400 hover:bg-red-500/10 cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="bg-transparent">
          <header className="flex h-16 items-center justify-between px-6 border-b border-white/5 sticky top-0 z-10 bg-[#0f172a]/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-slate-400 hover:text-slate-200" />
              <div className="h-4 w-px bg-white/10 mx-2" />
              <div>
                <h1 className="text-lg font-semibold text-slate-100">{title}</h1>
                {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
              </div>
            </div>
          </header>
          <main className="p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
