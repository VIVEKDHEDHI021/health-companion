import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { format, subDays } from "date-fns";
import { FileSpreadsheet, FileText, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "@/db/client";
import { useAuth } from "@/frontend/lib/auth-context";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { READING_TYPES, type GlucoseEntry, type InsulinEntry, type WeightEntry, type ReadingType } from "@/frontend/lib/types";

export const Route = createFileRoute("/_authenticated/export")({
  component: ExportPage,
  head: () => ({ meta: [{ title: "Export — GlucoLab" }] }),
});

interface DailyRow {
  date: string;
  BB: number | ""; AB: number | ""; BL: number | ""; AL: number | "";
  BD: number | ""; AD: number | ""; BT: number | ""; Fasting: number | "";
  insulinM: number | ""; insulinL: number | ""; insulinE: number | ""; insulinN: number | "";
  totalInsulin: number | ""; weight: number | ""; notes: string;
}

async function fetchAll(from: string, to: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const fromIso = new Date(from).toISOString();
  const toIso = new Date(`${to}T23:59:59`).toISOString();
  const [g, i, w, p] = await Promise.all([
    supabase.from("glucose_entries").select("*").eq("user_id", user.id).gte("date_time", fromIso).lte("date_time", toIso).order("date_time"),
    supabase.from("insulin_entries").select("*").eq("user_id", user.id).gte("entry_date", from).lte("entry_date", to),
    supabase.from("weight_entries").select("*").eq("user_id", user.id).gte("entry_date", from).lte("entry_date", to),
    supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    glucose: (g.data ?? []) as GlucoseEntry[],
    insulin: (i.data ?? []) as InsulinEntry[],
    weight: (w.data ?? []) as WeightEntry[],
    profile: p.data,
  };
}

function buildDailyRows(g: GlucoseEntry[], i: InsulinEntry[], w: WeightEntry[]): DailyRow[] {
  const map = new Map<string, DailyRow>();
  const ensure = (d: string): DailyRow => {
    if (!map.has(d)) {
      map.set(d, {
        date: d, BB: "", AB: "", BL: "", AL: "", BD: "", AD: "", BT: "", Fasting: "",
        insulinM: "", insulinL: "", insulinE: "", insulinN: "", totalInsulin: "", weight: "", notes: "",
      });
    }
    return map.get(d)!;
  };

  g.forEach((e) => {
    const d = format(new Date(e.date_time), "yyyy-MM-dd");
    const row = ensure(d);
    row[e.reading_type as ReadingType] = Math.round(Number(e.glucose));
    if (e.notes) row.notes = row.notes ? `${row.notes}; ${e.notes}` : e.notes;
  });

  i.forEach((entry) => {
    const row = ensure(entry.entry_date);
    row.insulinM = Number(entry.morning);
    row.insulinL = Number(entry.lunch);
    row.insulinE = Number(entry.evening);
    row.insulinN = Number(entry.night);
    row.totalInsulin = Number(entry.morning) + Number(entry.lunch) + Number(entry.evening) + Number(entry.night);
  });

  w.forEach((entry) => {
    const row = ensure(entry.entry_date);
    row.weight = Number(entry.weight_kg);
  });

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function ExportPage() {
  const { user } = useAuth();
  const [from, setFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [to, setTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);

  const exportXlsx = async () => {
    if (!user) return;
    setBusy("xlsx");
    try {
      const { glucose, insulin, weight, profile } = await fetchAll(from, to);
      const rows = buildDailyRows(glucose, insulin, weight);
      const data = rows.map((r) => ({
        Date: r.date, BB: r.BB, AB: r.AB, BL: r.BL, AL: r.AL, BD: r.BD, AD: r.AD, BT: r.BT, Fasting: r.Fasting,
        "Insulin M": r.insulinM, "Insulin L": r.insulinL, "Insulin E": r.insulinE, "Insulin N": r.insulinN,
        "Total Insulin": r.totalInsulin, "Weight (kg)": r.weight, Notes: r.notes,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      ws["!cols"] = [{ wch: 12 }, ...Array(8).fill({ wch: 7 }), ...Array(5).fill({ wch: 10 }), { wch: 12 }, { wch: 30 }];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Daily Log");
      const fname = `${(profile?.name || "patient").replace(/\s+/g, "_")}_${from}_to_${to}.xlsx`;
      XLSX.writeFile(wb, fname);
      toast.success("Excel file downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(null); }
  };

  const exportPdf = async () => {
    if (!user) return;
    setBusy("pdf");
    try {
      const { glucose, insulin, weight, profile } = await fetchAll(from, to);
      const rows = buildDailyRows(glucose, insulin, weight);

      const values = glucose.map((g) => Number(g.glucose));
      const avg = values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
      const max = values.length ? Math.max(...values) : 0;
      const min = values.length ? Math.min(...values) : 0;

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("Diabetes Doctor Report", 40, 50);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(110);
      doc.text(`Patient: ${profile?.name || "—"}`, 40, 70);
      doc.text(`Email: ${profile?.email || user.email || "—"}`, 40, 84);
      doc.text(`Period: ${from}  to  ${to}`, 40, 98);
      doc.text(`Generated: ${format(new Date(), "PPpp")}`, 40, 112);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(20);
      doc.text("Summary", 40, 140);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`• Average glucose: ${avg} mg/dL`, 50, 158);
      doc.text(`• Highest: ${max} mg/dL`, 50, 172);
      doc.text(`• Lowest: ${min} mg/dL`, 50, 186);
      doc.text(`• Total readings: ${glucose.length}`, 50, 200);

      autoTable(doc, {
        startY: 220,
        head: [["Date", ...READING_TYPES, "Ins M", "Ins L", "Ins E", "Ins N", "Total", "Weight"]],
        body: rows.map((r) => [
          r.date, r.BB, r.AB, r.BL, r.AL, r.BD, r.AD, r.BT, r.Fasting,
          r.insulinM, r.insulinL, r.insulinE, r.insulinN, r.totalInsulin, r.weight,
        ]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 245, 255] },
      });

      const fname = `${(profile?.name || "patient").replace(/\s+/g, "_")}_doctor_report_${from}_to_${to}.pdf`;
      doc.save(fname);
      toast.success("PDF report downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Export</h1>
        <p className="mt-1 text-sm text-muted-foreground">Download your data as Excel or PDF doctor report.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold">Excel spreadsheet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            One row per day with all glucose slots, insulin doses, weight and notes.
          </p>
          <Button onClick={exportXlsx} disabled={busy !== null} className="mt-4 w-full" size="lg">
            {busy === "xlsx" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building...</> : <><Download className="mr-2 h-4 w-4" />Download .xlsx</>}
          </Button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-soft">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-lg font-bold">Doctor PDF report</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Formatted report with summary stats and a full daily table — ready to email or print.
          </p>
          <Button onClick={exportPdf} disabled={busy !== null} className="mt-4 w-full" size="lg" variant="secondary">
            {busy === "pdf" ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Building...</> : <><Download className="mr-2 h-4 w-4" />Download .pdf</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
