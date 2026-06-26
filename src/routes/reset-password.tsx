import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/db/client";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { AlertCircle, ArrowLeft, KeyRound, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({ component: ResetPage });

function ResetPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [errorInfo, setErrorInfo] = useState<{ code: string; message: string } | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // 1. Check for errors in the URL hash (from Supabase redirects)
    const hash = window.location.hash || "";
    const params = new URLSearchParams(hash.replace(/^#/, "?"));
    const error = params.get("error") || params.get("error_description");
    const errorCode = params.get("error_code");

    // Also check standard query parameters just in case
    const queryParams = new URLSearchParams(window.location.search);
    const queryError = queryParams.get("error") || queryParams.get("error_description");
    const queryErrorCode = queryParams.get("error_code");

    const finalError = error || queryError;
    const finalErrorCode = errorCode || queryErrorCode;

    if (finalError) {
      setErrorInfo({
        code: finalErrorCode || "unknown_error",
        message: decodeURIComponent(finalError).replace(/\+/g, " "),
      });
      setCheckingAuth(false);
      return;
    }

    // 2. Check if we actually have a session or recovery flow
    supabase.auth.getSession().then(({ data: { session } }) => {
      const type = params.get("type") || queryParams.get("type");
      const hasAccessToken = params.has("access_token") || queryParams.has("access_token");

      if (session || (type === "recovery" && hasAccessToken)) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
      setCheckingAuth(false);
    });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated successfully!");
    navigate({ to: "/dashboard" });
  };

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying your secure link...</p>
        </div>
      </div>
    );
  }

  if (errorInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Link Expired or Invalid
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {errorInfo.message || "The password reset link you clicked is no longer valid."}
            </p>
            <div className="mt-4 rounded-xl border border-border bg-card p-4 text-xs text-muted-foreground text-left">
              <span className="font-semibold text-foreground">Why did this happen?</span>
              <ul className="mt-1.5 list-disc pl-4 space-y-1">
                <li>
                  Some email security scanners preview links automatically, which invalidates
                  single-use reset tokens.
                </li>
                <li>The link may have reached its expiration time limit.</li>
                <li>A newer reset link was requested, invalidating this one.</li>
              </ul>
            </div>
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild className="w-full" size="lg">
                <Link to="/forgot-password">Request new reset link</Link>
              </Button>
              <Button asChild variant="ghost" className="w-full" size="lg">
                <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium">
                  <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/10 text-warning">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You must access this page using a valid password reset link sent to your email.
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Button asChild className="w-full" size="lg">
              <Link to="/forgot-password">Go to forgot password</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full" size="lg">
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium">
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Set new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your identity is verified. Please enter your new password below.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-elevated"
        >
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={6}
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
