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
  Camera,
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import { useAuth } from "@/frontend/lib/auth-context";
import { useTheme } from "@/frontend/lib/theme";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

const NAV = [
  { to: "/dashboard" as const, icon: Home, label: "Dashboard" },
  { to: "/scanner" as const, icon: Camera, label: "Scan Device" },
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

  // Adjust Status Bar on theme changes
  useEffect(() => {
    async function updateNativeStatusBar() {
      if (Capacitor.isNativePlatform()) {
        try {
          const { StatusBar, Style } = await import("@capacitor/status-bar");
          await StatusBar.setStyle({
            style: theme === "dark" ? Style.Dark : Style.Light,
          });
          // Match GlucoLab's color scheme
          await StatusBar.setBackgroundColor({
            color: theme === "dark" ? "#16161a" : "#fbfbfe",
          });
        } catch (err) {
          console.warn("Native StatusBar styling failed:", err);
        }
      }
    }
    updateNativeStatusBar();
  }, [theme]);

  // Haptic feedback trigger helper
  const triggerHapticFeedback = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch (err) {
        console.warn("Haptics failed:", err);
      }
    }
  };

  // We exclude /scanner from mobile bottom nav to prevent squishing
  const mobileNavItems = NAV.filter((n) => n.to !== "/scanner");
  const isMobile = Capacitor.isNativePlatform();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top bar */}
      <header className={cn(
        "sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl shrink-0",
        isMobile && "pt-safe"
      )}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link 
            to="/dashboard" 
            onClick={triggerHapticFeedback} 
            className="flex items-center gap-2.5"
          >
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

          <nav className="hidden md:flex items-center gap-1">
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
            <Button variant="ghost" size="icon" onClick={() => { triggerHapticFeedback(); toggle(); }} aria-label="Toggle theme">
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
              onClick={() => { triggerHapticFeedback(); setOpen((o) => !o); }}
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
                    onClick={() => { triggerHapticFeedback(); setOpen(false); }}
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

      {/* Main viewport with bottom safe-area considerations */}
      <main className={cn(
        "mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 flex-grow w-full",
        isMobile ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]" : "pb-24 md:pb-8"
      )}>
        {children}
      </main>

      {/* Mobile bottom nav with safe-area spacing */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl md:hidden shrink-0",
        isMobile && "pb-safe"
      )}>
        <div className="grid grid-cols-4">
          {mobileNavItems.map((n) => {
            const active = path === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={triggerHapticFeedback}
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

      {/* Floating Action Button (FAB) for Scanner with custom bottom offset for notch/Home Indicator */}
      {path !== "/scanner" && (
        <button
          onClick={() => { triggerHapticFeedback(); navigate({ to: "/scanner" }); }}
          style={{
            bottom: isMobile 
              ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))" 
              : "5rem"
          }}
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-lg hover:scale-105 transition-all duration-300 active:scale-95 md:bottom-6 md:right-6 group border border-primary/20"
          aria-label="Scan device"
        >
          <Camera className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
          <span className="sr-only">Scan Device</span>
        </button>
      )}
    </div>
  );
}
