import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { OTPField } from "@/frontend/components/ui/custom-mobile";
import { Button } from "@/frontend/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/otp")({
  component: OTPVerificationPage,
});

function OTPVerificationPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(59);
  const [verifying, setVerifying] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (timer === 0) return;
    const interval = setInterval(() => {
      setTimer((t) => t - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const handleResend = () => {
    setTimer(59);
    toast.success("A new verification code was sent to your device!");
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) {
      toast.error("Please enter the complete 6-digit code.");
      return;
    }
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setSuccess(true);
      toast.success("Security verification completed successfully.");
      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 1500);
    }, 1500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-10 animate-fade-in">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="space-y-1.5">
          <h1 className="font-display text-3xl font-bold">Verify account</h1>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to your registered email address.
          </p>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center p-8 bg-success/10 border border-success/30 rounded-3xl text-center space-y-3 animate-fade-in">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <h3 className="font-display text-lg font-bold text-foreground">Verified!</h3>
            <p className="text-xs text-muted-foreground">Redirecting you to dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleVerify} className="space-y-6 bg-card border border-border/80 rounded-3xl p-6 shadow-elevated">
            <div className="space-y-4 text-center">
              <OTPField value={code} onChange={setCode} length={6} />
              
              <div className="text-xs text-muted-foreground pt-2">
                {timer > 0 ? (
                  <span>Resend code in <strong className="text-foreground">{timer}s</strong></span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    className="text-primary font-semibold hover:underline"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={verifying || code.length < 6}
              className="w-full gradient-primary text-primary-foreground btn-ripple-effect rounded-2xl"
            >
              {verifying ? "Verifying..." : "Verify Code"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
