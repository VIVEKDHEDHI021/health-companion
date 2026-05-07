import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Activity } from "lucide-react";
import { useAuth } from "@/frontend/lib/auth-context";

export const Route = createFileRoute("/")({
  component: SplashPage,
});

function SplashPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      navigate({ to: user ? "/dashboard" : "/login" });
    }, 900);
    return () => clearTimeout(t);
  }, [loading, user, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-primary px-6 text-primary-foreground">
      <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm shadow-elevated">
        <Activity className="h-12 w-12" strokeWidth={2.5} />
      </div>
      <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight">GlucoLab</h1>
      <div className="mt-1 text-sm font-bold uppercase tracking-[0.3em] opacity-80">Pro</div>
      <p className="mt-6 max-w-sm text-center text-sm opacity-90">
        Your personal diabetes companion — secure, simple, and built for daily care.
      </p>
    </div>
  );
}
