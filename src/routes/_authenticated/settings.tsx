import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Globe,
  Lock,
  Database,
  HelpCircle,
  ChevronRight,
  ShieldCheck,
  Languages,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Switch } from "@/frontend/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — GlucoLab" }] }),
});

function SettingsPage() {
  const [reminders, setReminders] = useState(true);
  const [highSugarAlerts, setHighSugarAlerts] = useState(true);
  const [lowSugarAlerts, setLowSugarAlerts] = useState(true);
  const [biometrics, setBiometrics] = useState(false);
  const [language, setLanguage] = useState("en");

  const handleBackup = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Generating secure backup...",
        success: "Backup successfully saved to encrypted cloud database!",
        error: "Backup failed.",
      }
    );
  };

  const handleRestore = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)),
      {
        loading: "Decrypting data package...",
        success: "Local cache updated successfully!",
        error: "Restore failed.",
      }
    );
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your clinical notifications and data options.</p>
      </div>

      {/* Notifications Module */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-soft space-y-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notifications
        </h3>
        
        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Medication Reminders</h4>
              <p className="text-xs text-muted-foreground">Alerts for checking glucose and recording insulin.</p>
            </div>
            <Switch checked={reminders} onCheckedChange={setReminders} />
          </div>

          <div className="border-t border-border/60" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">High Sugar Warnings</h4>
              <p className="text-xs text-muted-foreground">Instant alerts when readings exceed 180 mg/dL.</p>
            </div>
            <Switch checked={highSugarAlerts} onCheckedChange={setHighSugarAlerts} />
          </div>

          <div className="border-t border-border/60" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Low Sugar Warnings</h4>
              <p className="text-xs text-muted-foreground">Instant alerts when readings drop below 70 mg/dL.</p>
            </div>
            <Switch checked={lowSugarAlerts} onCheckedChange={setLowSugarAlerts} />
          </div>
        </div>
      </div>

      {/* Preferences & Security */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-soft space-y-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          <Lock className="h-5 w-5 text-primary" /> Preferences & Security
        </h3>

        <div className="space-y-3.5 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Biometric Access Locked</h4>
              <p className="text-xs text-muted-foreground">Require fingerprint/face scanner on launch.</p>
            </div>
            <Switch checked={biometrics} onCheckedChange={setBiometrics} />
          </div>

          <div className="border-t border-border/60" />

          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Application Language</h4>
              <p className="text-xs text-muted-foreground">Selected translations interface.</p>
            </div>
            <select
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value);
                toast.success(`Language changed to ${e.target.value === "en" ? "English" : "Spanish"}`);
              }}
              className="bg-muted/45 text-xs font-semibold px-3 py-2 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 theme-transition"
            >
              <option value="en">English (US)</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cloud Backups */}
      <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-soft space-y-4">
        <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" /> Cloud Backups
        </h3>
        
        <p className="text-xs text-muted-foreground leading-relaxed">
          Create encrypted files to backup all your local reports, weight metrics, and smart scanner read logs safely.
        </p>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button onClick={handleBackup} variant="secondary" className="w-full btn-ripple-effect rounded-xl font-bold">
            Backup Now
          </Button>
          <Button onClick={handleRestore} variant="outline" className="w-full btn-ripple-effect rounded-xl font-bold">
            Restore Backup
          </Button>
        </div>
      </div>

      {/* Footer Version Details */}
      <div className="text-center space-y-1 py-4">
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 text-success" /> GlucoLab Pro Safe Engine
        </div>
        <p className="text-[10px] text-muted-foreground font-semibold">Version 2.4.0 (Build 90)</p>
      </div>
    </div>
  );
}
