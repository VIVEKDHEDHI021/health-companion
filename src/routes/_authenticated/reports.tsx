import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { supabase } from "@/db/client";
import { useAuth } from "@/frontend/lib/auth-context";
import { READING_TYPES, type GlucoseEntry, type InsulinEntry, type WeightEntry } from "@/frontend/lib/types";

export const Route = createFileRoute("/_authenticated/reports")({
  component: ReportsPage,
  head: () => ({ meta: [{ title: "Reports — GlucoLab" }] }),
});

function ReportsPage() {
  const { user } = useAuth();
  const [days, setDays] = useState(30);
  const [glucose, setGlucose] = useState<GlucoseEntry[]>([]);
  const [insulin, setInsulin] = useState<InsulinEntry[]>([]);
  const [weight, setWeight] = useState<WeightEntry[]>([]);

  useEffect(() => {
    if (!user) {
      setGlucose([]);
      setInsulin([]);
      setWeight([]);
      return;
    }
    (async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      const sinceIso = subDays(new Date(), days).toISOString();
      const sinceDate = format(subDays(new Date(), days), "yyyy-MM-dd");
      const [g, i, w] = await Promise.all([
        supabase.from("glucose_entries").select("*").eq("user_id", currentUser.id).gte("date_time", sinceIso).order("date_time"),
        supabase.from("insulin_entries").select("*").eq("user_id", currentUser.id).gte("entry_date", sinceDate).order("entry_date"),
        supabase.from("weight_entries").select("*").eq("user_id", currentUser.id).gte("entry_date", sinceDate).order("entry_date"),
      ]);
      if (g.data) setGlucose(g.data as GlucoseEntry[]);
      if (i.data) setInsulin(i.data as InsulinEntry[]);
      if (w.data) setWeight(w.data as WeightEntry[]);
    })();
  }, [user, days]);

  const stats = useMemo(() => {
    if (!glucose.length) return null;
    const values = glucose.map((g) => Number(g.glucose));
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const high = glucose.reduce((p, c) => (Number(c.glucose) > Number(p.glucose) ? c : p));
    const low = glucose.reduce((p, c) => (Number(c.glucose) < Number(p.glucose) ? c : p));
    return { avg, high, low, count: glucose.length };
  }, [glucose]);

  const dailyAvg = useMemo(() => {
    const map = new Map<string, number[]>();
    glucose.forEach((g) => {
      const d = format(new Date(g.date_time), "MM/dd");
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(Number(g.glucose));
    });
    return Array.from(map.entries()).map(([date, vals]) => ({
      date, avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
  }, [glucose]);

  const slotAvg = useMemo(() => {
    return READING_TYPES.map((t) => {
      const vals = glucose.filter((g) => g.reading_type === t).map((g) => Number(g.glucose));
      return { type: t, avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0, count: vals.length };
    }).filter((s) => s.count > 0);
  }, [glucose]);

  const insulinTrend = insulin.map((i) => ({
    date: format(new Date(i.entry_date), "MM/dd"),
    total: Number(i.morning) + Number(i.lunch) + Number(i.evening) + Number(i.night),
  }));

  const weightTrend = weight.map((w) => ({ date: format(new Date(w.entry_date), "MM/dd"), kg: Number(w.weight_kg) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">Insights from your last {days} days.</p>
        </div>
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                days === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KPI label="Average" value={stats ? `${stats.avg}` : "—"} unit="mg/dL" icon={<Activity className="h-4 w-4" />} />
        <KPI label="Highest" value={stats ? `${Math.round(Number(stats.high.glucose))}` : "—"} unit="mg/dL" sub={stats && format(new Date(stats.high.date_time), "MMM d HH:mm")} icon={<TrendingUp className="h-4 w-4 text-destructive" />} />
        <KPI label="Lowest" value={stats ? `${Math.round(Number(stats.low.glucose))}` : "—"} unit="mg/dL" sub={stats && format(new Date(stats.low.date_time), "MMM d HH:mm")} icon={<TrendingDown className="h-4 w-4 text-warning" />} />
        <KPI label="Readings" value={stats ? `${stats.count}` : "0"} unit="logs" icon={<Activity className="h-4 w-4" />} />
      </div>

      <ChartCard title="Daily glucose average">
        {dailyAvg.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dailyAvg} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="avg" stroke="var(--primary)" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </ChartCard>

      <ChartCard title="Average by time slot">
        {slotAvg.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={slotAvg} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="type" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Bar dataKey="avg" fill="var(--primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty />}
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title="Insulin total per day">
          {insulinTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={insulinTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Bar dataKey="total" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>

        <ChartCard title="Weight trend">
          {weightTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weightTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Line type="monotone" dataKey="kg" stroke="var(--chart-3)" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <Empty />}
        </ChartCard>
      </div>
    </div>
  );
}

function KPI({ label, value, unit, sub, icon }: { label: string; value: string; unit: string; sub?: string | false | null; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        {icon}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="font-display text-2xl font-bold sm:text-3xl">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="mb-4 font-display text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}

function Empty() {
  return <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No data yet</div>;
}
