import * as React from "react";
import { cn } from "@/frontend/lib/utils";
import { AlertCircle, WifiOff, Camera, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";

// 1. OTP Input Component (6 numerical input blocks)
interface OTPFieldProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export function OTPField({ value, onChange, length = 6 }: OTPFieldProps) {
  const inputsRef = React.useRef<HTMLInputElement[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (!val) return;

    const newValArr = value.split("");
    newValArr[idx] = val[val.length - 1]; // pick last char
    const updatedVal = newValArr.join("");
    onChange(updatedVal);

    // Auto-focus next input
    if (idx < length - 1 && inputsRef.current[idx + 1]) {
      inputsRef.current[idx + 1].focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      const newValArr = value.split("");
      if (!newValArr[idx]) {
        // focus previous and clear it
        if (idx > 0 && inputsRef.current[idx - 1]) {
          inputsRef.current[idx - 1].focus();
          newValArr[idx - 1] = "";
          onChange(newValArr.join(""));
        }
      } else {
        newValArr[idx] = "";
        onChange(newValArr.join(""));
      }
    }
  };

  const codeChars = value.padEnd(length, " ").split("").slice(0, length);

  return (
    <div className="flex justify-center gap-2">
      {codeChars.map((char, idx) => (
        <input
          key={idx}
          type="tel"
          pattern="[0-9]*"
          maxLength={1}
          value={char.trim()}
          ref={(el) => {
            if (el) inputsRef.current[idx] = el;
          }}
          onChange={(e) => handleChange(e, idx)}
          onKeyDown={(e) => handleKeyDown(e, idx)}
          className="h-14 w-12 text-center text-xl font-bold rounded-2xl border border-border bg-card shadow-soft text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
        />
      ))}
    </div>
  );
}

// 2. iOS-style SegmentControl Component
interface SegmentControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SegmentControl({ options, value, onChange, className }: SegmentControlProps) {
  return (
    <div
      className={cn(
        "flex p-1 rounded-2xl bg-muted/60 border border-border/30 relative select-none w-full",
        className
      )}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 text-center py-2 text-xs font-semibold rounded-xl transition-all duration-200 cursor-pointer relative z-10",
              selected
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// 3. OfflineState / OfflineBanner
export function OfflineState({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-3xl border border-border/40 shadow-soft max-w-sm mx-auto my-6 animate-fade-in">
      <div className="h-16 w-16 bg-warning/10 text-warning rounded-2xl flex items-center justify-center mb-4">
        <WifiOff className="h-8 w-8" />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">You are offline</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Log entries are cached locally on your device and will sync automatically when your connection is restored.
      </p>
      {onRetry && (
        <Button onClick={onRetry} variant="secondary" className="w-full btn-ripple-effect">
          Retry Sync
        </Button>
      )}
    </div>
  );
}

// 4. Camera Permission Denied mockup screen
export function CameraPermissionState({ onRequest }: { onRequest: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-card rounded-3xl border border-border/40 shadow-soft max-w-sm mx-auto my-6 animate-fade-in">
      <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-2xl flex items-center justify-center mb-4">
        <Camera className="h-8 w-8" />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground">Camera access required</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        GlucoLab needs camera permission to capture and auto-scan your medical device screen displays.
      </p>
      <Button onClick={onRequest} className="w-full gradient-primary text-primary-foreground btn-ripple-effect">
        Grant Permission
      </Button>
    </div>
  );
}

// 5. Generic Beautiful Medical Empty State
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center border border-dashed border-border/60 bg-muted/20 rounded-3xl animate-fade-in">
      <div className="h-12 w-12 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mb-4 shadow-soft">
        {icon || <Sparkles className="h-6 w-6" />}
      </div>
      <h4 className="font-display text-base font-bold text-foreground">{title}</h4>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="sm" variant="outline" className="mt-4 rounded-xl btn-ripple-effect">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// 6. Loading overlay with blur backdrop
export function LoadingOverlay({ label = "Processing..." }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-md animate-fade-in">
      <div className="flex flex-col items-center gap-3 p-6 bg-card rounded-3xl border border-border/50 shadow-elevated">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
        <p className="text-sm font-semibold text-foreground">{label}</p>
      </div>
    </div>
  );
}
