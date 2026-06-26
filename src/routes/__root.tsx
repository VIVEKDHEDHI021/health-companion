import { Outlet, createRootRoute, HeadContent, Scripts, Link } from "@tanstack/react-router";
import { Toaster } from "@/frontend/components/ui/sonner";
import { AuthProvider } from "@/frontend/lib/auth-context";
import { ThemeProvider } from "@/frontend/lib/theme";
import { NotificationProvider } from "@/providers/NotificationProvider";
import appCss from "../styles.css?url";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { Activity, ShieldAlert, KeyRound } from "lucide-react";
import { localDbService } from "@/services/localDbService";
import { syncService } from "@/services/syncService";
import { Button } from "@/frontend/components/ui/button";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#2563eb" },
      { title: "GlucoLab — Track glucose, insulin & weight" },
      {
        name: "description",
        content:
          "Securely log glucose readings, insulin doses, and weight. Generate doctor-ready reports and Excel exports.",
      },
      { property: "og:title", content: "GlucoLab" },
      {
        property: "og:description",
        content: "Premium diabetes management — glucose, insulin, weight tracking and reports.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  if (Capacitor.isNativePlatform()) {
    return <>{children}</>;
  }

  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [biometricRequired, setBiometricRequired] = useState(false);
  const [biometricAuthenticated, setBiometricAuthenticated] = useState(false);

  useEffect(() => {
    async function initMobile() {
      if (Capacitor.isNativePlatform()) {
        // 1. Initialize SQLite Database
        await localDbService.initDb();
        setDbInitialized(true);

        // 2. Setup Network Sync
        await syncService.setupNetworkSyncListener();

        // 3. Check Biometrics
        try {
          const { Preferences } = await import("@capacitor/preferences");
          const { value } = await Preferences.get({ key: "biometrics_enabled" });
          
          if (value === "true") {
            setBiometricRequired(true);
            await triggerBiometricAuth();
          } else {
            setBiometricAuthenticated(true);
          }
        } catch (err) {
          console.error("Biometric settings fetch error:", err);
          setBiometricAuthenticated(true);
        }
      } else {
        setDbInitialized(true);
        setBiometricAuthenticated(true);
      }
    }

    initMobile();
  }, []);

  const triggerBiometricAuth = async () => {
    try {
      const { NativeBiometric } = await import("@capgo/capacitor-native-biometric");
      const available = await NativeBiometric.isAvailable();
      if (available.isAvailable) {
        try {
          await NativeBiometric.verifyIdentity({
            reason: "Access secure health records",
            title: "Biometric Login",
            subtitle: "Log in to GlucoLab",
            description: "Verify your fingerprint or facial identity",
          });
          setBiometricAuthenticated(true);
          toast.success("Identity verified!");
        } catch (verifyErr) {
          console.warn("Biometric verification canceled or failed:", verifyErr);
        }
      } else {
        // Fallback if sensor was disabled
        setBiometricAuthenticated(true);
      }
    } catch (err) {
      console.error("Biometric auth error:", err);
      setBiometricAuthenticated(true);
    }
  };

  // While SQLite is initializing on mobile, show a loading splash
  if (Capacitor.isNativePlatform() && !dbInitialized) {
    return (
      <RootShell>
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white space-y-4">
          <Activity className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-sm font-medium text-zinc-400">Loading local database...</p>
        </div>
      </RootShell>
    );
  }

  // If biometric verification is required but not authenticated, block with a locked screen
  if (biometricRequired && !biometricAuthenticated) {
    return (
      <RootShell>
        <ThemeProvider>
          <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800 shadow-lg mb-6">
              <KeyRound className="h-10 w-10 text-primary animate-[pulse_2s_infinite]" />
            </div>
            <h1 className="text-2xl font-bold font-display tracking-tight text-zinc-100">GlucoLab Locked</h1>
            <p className="text-sm text-zinc-400 max-w-xs mt-2 mb-8">
              Biometric authentication is required to access your medical records and trackings.
            </p>
            <Button onClick={triggerBiometricAuth} size="lg" className="w-full max-w-xs gradient-primary shadow-soft">
              Authenticate
            </Button>
          </div>
        </ThemeProvider>
      </RootShell>
    );
  }

  return (
    <RootShell>
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Outlet />
            <Toaster richColors position="top-center" />
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </RootShell>
  );
}
