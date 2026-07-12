import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Droplet,
  Syringe,
  Scale,
  Plus,
  TrendingUp,
  AlertCircle,
  Clock,
} from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceArea,
} from "recharts";
import { supabase } from "@/db/client";
import { healthService } from "@/backend/services/healthService";
import { useAuth } from "@/frontend/lib/auth-context";
import { useHealthData } from "@/frontend/providers/data-context";
import { Button } from "@/frontend/components/ui/button";
import { GlucoseDialog } from "@/frontend/components/glucose-dialog";
import { InsulinDialog } from "@/frontend/components/insulin-dialog";
import { WeightDialog } from "@/frontend/components/weight-dialog";
import { ProfileDialog } from "@/frontend/components/profile-dialog";
import {
  READING_LABELS,
  glucoseStatus,
  type GlucoseEntry,
  type InsulinEntry,
  type WeightEntry,
} from "@/frontend/lib/types";
import { cn } from "@/frontend/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — GlucoLab" }] }),
});

function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { glucose, insulin, weight, profileName, refreshData } = useHealthData();
  const [glucoseOpen, setGlucoseOpen] = useState(false);
  const [insulinOpen, setInsulinOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const [fabOpen, setFabOpen] = useState(false);

  const load = async () => {
    await refreshData(true);
  };

  useEffect(() => {
    refreshData(false);
  }, [user]);

  const latest = glucose[0];
  const weekAgo = subDays(new Date(), 7);
  const weekReadings = glucose.filter((g) => isAfter(new Date(g.date_time), weekAgo));
  const avgWeek = weekReadings.length
    ? Math.round(weekReadings.reduce((s, r) => s + Number(r.glucose), 0) / weekReadings.length)
    : 0;
  const latestWeight = weight[0];
  const latestInsulin = insulin[0];
  const insulinFmt = latestInsulin
    ? latestInsulin.afternoon && Number(latestInsulin.afternoon) > 0
      ? `${latestInsulin.morning}-${latestInsulin.lunch}-${latestInsulin.afternoon}-${latestInsulin.evening}-${latestInsulin.night}`
      : `${latestInsulin.morning}-${latestInsulin.lunch}-${latestInsulin.evening}-${latestInsulin.night}`
    : "—";
  const insulinTotal = latestInsulin
    ? Number(latestInsulin.morning) +
      Number(latestInsulin.lunch) +
      (Number(latestInsulin.afternoon) || 0) +
      Number(latestInsulin.evening) +
      Number(latestInsulin.night)
    : 0;

  const trendAgo = useMemo(() => subDays(new Date(), days), [days]);
  const trendReadings = useMemo(() => {
    return glucose.filter((g) => isAfter(new Date(g.date_time), trendAgo));
  }, [glucose, trendAgo]);

  const chartData = useMemo(
    () =>
      [...trendReadings].reverse().map((r) => {
        const dateObj = new Date(r.date_time);
        return {
          time: format(dateObj, days === 7 ? "MM/dd HH:mm" : "MM/dd"),
          fullTime: format(dateObj, "MMM d, yyyy HH:mm"),
          glucose: Number(r.glucose),
          type: r.reading_type,
        };
      }),
    [trendReadings, days],
  );

  return (
    <>
      <div className="space-y-5 md:space-y-6 animate-fade-in">

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Droplet className="h-5 w-5" />}
          label="Latest glucose"
          value={latest ? `${Math.round(Number(latest.glucose))}` : "—"}
          unit={latest ? "mg/dL" : ""}
          sub={
            latest
              ? `${latest.reading_type} · ${format(new Date(latest.date_time), "MMM d, HH:mm")}`
              : "No reading yet"
          }
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
          label="Latest insulin"
          value={insulinFmt}
          unit=""
          sub={
            latestInsulin
              ? `Total: ${insulinTotal} units · ${format(new Date(latestInsulin.entry_date), "MMM d")}`
              : "No data"
          }
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
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-lg font-bold">{days}-day glucose trend</h2>
            <p className="text-xs text-muted-foreground">Target zone: 70–180 mg/dL</p>
          </div>
          <Tabs value={String(days)} onValueChange={(val) => setDays(Number(val) as 7 | 30 | 90)}>
            <TabsList className="grid w-[240px] grid-cols-3">
              <TabsTrigger value="7">7 Days</TabsTrigger>
              <TabsTrigger value="30">30 Days</TabsTrigger>
              <TabsTrigger value="90">90 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {chartData.length > 0 ? (
          <div className="h-56 sm:h-64 w-full">
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <ReferenceArea y1={70} y2={180} fill="oklch(0.62 0.15 155)" fillOpacity={0.08} />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[40, "auto"]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-border bg-popover p-3 shadow-md text-xs space-y-1">
                          <p className="font-semibold text-foreground">{data.fullTime}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-muted-foreground">Glucose:</span>
                            <span className="font-bold text-foreground">{data.glucose} mg/dL</span>
                          </div>
                          {data.type && (
                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                              Type: {data.type}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "var(--primary)" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyHint
            icon={<Activity className="h-6 w-6" />}
            text="Log a few readings to see your trend."
          />
        )}
      </div>
      {/* End of animated content wrapper to prevent stacking context constraints */}
      </div>


      <GlucoseDialog open={glucoseOpen} onOpenChange={setGlucoseOpen} onSaved={load} />
      <InsulinDialog open={insulinOpen} onOpenChange={setInsulinOpen} onSaved={load} />
      <WeightDialog open={weightOpen} onOpenChange={setWeightOpen} onSaved={load} />
      <ProfileDialog open={profileOpen} onOpenChange={setProfileOpen} onSaved={load} />

      {/* Expandable FAB Speed Dial */}
      {/* FAB Backdrop */}
      <div
        onClick={() => setFabOpen(false)}
        className={cn(
          "fixed inset-0 z-45 bg-zinc-950/40 backdrop-blur-sm transition-opacity duration-300",
          fabOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* FAB Speed Dial Container */}
      <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Speed Dial Menu */}
        <div className={cn(
          "flex flex-col items-end gap-3 transition-all duration-300 origin-bottom",
          fabOpen ? "scale-100 opacity-100 translate-y-0" : "scale-75 opacity-0 translate-y-4 pointer-events-none"
        )}>
          {/* Action: Glucose */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-100 shadow-soft">
              Glucose
            </span>
            <Button
              onClick={() => {
                setGlucoseOpen(true);
                setFabOpen(false);
              }}
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full border border-border bg-card shadow-soft hover:bg-muted/50 transition-all hover:scale-105 active:scale-95"
            >
              <Droplet className="h-5 w-5 text-primary" />
            </Button>
          </div>

          {/* Action: Insulin */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-100 shadow-soft">
              Insulin
            </span>
            <Button
              onClick={() => {
                setInsulinOpen(true);
                setFabOpen(false);
              }}
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full border border-border bg-card shadow-soft hover:bg-muted/50 transition-all hover:scale-105 active:scale-95"
            >
              <Syringe className="h-5 w-5 text-primary" />
            </Button>
          </div>

          {/* Action: Weight */}
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-100 shadow-soft">
              Weight
            </span>
            <Button
              onClick={() => {
                setWeightOpen(true);
                setFabOpen(false);
              }}
              variant="secondary"
              size="icon"
              className="h-12 w-12 rounded-full border border-border bg-card shadow-soft hover:bg-muted/50 transition-all hover:scale-105 active:scale-95"
            >
              <Scale className="h-5 w-5 text-primary" />
            </Button>
          </div>
        </div>

        {/* Main Floating Button */}
        <Button
          onClick={() => setFabOpen(!fabOpen)}
          className={cn(
            "h-14 w-14 rounded-full gradient-primary shadow-lg flex items-center justify-center transition-all duration-300 transform active:scale-90",
            fabOpen ? "rotate-45" : "rotate-0"
          )}
        >
          <Plus className="h-6 w-6 text-primary-foreground" />
        </Button>
      </div>
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  sub,
  accent = "normal",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  sub: string;
  accent?: "low" | "normal" | "high";
}) {
  const accentClass =
    accent === "low" ? "text-warning" : accent === "high" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
      <div className="flex items-center justify-between">
        <div className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          {icon}
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1">
        <div
          className={cn("font-display text-2xl font-bold sm:text-3xl tracking-tight", accentClass)}
        >
          {value}
        </div>
        {unit && <div className="text-sm font-medium text-muted-foreground">{unit}</div>}
      </div>
      <div className="mt-1 truncate text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function ReminderCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
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
