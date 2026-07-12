import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import {
  Activity,
  Droplet,
  Syringe,
  Scale,
  Plus,
  TrendingUp,
  AlertCircle,
  Clock,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
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
  type ReadingType,
} from "@/frontend/lib/types";
import { cn } from "@/frontend/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — GlucoLab" }] }),
});

const getPointColor = (glucose: number, type: any) => {
  const status = glucoseStatus(glucose, type);
  if (status === "low") return "oklch(0.62 0.18 29)"; // Red for low
  if (status === "high") return "oklch(0.58 0.18 55)"; // Amber/orange-red for high
  return "oklch(0.62 0.15 155)"; // Green for normal
};

const CustomDot = (props: any) => {
  const { cx, cy, payload, onClick, selectedPoint } = props;
  if (!cx || !cy) return null;
  const isSelected = selectedPoint && selectedPoint.id === payload.id;
  const color = getPointColor(payload.glucose, payload.type);
  return (
    <g>
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={10}
          fill={color}
          fillOpacity={0.25}
          className="animate-ping"
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 7 : 5}
        fill={color}
        stroke="var(--card)"
        strokeWidth={isSelected ? 2.5 : 1.5}
        className="cursor-pointer transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick(payload);
        }}
      />
    </g>
  );
};

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [zoom, setZoom] = useState<number>(1);

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
          time: format(dateObj, "MM/dd HH:mm"),
          fullTime: format(dateObj, "MMM d, yyyy HH:mm"),
          glucose: Number(r.glucose),
          type: r.reading_type,
          food: r.food,
          notes: r.notes,
          symptoms: r.symptoms,
          date_time: r.date_time,
          id: r.id,
        };
      }),
    [trendReadings],
  );

  useEffect(() => {
    if (chartData.length > 0) {
      const exists = selectedPoint ? chartData.find((p) => p.id === selectedPoint.id) : null;
      if (!exists) {
        setSelectedPoint(chartData[0]);
      } else {
        setSelectedPoint(exists);
      }
    } else {
      setSelectedPoint(null);
    }
  }, [chartData]);

  useEffect(() => {
    if (!isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  const matchingInsulin = useMemo(() => {
    if (!selectedPoint) return null;
    const glucoseDateStr = selectedPoint.date_time.split("T")[0];
    return insulin.find((ins) => ins.entry_date.split("T")[0] === glucoseDateStr);
  }, [selectedPoint, insulin]);

  const matchingInsulinFmt = useMemo(() => {
    if (!matchingInsulin) return "—";
    const morning = Number(matchingInsulin.morning) || 0;
    const lunch = Number(matchingInsulin.lunch) || 0;
    const afternoon = Number(matchingInsulin.afternoon) || 0;
    const evening = Number(matchingInsulin.evening) || 0;
    const night = Number(matchingInsulin.night) || 0;
    
    if (afternoon > 0) {
      return `${morning}-${lunch}-${afternoon}-${evening}-${night} units`;
    }
    return `${morning}-${lunch}-${evening}-${night} units`;
  }, [matchingInsulin]);

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
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={String(days)} onValueChange={(val) => setDays(Number(val) as 7 | 30 | 90)}>
              <TabsList className="grid w-[150px] grid-cols-3 h-9">
                <TabsTrigger value="7" className="text-xs">7D</TabsTrigger>
                <TabsTrigger value="30" className="text-xs">30D</TabsTrigger>
                <TabsTrigger value="90" className="text-xs">90D</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-lg"
              title="Expand to Fullscreen Detail"
              onClick={() => {
                setSelectedPoint(chartData[0] || null);
                setIsFullscreen(true);
              }}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {chartData.length > 0 ? (
          <div className="h-56 sm:h-64 w-full overflow-x-auto overflow-y-hidden scrollbar-thin">
            <div style={{ width: "100%", height: "100%", minWidth: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                onClick={(state) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    const clickedData = state.activePayload[0].payload;
                    if (clickedData && typeof clickedData.glucose === "number") {
                      setSelectedPoint(clickedData);
                      setIsFullscreen(true);
                    }
                  }
                }}
              >
                <ReferenceArea y1={70} y2={180} fill="oklch(0.62 0.15 155)" fillOpacity={0.08} />
                <XAxis
                  dataKey="date_time"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(tick) => {
                    try {
                      return format(new Date(tick), days === 7 ? "MM/dd HH:mm" : "MM/dd");
                    } catch {
                      return tick;
                    }
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[40, "auto"]}
                />
                <Line
                  type="monotone"
                  dataKey="glucose"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  isAnimationActive={false}
                  dot={
                    <CustomDot
                      selectedPoint={selectedPoint}
                      onClick={(payload) => {
                        setSelectedPoint(payload);
                        setIsFullscreen(true);
                      }}
                    />
                  }
                  activeDot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
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
                setFabOpen(false);
                setTimeout(() => setGlucoseOpen(true), 150);
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
                setFabOpen(false);
                setTimeout(() => setInsulinOpen(true), 150);
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
                setFabOpen(false);
                setTimeout(() => setWeightOpen(true), 150);
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

      {/* Fullscreen Trend Detail Modal */}
      {isFullscreen && (
        <div className={cn(
          "fullscreen-trend-modal fixed inset-0 z-[100] flex flex-col bg-background p-4 md:p-6 overflow-hidden animate-fade-in",
          Capacitor.isNativePlatform() ? "pt-[calc(max(env(safe-area-inset-top),28px))]" : ""
        )}>
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">Glucose Trend Analysis</h2>
              <p className="text-xs text-muted-foreground">Tap on any point to view reading details</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl h-10 w-10"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Chart Container */}
          <div className="flex-1 min-h-[250px] w-full bg-card rounded-2xl border border-border p-4 shadow-soft mb-4 flex flex-col overflow-hidden">
            <div className="mb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trend Graph ({days} days)</span>
              <div className="flex items-center gap-4">
                {/* Zoom control */}
                <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1 rounded-xl border border-border/50 h-8">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Zoom</span>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-20 h-1 bg-primary/20 rounded-lg appearance-none cursor-pointer accent-primary"
                  />
                  <span className="text-xs font-bold text-foreground min-w-[20px] text-right">{zoom}x</span>
                </div>
                <Tabs value={String(days)} onValueChange={(val) => setDays(Number(val) as 7 | 30 | 90)}>
                  <TabsList className="grid w-[180px] grid-cols-3 h-8">
                    <TabsTrigger value="7" className="text-xs py-0.5">7D</TabsTrigger>
                    <TabsTrigger value="30" className="text-xs py-0.5">30D</TabsTrigger>
                    <TabsTrigger value="90" className="text-xs py-0.5">90D</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0 overflow-x-auto overflow-y-hidden scrollbar-thin">
              <div style={{ width: `${zoom * 100}%`, height: "100%", minWidth: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 15, left: -20, bottom: 5 }}
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload.length) {
                      const clickedData = state.activePayload[0].payload;
                      if (clickedData && typeof clickedData.glucose === "number") {
                        setSelectedPoint(clickedData);
                      }
                    }
                  }}
                >
                  <ReferenceArea y1={70} y2={180} fill="oklch(0.62 0.15 155)" fillOpacity={0.08} />
                  <XAxis
                    dataKey="date_time"
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(tick) => {
                      try {
                        return format(new Date(tick), days === 7 ? "MM/dd HH:mm" : "MM/dd");
                      } catch {
                        return tick;
                      }
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[40, "auto"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="glucose"
                    stroke="var(--primary)"
                    strokeWidth={3}
                    isAnimationActive={false}
                    dot={
                      <CustomDot
                        selectedPoint={selectedPoint}
                        onClick={(payload) => {
                          setSelectedPoint(payload);
                        }}
                      />
                    }
                    activeDot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

          {/* Details Panel */}
          <div className="bg-card rounded-2xl border border-border p-4 shadow-soft flex flex-col gap-3 min-h-[160px] overflow-y-auto">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reading Details</h3>
            {selectedPoint ? (
              <div className="space-y-4">
                {/* Navigation Controls */}
                {chartData.length > 1 && (
                  <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-xl border border-border/50">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const idx = chartData.findIndex((p) => p.id === selectedPoint.id);
                        if (idx > 0) {
                          setSelectedPoint(chartData[idx - 1]);
                        }
                      }}
                      disabled={chartData.findIndex((p) => p.id === selectedPoint.id) === 0}
                      className="h-8 text-xs font-semibold flex items-center gap-1 hover:bg-card hover:shadow-soft active:scale-95 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground font-display font-medium">
                      Reading <span className="font-bold text-foreground">{chartData.findIndex((p) => p.id === selectedPoint.id) + 1}</span> of <span className="font-bold text-foreground">{chartData.length}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const idx = chartData.findIndex((p) => p.id === selectedPoint.id);
                        if (idx !== -1 && idx < chartData.length - 1) {
                          setSelectedPoint(chartData[idx + 1]);
                        }
                      }}
                      disabled={chartData.findIndex((p) => p.id === selectedPoint.id) === chartData.length - 1}
                      className="h-8 text-xs font-semibold flex items-center gap-1 hover:bg-card hover:shadow-soft active:scale-95 transition-all"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Large Glucose */}
                  <div className="flex items-center gap-4 bg-muted/40 p-3 rounded-xl border border-border/50">
                    <div className="text-center min-w-[70px]">
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground tracking-wide">Glucose</span>
                      <span className="font-display text-3xl font-extrabold text-foreground">{selectedPoint.glucose}</span>
                      <span className="text-[10px] text-muted-foreground ml-0.5">mg/dL</span>
                    </div>
                    <div className="flex-1">
                      <span className="block text-[9px] uppercase font-bold text-muted-foreground tracking-wide">Status</span>
                      {(() => {
                        const status = glucoseStatus(selectedPoint.glucose, selectedPoint.type);
                        if (status === "low") {
                          return <span className="inline-flex items-center rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500 border border-red-500/20 mt-1">Low Glucose</span>;
                        }
                        if (status === "high") {
                          return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-500 border border-amber-500/20 mt-1">High Glucose</span>;
                        }
                        return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-500 border border-emerald-500/20 mt-1">Normal</span>;
                      })()}
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="flex flex-col justify-center bg-muted/40 p-3 rounded-xl border border-border/50">
                    <span className="block text-[9px] uppercase font-bold text-muted-foreground tracking-wide">Date & Time</span>
                    <span className="text-sm font-semibold mt-1 text-foreground">{selectedPoint.fullTime}</span>
                    <span className="text-xs text-muted-foreground mt-0.5">{READING_LABELS[selectedPoint.type as ReadingType] || selectedPoint.type}</span>
                  </div>

                  {/* Extra Details: Food, Insulin & Notes */}
                  <div className="flex flex-col justify-center bg-muted/40 p-3 rounded-xl border border-border/50 col-span-1 sm:col-span-2 md:col-span-1">
                    <span className="block text-[9px] uppercase font-bold text-muted-foreground tracking-wide">Notes & Treatment</span>
                    <p className="text-xs mt-1 text-foreground truncate">
                      <span className="font-semibold">Food:</span> {selectedPoint.food || "—"}
                    </p>
                    <p className="text-xs mt-0.5 text-foreground truncate">
                      <span className="font-semibold">Insulin:</span> {matchingInsulinFmt}
                    </p>
                    <p className="text-xs mt-0.5 text-foreground truncate">
                      <span className="font-semibold">Notes:</span> {selectedPoint.notes || "—"}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground py-4">
                Tap on any data point in the graph above to view its complete details.
              </div>
            )}
          </div>
        </div>
      )}
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
