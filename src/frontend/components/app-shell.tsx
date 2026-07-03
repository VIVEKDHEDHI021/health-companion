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
  Camera,
  Settings,
  User,
  HelpCircle,
  Info,
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import { useAuth } from "@/frontend/lib/auth-context";
import { useTheme } from "@/frontend/lib/theme";
import { Button } from "@/frontend/components/ui/button";
import { cn } from "@/frontend/lib/utils";
import { useNotifications } from "@/frontend/hooks/useNotifications";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/frontend/components/ui/sheet";

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
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const handleHelpClick = () => {
    triggerHapticFeedback();
    setDrawerOpen(false);
    toast.info("GlucoLab Support: Please contact support@glucolab.com for inquiries.");
  };

  const handleAboutClick = () => {
    triggerHapticFeedback();
    setDrawerOpen(false);
    toast.info("GlucoLab Pro v2.4.0. Designed for offline-first medical companion logging.");
  };

  // We exclude /scanner from mobile bottom nav to prevent squishing
  const mobileNavItems = NAV.filter((n) => n.to !== "/scanner");
  const isMobile = Capacitor.isNativePlatform();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col theme-transition">
      {/* Top bar */}
      <header className={cn(
        "sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl shrink-0 theme-transition",
        isMobile && "pt-safe"
      )}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {/* Navigation Drawer Trigger */}
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={triggerHapticFeedback}
                  aria-label="Open Navigation Menu"
                  className="btn-ripple-effect"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-6 flex flex-col justify-between">
                <div className="space-y-6">
                  <SheetHeader className="text-left">
                    <SheetTitle className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary text-white">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="font-display font-bold">GlucoLab Pro</div>
                    </SheetTitle>
                  </SheetHeader>

                  <div className="space-y-1.5">
                    {NAV.map((n) => {
                      const active = path === n.to;
                      const Icon = n.icon;
                      return (
                        <Link
                          key={n.to}
                          to={n.to}
                          onClick={() => {
                            triggerHapticFeedback();
                            setDrawerOpen(false);
                          }}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                            active
                              ? "bg-primary-soft text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {n.label}
                        </Link>
                      );
                    })}

                    <div className="border-t border-border/60 my-2 pt-2" />

                    <Link
                      to="/profile"
                      onClick={() => {
                        triggerHapticFeedback();
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                        path === "/profile"
                          ? "bg-primary-soft text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <User className="h-4 w-4" />
                      Profile
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => {
                        triggerHapticFeedback();
                        setDrawerOpen(false);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                        path === "/settings"
                          ? "bg-primary-soft text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>

                    <button
                      onClick={handleHelpClick}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <HelpCircle className="h-4 w-4" />
                      Help & Support
                    </button>

                    <button
                      onClick={handleAboutClick}
                      className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                      <Info className="h-4 w-4" />
                      About GlucoLab
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="px-2 text-xs text-muted-foreground break-all">
                    Signed in as <span className="font-semibold">{user?.email || "guest"}</span>
                  </div>
                  <Button
                    onClick={handleSignOut}
                    variant="destructive"
                    className="w-full justify-start gap-2.5 rounded-xl btn-ripple-effect"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link
              to="/dashboard"
              onClick={triggerHapticFeedback}
              className="flex items-center gap-2"
            >
              <div className="hidden xs:flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-soft">
                <Activity className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div className="leading-tight">
                <div className="font-display text-sm font-bold">GlucoLab</div>
                <div className="text-[9px] font-semibold uppercase tracking-widest text-primary">
                  Pro
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {NAV.map((n) => {
              const active = path === n.to;
              const Icon = n.icon;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                triggerHapticFeedback();
                toggle();
              }}
              aria-label="Toggle theme"
              className="btn-ripple-effect"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main viewport with bottom safe-area considerations */}
      <main className={cn(
        "mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 flex-grow w-full animate-fade-in",
        isMobile ? "pb-[calc(6rem+env(safe-area-inset-bottom,0px))]" : "pb-24 md:pb-8"
      )}>
        {children}
      </main>

      {/* Mobile bottom nav with safe-area spacing */}
      <nav className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl md:hidden shrink-0 theme-transition",
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
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button (FAB) for Scanner with custom bottom offset */}
      {path !== "/scanner" && (
        <button
          onClick={() => {
            triggerHapticFeedback();
            navigate({ to: "/scanner" });
          }}
          style={{
            bottom: isMobile
              ? "calc(4.5rem + env(safe-area-inset-bottom, 0px))"
              : "5rem",
          }}
          className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full gradient-primary text-primary-foreground shadow-lg hover:scale-105 transition-all duration-300 active:scale-95 md:bottom-6 md:right-6 group border border-primary/20 cursor-pointer"
          aria-label="Scan device"
        >
          <Camera className="h-6 w-6 group-hover:rotate-12 transition-transform duration-300" />
          <span className="sr-only">Scan Device</span>
        </button>
      )}
    </div>
  );
}
