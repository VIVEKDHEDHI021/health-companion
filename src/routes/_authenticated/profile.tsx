import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { User, Activity, AlertTriangle, ShieldCheck, Save, Phone } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { healthService } from "@/backend/services/healthService";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
  head: () => ({ meta: [{ title: "My Profile — GlucoLab" }] }),
});

function ProfilePage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [diabetesType, setDiabetesType] = useState("Type 1");
  const [lowTarget, setLowTarget] = useState("70");
  const [highTarget, setHighTarget] = useState("180");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      const p = await healthService.getProfile();
      if (p?.data) {
        setName(p.data.name || "");
        setEmail(p.data.email || "");
        setPhone(p.data.phone || "");
      }
    }
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await healthService.updateProfile({ name, phone });
      toast.success("Profile saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-fade-in">
      <div className="space-y-1">
        <h1 className="font-display text-3xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground">Customize medical diagnostics configurations.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Account Details Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary-soft text-primary flex items-center justify-center font-display font-extrabold text-lg">
              {name ? name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">Personal Info</h3>
              <p className="text-xs text-muted-foreground">General identity credentials.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="profName">Display Name</Label>
              <Input
                id="profName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="profEmail">Email Address</Label>
              <Input
                id="profEmail"
                type="email"
                value={email}
                disabled
                className="opacity-70 bg-muted/40"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="profPhone">Mobile Phone</Label>
              <Input
                id="profPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 555-0199"
              />
            </div>
          </div>
        </div>

        {/* Medical Configuration Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-soft space-y-4">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" /> Medical Parameters
          </h3>

          <div className="grid gap-4 sm:grid-cols-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="diabType">Diabetes Type</Label>
              <select
                id="diabType"
                value={diabetesType}
                onChange={(e) => setDiabetesType(e.target.value)}
                className="w-full bg-muted/45 text-sm h-11 rounded-xl border border-border px-3.5 py-2 text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 theme-transition"
              >
                <option value="Type 1">Type 1</option>
                <option value="Type 2">Type 2</option>
                <option value="LADA">LADA</option>
                <option value="Gestational">Gestational</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lowT">Low Target (mg/dL)</Label>
              <Input
                id="lowT"
                type="number"
                value={lowTarget}
                onChange={(e) => setLowTarget(e.target.value)}
                min="40"
                max="100"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="highT">High Target (mg/dL)</Label>
              <Input
                id="highT"
                type="number"
                value={highTarget}
                onChange={(e) => setHighTarget(e.target.value)}
                min="120"
                max="250"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contacts Card */}
        <div className="bg-card border border-border/80 rounded-3xl p-5 shadow-soft space-y-4">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" /> Emergency Contact
          </h3>

          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="emerName">Contact Name</Label>
              <Input
                id="emerName"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                placeholder="Guardian or doctor name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emerPhone">Phone Number</Label>
              <Input
                id="emerPhone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                placeholder="Emergency hotline"
              />
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full gradient-primary text-primary-foreground btn-ripple-effect rounded-2xl py-6 font-bold flex items-center justify-center gap-2"
        >
          <Save className="h-5 w-5" />
          {saving ? "Saving Changes..." : "Save Medical Settings"}
        </Button>
      </form>
    </div>
  );
}
