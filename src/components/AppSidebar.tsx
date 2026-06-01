import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, ClipboardCheck,
  FileBarChart, Settings, LogOut, User,
} from "lucide-react";
import { useAuth, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";

type Item = { title: string; to: string; icon: typeof LayoutDashboard; roles: AppRole[] };

const items: Item[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard, roles: ["admin", "faculty", "student"] },
  { title: "Students", to: "/students", icon: Users, roles: ["admin", "faculty"] },
  { title: "Faculty", to: "/faculty", icon: GraduationCap, roles: ["admin"] },
  { title: "Classes", to: "/classes", icon: BookOpen, roles: ["admin", "faculty"] },
  { title: "Attendance", to: "/attendance", icon: ClipboardCheck, roles: ["admin", "faculty"] },
  { title: "My Attendance", to: "/my-attendance", icon: ClipboardCheck, roles: ["student"] },
  { title: "Reports", to: "/reports", icon: FileBarChart, roles: ["admin", "faculty"] },
  { title: "Settings", to: "/settings", icon: Settings, roles: ["admin", "faculty", "student"] },
];

export function AppSidebar() {
  const { role, user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const visible = items.filter(i => role && i.roles.includes(role));

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold">EduTrack</span>
            <span className="text-xs text-sidebar-foreground/70 capitalize">{role ?? "user"}</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visible.map(item => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to}>
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent">
            <User className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <p className="truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
