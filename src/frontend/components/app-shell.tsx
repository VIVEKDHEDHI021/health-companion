import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import {
  Activity,
  Home,
  History,
  BarChart3,
  FileDown,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/frontend/lib/auth-context";
import { useTheme } from "@/frontend/lib/theme";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import { useNotifications } from "@/frontend/hooks/useNotifications";

const NAV = [
  { to: "/dashboard" as const, icon: Home, label: "Dashboard" },
  { to: "/history" as const, icon: History, label: "History" },
  { to: "/reports" as const, icon: BarChart3, label: "Reports" },
  { to: "/export" as const, icon: FileDown, label: "Export" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary shadow-soft">
              <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-base font-bold">GlucoLab</div>
              <div className="text-[10px] font-semibold uppercase tracking-widest text-primary">
                Pro
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => {
              const active = path === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="hidden md:inline-flex"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label="Menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile menu */}
        {open && (
          <div className="border-t border-border bg-card md:hidden">
            <div className="space-y-1 px-3 py-3">
              {NAV.map((n) => {
                const active = path === n.to;
                const Icon = n.icon;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium",
                      active ? "bg-primary-soft text-primary" : "text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {n.label}
                  </Link>
                );
              })}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-base font-medium text-destructive hover:bg-muted"
              >
                <LogOut className="h-5 w-5" /> Sign out
              </button>
              <div className="px-3 pt-2 text-xs text-muted-foreground">
                Signed in as {user?.email}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 pb-24 md:pb-8">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-4">
          {NAV.map((n) => {
            const active = path === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
