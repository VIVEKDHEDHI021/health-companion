import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Droplet, Syringe, Scale, Plus, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceArea } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { GlucoseDialog } from "@/components/glucose-dialog";
import { InsulinDialog } from "@/components/insulin-dialog";
import { WeightDialog } from "@/components/weight-dialog";
import { READING_LABELS, glucoseStatus, type GlucoseEntry, type InsulinEntry, type WeightEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — Diabetes Tracker Pro" }] }),
});

function DashboardPage() {
  const { user } = useAuth();
  const [glucose, setGlucose] = useState<GlucoseEntry[]>([]);
  const [insulin, setInsulin] = useState<InsulinEntry[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);
  const [glucoseOpen, setGlucoseOpen] = useState(false);
  const [insulinOpen, setInsulinOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [profileName, setProfileName] = useState<string>("");

  const load = async () => {
    if (!user) return;
    const since = subDays(new Date(), 30).toISOString();
    const [g, i, w, p] = await Promise.all([
      supabase.from("glucose_entries").select("*").gte("date_time", since).order("date_time", { ascending: false }),
      supabase.from("insulin_entries").select("*").gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd")).order("entry_date", { ascending: false }),
      supabase.from("weight_entries").select("*").gte("entry_date", format(subDays(new Date(), 30), "yyyy-MM-dd")).order("entry_date", { ascending: false }),
      supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle(),
    ]);
    if (g.data) setGlucose(g.data as GlucoseEntry[]);
    if (i.data) setInsulin(i.data as InsulinEntry[]);
    if (w.data) setWeight(w.data as WeightEntry[]);
    if (p.data?.name) setProfileName(p.data.name);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const latest = glucose[0];
  const weekAgo = subDays(new Date(), 7);
  const weekReadings = glucose.filter((g) => isAfter(new Date(g.date_time), weekAgo));
  const avgWeek = weekReadings.length ? Math.round(weekReadings.reduce((s, r) => s + Number(r.glucose), 0) / weekReadings.length) : 0;
  const latestWeight = weight[0];
  const todayInsulin = insulin.find((i) => i.entry_date === format(new Date(), "yyyy-MM-dd"));
  const insulinFmt = todayInsulin ? `${todayInsulin.morning}-${todayInsulin.lunch}-${todayInsulin.evening}-${todayInsulin.night}` : "—";
  const insulinTotal = todayInsulin ? Number(todayInsulin.morning) + Number(todayInsulin.lunch) + Number(todayInsulin.evening) + Number(todayInsulin.night) : 0;

  const chartData = useMemo(
    () => [...weekReadings].reverse().map((r) => ({
      time: format(new Date(r.date_time), "MM/dd HH:mm"),
      glucose: Number(r.glucose),
      type: r.reading_type,
    })),
    [weekReadings]
  );

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{greeting},</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">{profileName || "there"} 👋</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setGlucoseOpen(true)} size="lg" className="shadow-soft">
            <Plus className="mr-1.5 h-4 w-4" /> Glucose
          </Button>
          <Button onClick={() => setInsulinOpen(true)} size="lg" variant="secondary">
            <Syringe className="mr-1.5 h-4 w-4" /> Insulin
          </Button>
          <Button onClick={() => setWeightOpen(true)} size="lg" variant="secondary">
            <Scale className="mr-1.5 h-4 w-4" /> Weight
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Droplet className="h-5 w-5" />}
          label="Latest glucose"
          value={latest ? `${Math.round(Number(latest.glucose))}` : "—"}
          unit={latest ? "mg/dL" : ""}
          sub={latest ? `${latest.reading_type} · ${format(new Date(latest.date_time), "MMM d, HH:mm")}` : "No reading yet"}
          accent={latest ? glucoseStatus(Number(latest.glucose), latest.reading_type) : "normal"}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="7-day average"
          value={avgWeek ? `${avgWeek}` : "—"}
          unit={avgWeek ? "mg/dL" : ""}
          sub={`${weekReadings.length} readings`}
        />
        <StatCard
          icon={<Syringe className="h-5 w-5" />}
          label="Today insulin"
          value={insulinFmt}
          unit=""
          sub={`Total: ${insulinTotal} units`}
        />
        <StatCard
          icon={<Scale className="h-5 w-5" />}
          label="Latest weight"
          value={latestWeight ? `${Number(latestWeight.weight_kg).toFixed(1)}` : "—"}
          unit={latestWeight ? "kg" : ""}
          sub={latestWeight ? format(new Date(latestWeight.entry_date), "MMM d") : "No data"}
        />
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">7-day glucose trend</h2>
            <p className="text-xs text-muted-foreground">Target zone: 70–180 mg/dL</p>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <ReferenceArea y1={70} y2={180} fill="oklch(0.62 0.15 155)" fillOpacity={0.08} />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} domain={[40, "auto"]} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line type="monotone" dataKey="glucose" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3, fill: "var(--primary)" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyHint icon={<Activity className="h-6 w-6" />} text="Log a few readings to see your trend." />
        )}
      </div>

      {/* Reminders */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <ReminderCard icon={<Clock className="h-4 w-4" />} title="Check glucose" body="Aim for 4–7 readings spread through the day." />
        <ReminderCard icon={<Syringe className="h-4 w-4" />} title="Insulin doses" body="Don't forget to log your insulin schedule daily." />
        <ReminderCard icon={<AlertCircle className="h-4 w-4" />} title="Stay hydrated" body="Drink water regularly — it helps glucose control." />
      </div>

      <GlucoseDialog open={glucoseOpen} onOpenChange={setGlucoseOpen} onSaved={load} />
      <InsulinDialog open={insulinOpen} onOpenChange={setInsulinOpen} onSaved={load} />
      <WeightDialog open={weightOpen} onOpenChange={setWeightOpen} onSaved={load} />
    </div>
  );
}

function StatCard({
  icon, label, value, unit, sub, accent = "normal",
}: { icon: React.ReactNode; label: string; value: string; unit: string; sub: string; accent?: "low" | "normal" | "high" }) {
  const accentClass =
    accent === "low" ? "text-warning" : accent === "high" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div className={cn("font-display text-2xl font-bold sm:text-3xl tracking-tight", accentClass)}>{value}</div>
        {unit && <div className="text-sm font-medium text-muted-foreground">{unit}</div>}
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function ReminderCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary">
        {icon}
        <div className="text-sm font-semibold text-foreground">{title}</div>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}

function EmptyHint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// Use the helper so it isn't unused (for tooltip labels in future)
void READING_LABELS;
