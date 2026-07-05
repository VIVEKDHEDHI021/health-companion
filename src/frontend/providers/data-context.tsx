import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/frontend/lib/auth-context";
import { supabase } from "@/db/client";
import type { GlucoseEntry, InsulinEntry, WeightEntry } from "@/frontend/lib/types";
import { Capacitor } from "@capacitor/core";
import { Activity } from "lucide-react";

interface HealthDataContextValue {
  glucose: GlucoseEntry[];
  insulin: InsulinEntry[];
  weight: WeightEntry[];
  profileName: string;
  loading: boolean;
  initialized: boolean;
  refreshData: (force?: boolean) => Promise<void>;
  setGlucose: React.Dispatch<React.SetStateAction<GlucoseEntry[]>>;
  setInsulin: React.Dispatch<React.SetStateAction<InsulinEntry[]>>;
  setWeight: React.Dispatch<React.SetStateAction<WeightEntry[]>>;
  setProfileName: React.Dispatch<React.SetStateAction<string>>;
}

const HealthDataContext = createContext<HealthDataContextValue | undefined>(undefined);

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [glucose, setGlucose] = useState<GlucoseEntry[]>([]);
  const [insulin, setInsulin] = useState<InsulinEntry[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);
  const [profileName, setProfileName] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const refreshData = async (force = false) => {
    if (!user) return;

    const isMobile = Capacitor.isNativePlatform();
    // Only return cached values if we are on mobile, already loaded once, and not forcing a reload
    if (isMobile && initialized && !force) {
      return;
    }

    setLoading(true);
    try {
      const [g, i, w, p] = await Promise.all([
        supabase
          .from("glucose_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("date_time", { ascending: false }),
        supabase
          .from("insulin_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false }),
        supabase
          .from("weight_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("entry_date", { ascending: false }),
        supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
      ]);

      if (g.data) setGlucose(g.data as GlucoseEntry[]);
      if (i.data) setInsulin(i.data as InsulinEntry[]);
      if (w.data) setWeight(w.data as WeightEntry[]);
      if (p.data?.name) setProfileName(p.data.name);

      setInitialized(true);
    } catch (err) {
      console.error("[HEALTH_DATA_CONTEXT] Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setGlucose([]);
      setInsulin([]);
      setWeight([]);
      setProfileName("");
      setInitialized(false);
      return;
    }
    refreshData(false);
  }, [user]);

  const isMobile = Capacitor.isNativePlatform();

  if (isMobile && !initialized && loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white">
        <Activity className="h-12 w-12 text-primary animate-pulse" />
      </div>
    );
  }

  return (
    <HealthDataContext.Provider
      value={{
        glucose,
        insulin,
        weight,
        profileName,
        loading,
        initialized,
        refreshData,
        setGlucose,
        setInsulin,
        setWeight,
        setProfileName,
      }}
    >
      {children}
    </HealthDataContext.Provider>
  );
}

export function useHealthData() {
  const ctx = useContext(HealthDataContext);
  if (!ctx) throw new Error("useHealthData must be used within HealthDataProvider");
  return ctx;
}
