import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Activity, ShieldCheck, Heart, Sparkles, Fingerprint } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

function WelcomePage() {
  const navigate = useNavigate();

  const handleBiometricLogin = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Verifying biometrics...",
        success: () => {
          navigate({ to: "/dashboard" });
          return "Welcome back, verified user!";
        },
        error: "Verification failed.",
      }
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground animate-fade-in">
      {/* Hero section */}
      <div className="flex-grow flex flex-col items-center justify-center px-6 py-12 max-w-md mx-auto text-center space-y-8">
        <div className="flex h-20 w-20 animate-pulse-scale items-center justify-center rounded-3xl gradient-primary text-white shadow-elevated">
          <Activity className="h-10 w-10" strokeWidth={2.5} />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">GlucoLab Pro</h1>
          <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold text-primary">
            Next-Gen Diabetes Companion
          </p>
        </div>

        {/* Feature Cards Carousel mock */}
        <div className="w-full bg-card border border-border/60 rounded-3xl p-5 shadow-soft text-left space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Advanced Logs</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Track blood glucose, detailed insulin schedules, and weight daily.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-success/10 text-success flex items-center justify-center shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Smart Scanner</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Scan your medical meter display directly with Google Cloud Vision OCR.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-accent text-accent-foreground flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Secure Vault</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your medical data is encrypted locally and synchronized securely.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Button controls */}
      <div className="w-full max-w-md mx-auto px-6 pb-safe mb-8 space-y-3">
        <Button
          onClick={() => navigate({ to: "/login" })}
          size="lg"
          className="w-full gradient-primary text-primary-foreground btn-ripple-effect shadow-soft"
        >
          Sign In
        </Button>
        
        <Button
          onClick={() => navigate({ to: "/signup" })}
          size="lg"
          variant="secondary"
          className="w-full btn-ripple-effect"
        >
          Create Account
        </Button>

        <div className="flex items-center justify-center gap-2 pt-2">
          <Button
            onClick={handleBiometricLogin}
            variant="ghost"
            className="text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground rounded-xl"
          >
            <Fingerprint className="h-4 w-4 text-primary" />
            Biometric Login
          </Button>
        </div>
      </div>
    </div>
  );
}
