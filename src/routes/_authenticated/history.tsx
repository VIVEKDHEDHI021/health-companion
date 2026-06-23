import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Search, Droplet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/db/client";
import { useAuth } from "@/frontend/lib/auth-context";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { GlucoseDialog } from "@/frontend/components/glucose-dialog";
import { READING_LABELS, glucoseStatus, type GlucoseEntry } from "@/frontend/lib/types";
import { cn } from "@/frontend/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — GlucoLab" }] }),
});

function HistoryPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<GlucoseEntry[]>([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<GlucoseEntry | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) return;
    let q = supabase
      .from("glucose_entries")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("date_time", { ascending: false });
    if (from) q = q.gte("date_time", new Date(from).toISOString());
    if (to) q = q.lte("date_time", new Date(`${to}T23:59:59`).toISOString());
    const { data } = await q;
    if (data) setEntries(data as GlucoseEntry[]);
  };

  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }
    load();
    /* eslint-disable-next-line */
  }, [user, from, to]);

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (e.notes ?? "").toLowerCase().includes(s) ||
      (e.food ?? "").toLowerCase().includes(s) ||
      (e.symptoms ?? "").toLowerCase().includes(s) ||
      e.reading_type.toLowerCase().includes(s)
    );
  });

  const handleDelete = async (id: string) => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) {
      toast.error("Not authenticated");
      return;
    }
    if (!confirm("Delete this entry?")) return;
    const { error } = await supabase
      .from("glucose_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deleted");
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold">History</h1>
        <p className="mt-1 text-sm text-muted-foreground">All your glucose readings.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative sm:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notes, food..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
        />
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Droplet className="h-8 w-8" />
            <p className="text-sm">No entries match your filters.</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((e) => {
              const st = glucoseStatus(Number(e.glucose), e.reading_type);
              return (
                <li key={e.id} className="flex items-center gap-4 p-4 sm:p-5">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl font-display font-bold",
                      st === "high" && "bg-destructive/10 text-destructive",
                      st === "low" && "bg-warning/10 text-warning",
                      st === "normal" && "bg-success/10 text-success",
                    )}
                  >
                    <div className="text-sm leading-none">{Math.round(Number(e.glucose))}</div>
                    <div className="text-[9px] font-semibold opacity-80">mg/dL</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {e.reading_type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {READING_LABELS[e.reading_type]}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-sm text-foreground">
                      {format(new Date(e.date_time), "EEE, MMM d · HH:mm")}
                    </div>
                    {(e.food || e.notes || e.symptoms) && (
                      <div className="mt-0.5 truncate text-xs text-muted-foreground">
                        {[e.food, e.symptoms ? `Insulin: ${e.symptoms}` : null, e.notes]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(e.id)}
                      aria-label="Delete"
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <GlucoseDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setEditing(null);
        }}
        entry={editing}
        onSaved={load}
      />
    </div>
  );
}
