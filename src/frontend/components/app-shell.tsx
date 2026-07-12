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
  Settings,
  User,
  HelpCircle,
  Info,
} from "lucide-react";
import { useState, type ReactNode, useEffect } from "react";
import { useAuth } from "@/frontend/lib/auth-context";
import { useTheme } from "@/frontend/lib/theme";
import { useHealthData } from "@/frontend/providers/data-context";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/frontend/components/ui/dialog";

const NAV = [
  { to: "/dashboard" as const, icon: Home, label: "Dashboard" },
  { to: "/history" as const, icon: History, label: "History" },
  { to: "/reports" as const, icon: BarChart3, label: "Reports" },
  { to: "/export" as const, icon: FileDown, label: "Export" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { profileName } = useHealthData();
  useNotifications();

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        // Scrolling down
        setShowBottomNav(false);
      } else {
        // Scrolling up
        setShowBottomNav(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
          // Make status bar transparent and overlay the webview so the app blends with it
          await StatusBar.setOverlaysWebView({ overlay: true });
          await StatusBar.setBackgroundColor({ color: "#00000000" });
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
    setHelpOpen(true);
  };

  const handleAboutClick = () => {
    triggerHapticFeedback();
    setDrawerOpen(false);
    setAboutOpen(true);
  };

  // We exclude /scanner from mobile bottom nav to prevent squishing
  const mobileNavItems = NAV;
  const isMobile = Capacitor.isNativePlatform();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col theme-transition">
      {/* Top bar */}
      <header className={cn(
        "sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-xl shrink-0 theme-transition",
        isMobile ? "pt-[calc(max(env(safe-area-inset-top),28px))]" : ""
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
            {profileName && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-border/80 pl-2.5 text-[11px] font-semibold text-muted-foreground leading-none">
                <span>{greeting},</span>
                <span className="text-foreground font-bold truncate max-w-[100px]">{profileName}</span>
              </div>
            )}
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
            {/* Desktop Navigation Shortcuts */}
            <div className="hidden md:flex items-center gap-1">
              <Link
                to="/profile"
                onClick={triggerHapticFeedback}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:bg-muted text-muted-foreground",
                  path === "/profile" && "bg-primary-soft text-primary hover:bg-primary-soft font-semibold"
                )}
                title="Profile"
              >
                <User className="h-4.5 w-4.5" />
              </Link>
              <Link
                to="/settings"
                onClick={triggerHapticFeedback}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 hover:bg-muted text-muted-foreground",
                  path === "/settings" && "bg-primary-soft text-primary hover:bg-primary-soft font-semibold"
                )}
                title="Settings"
              >
                <Settings className="h-4.5 w-4.5" />
              </Link>
            </div>

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

            {/* Desktop Sign Out Shortcut */}
            <div className="hidden md:block">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                aria-label="Sign out"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 btn-ripple-effect"
                title="Sign Out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
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
        "fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur-xl md:hidden shrink-0 theme-transition transition-transform duration-300",
        !showBottomNav && "translate-y-full",
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


      {/* Help & Support Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" /> Help & Support
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Frequently asked questions and support contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2 text-sm max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">How to record readings?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click the "+" buttons on the Dashboard to record blood glucose, insulin doses, or body weight. You can categorize readings by time (Before/After meals, Fasting, Bedtime).
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">How to use the Smart Scanner?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Tap the floating camera button. Hold your phone steady and frame your glucose meter display. Tap capture. The OCR will parse the digits automatically. Review and edit the reading before saving.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-foreground">Does it work offline?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes! GlucoLab runs entirely offline. All data is saved securely on your device. Once you restore internet connection, it automatically syncs with the secure cloud.
              </p>
            </div>
            <div className="border-t border-border/60 my-2 pt-3" />
            <div className="space-y-1 bg-primary-soft p-3 rounded-2xl border border-primary/10">
              <h4 className="font-semibold text-primary">Need Contact Support?</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                For questions, feature requests, or technical issues, reach out directly at:
              </p>
              <p className="text-xs font-bold text-foreground mt-1">support@glucolab.com</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* About Dialog */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" /> About GlucoLab
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              App specifications and clinical disclaimers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 my-2 text-sm text-center">
            <div className="flex flex-col items-center justify-center space-y-2 py-2">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary text-white shadow-soft">
                <Activity className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <h3 className="font-display text-lg font-bold">GlucoLab Pro</h3>
              <p className="text-xs text-primary font-semibold tracking-widest uppercase">Version 2.4.0 (Build 90)</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed text-left">
              GlucoLab Pro is a modern, next-generation diabetes management platform. Built to support patients with precise charting, smart OCR display recognition, and fast local database indexing.
            </p>
            <div className="border-t border-border/60 my-2 pt-3" />
            <div className="text-left bg-muted p-3.5 rounded-2xl border border-border/40">
              <h4 className="text-xs font-bold text-foreground mb-1 uppercase tracking-wide">Medical Disclaimer</h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                This software is intended as a logging utility only and does not supply medical diagnosis or treatment options. Always consult your primary physician or certified endocrinologist before making changes to your insulin regimen or diet.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
