import * as React from "react";
import { createFileRoute, Link, useNavigate, Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useProfile, profileDisplayName } from "@/lib/profile";
import { useNotificationScheduler } from "@/lib/notification-scheduler";
import { UserAvatar } from "@/components/user-avatar";
import { ProfileSheet } from "@/components/profile-sheet";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  BarChart3,
  Briefcase,
  GraduationCap,
  MoreHorizontal,
  CalendarCheck,
  Target,
  BookOpen,
  Settings as SettingsIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/habits", label: "Habits", icon: Flame },
] as const;

const moreItems = [
  { to: "/focus", label: "Focus", icon: Target },
  { to: "/review", label: "Review", icon: CalendarCheck },
  { to: "/career", label: "Career", icon: Briefcase },
  { to: "/study", label: "Study", icon: GraduationCap },
  { to: "/interview", label: "Interview", icon: BookOpen },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const mobileBottom = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/habits", label: "Habits", icon: Flame },
] as const;

function AppShell() {
  const { user, loading, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const [profileOpen, setProfileOpen] = React.useState(false);
  useNotificationScheduler();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/auth" });
    }
  }, [user, loading, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-pulse rounded-full gradient-primary" />
      </div>
    );
  }

  const displayName = profileDisplayName(profile, user);

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-border bg-sidebar p-5">
        <Link to="/dashboard" className="flex items-center gap-2 mb-8">
          <div className="grid place-items-center h-9 w-9 rounded-xl gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-display text-lg font-bold leading-none">FocusEdge</div>
            <div className="text-[10px] text-muted-foreground mt-1">Personal Life OS</div>
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <SideLink key={item.to} item={item} active={location.pathname.startsWith(item.to)} />
          ))}

          <div className="pt-6 pb-2 px-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Phase 2
          </div>
          {moreItems.map((item) => (
            <SideLink key={item.to} item={item} active={location.pathname.startsWith(item.to)} />
          ))}
        </nav>

        <div className="mt-auto pt-4 border-t border-border">
          <button
            onClick={() => setProfileOpen(true)}
            className="press hover-lift w-full flex items-center gap-3 rounded-xl bg-sidebar-accent/40 p-3 text-left hover:bg-sidebar-accent/70 transition-colors"
          >
            <UserAvatar profile={profile} name={displayName} size={36} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{displayName}</div>
              <div className="truncate text-xs text-muted-foreground">{user.email}</div>
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); signOut(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); signOut(); } }}
              className="grid h-8 w-8 place-items-center rounded-md hover:bg-background/40 text-muted-foreground"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </span>
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur lg:px-8">
          <div className="lg:hidden flex items-center gap-2">
            <div className="grid place-items-center h-8 w-8 rounded-lg gradient-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-display font-bold">FocusEdge</span>
          </div>
          <div className="hidden lg:block text-sm text-muted-foreground">
            {greetingText()}, <span className="text-foreground font-semibold">{displayName}</span> 👋
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setProfileOpen(true)}
              className="press group relative mr-1 rounded-full p-0.5 hover:ring-2 hover:ring-primary/40 hover:ring-offset-2 hover:ring-offset-background transition-all"
              aria-label="Edit profile"
            >
              <UserAvatar profile={profile} name={displayName} size={32} />
              <span className="absolute -bottom-0.5 -right-0.5 grid h-3.5 w-3.5 place-items-center rounded-full gradient-primary ring-2 ring-background opacity-0 group-hover:opacity-100 transition-opacity">
                <Sparkles className="h-2 w-2 text-white" />
              </span>
            </button>
            <Button size="icon" variant="ghost" onClick={toggle} aria-label="Toggle theme" className="press">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <NotificationBell />
            <Link to="/settings/notifications" aria-label="Notification settings" className="press hidden sm:grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
              <SettingsIcon className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <main className="flex-1 pb-24 lg:pb-8">
          <Outlet />
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur">
          <div className="grid grid-cols-4">
            {mobileBottom.map((item) => {
              const active = location.pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className={cn("h-5 w-5", active && "drop-shadow-[0_0_8px_currentColor]")} />
                  {item.label}
                </Link>
              );
            })}
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger asChild>
                <button className="flex flex-col items-center justify-center gap-1 py-3 text-[11px] font-medium text-muted-foreground">
                  <MoreHorizontal className="h-5 w-5" />
                  More
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl">
                <SheetHeader>
                  <SheetTitle className="font-display">More</SheetTitle>
                </SheetHeader>
                <button
                  onClick={() => { setMoreOpen(false); setProfileOpen(true); }}
                  className="press hover-lift mt-4 flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3 text-left"
                >
                  <UserAvatar profile={profile} name={displayName} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{displayName}</div>
                    <div className="truncate text-xs text-muted-foreground">Edit profile</div>
                  </div>
                  <Sparkles className="h-4 w-4 text-primary" />
                </button>
                <div className="grid grid-cols-3 gap-3 py-6">
                  {moreItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMoreOpen(false)}
                      className="press hover-lift flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="grid place-items-center h-10 w-10 rounded-xl gradient-primary">
                        <item.icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-xs font-semibold">{item.label}</span>
                    </Link>
                  ))}
                </div>
                <button
                  onClick={() => { setMoreOpen(false); signOut(); }}
                  className="press w-full rounded-xl border border-border py-3 text-sm font-semibold text-muted-foreground hover:bg-muted"
                >
                  <LogOut className="inline h-4 w-4 mr-2" /> Sign out
                </button>
              </SheetContent>
            </Sheet>
          </div>
        </nav>

        <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
      </div>
    </div>
  );
}

function SideLink({ item, active }: { item: { to: string; label: string; icon: any }; active: boolean }) {
  return (
    <Link
      to={item.to}
      className={cn(
        "press group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all overflow-hidden",
        active
          ? "gradient-primary text-white shadow-glow"
          : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:translate-x-0.5",
      )}
    >
      {!active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-0 w-0.5 rounded-r-full bg-primary transition-all duration-200 group-hover:h-5" />
      )}
      <item.icon className={cn("h-4 w-4 transition-transform", active && "drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]")} />
      {item.label}
    </Link>
  );
}

function greetingText() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
