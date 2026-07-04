import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Pencil, Trash2, Search, Droplet, Syringe, Utensils, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/db/client";
import { useAuth } from "@/frontend/lib/auth-context";
import { Input } from "@/frontend/components/ui/input";
import { Button } from "@/frontend/components/ui/button";
import { Badge } from "@/frontend/components/ui/badge";
import { GlucoseDialog } from "@/frontend/components/glucose-dialog";
import { READING_LABELS, glucoseStatus, type GlucoseEntry, type InsulinEntry } from "@/frontend/lib/types";
import { cn } from "@/frontend/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
  head: () => ({ meta: [{ title: "History — GlucoLab" }] }),
});

function HistoryPage() {
  const { user } = useAuth();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [entries, setEntries] = useState<GlucoseEntry[]>([]);
  const [insulinEntries, setInsulinEntries] = useState<InsulinEntry[]>([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [editing, setEditing] = useState<GlucoseEntry | null>(null);
  const [open, setOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const handleFromChange = (val: string) => {
    if (val > todayStr) {
      setFrom(todayStr);
    } else {
      setFrom(val);
    }
  };

  const handleToChange = (val: string) => {
    if (val > todayStr) {
      setTo(todayStr);
    } else {
      setTo(val);
    }
  };

  const load = async () => {
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (!currentUser) return;
    
    // Fetch glucose entries
    let q = supabase
      .from("glucose_entries")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("date_time", { ascending: false });
    if (from) q = q.gte("date_time", new Date(from).toISOString());
    if (to) q = q.lte("date_time", new Date(`${to}T23:59:59`).toISOString());
    const { data } = await q;
    if (data) setEntries(data as GlucoseEntry[]);

    // Fetch insulin entries
    const { data: insData } = await supabase
      .from("insulin_entries")
      .select("*")
      .eq("user_id", currentUser.id);
    if (insData) setInsulinEntries(insData as InsulinEntry[]);
  };

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setInsulinEntries([]);
      return;
    }
    load();
    /* eslint-disable-next-line */
  }, [user, from, to]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, from, to]);

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

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filtered.length);
  const paginated = filtered.slice(startIndex, endIndex);

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
          max={to || todayStr}
          onChange={(e) => handleFromChange(e.target.value)}
          aria-label="From date"
        />
        <Input
          type="date"
          value={to}
          min={from}
          max={todayStr}
          onChange={(e) => handleToChange(e.target.value)}
          aria-label="To date"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
            <Droplet className="h-8 w-8" />
            <p className="text-sm">No entries match your filters.</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {paginated.map((e) => {
                const st = glucoseStatus(Number(e.glucose), e.reading_type);
                const entryDateStr = format(new Date(e.date_time), "yyyy-MM-dd");
                const dayInsulin = insulinEntries.find((i) => i.entry_date === entryDateStr);

                return (
                  <li key={e.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-muted/30 transition-all duration-200">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div
                        className={cn(
                          "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-display font-bold shadow-sm border transition-transform duration-200 hover:scale-105",
                          st === "high" && "bg-destructive/10 text-destructive border-destructive/20",
                          st === "low" && "bg-warning/10 text-warning border-warning/20",
                          st === "normal" && "bg-success/10 text-success border-success/20",
                        )}
                      >
                        <div className="text-base leading-none">{Math.round(Number(e.glucose))}</div>
                        <div className="text-[10px] font-semibold opacity-80 mt-0.5">mg/dL</div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            className={cn(
                              "text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 border",
                              st === "high" && "bg-destructive/5 text-destructive border-destructive/10",
                              st === "low" && "bg-warning/5 text-warning border-warning/10",
                              st === "normal" && "bg-success/5 text-success border-success/10",
                            )}
                            variant="outline"
                          >
                            {e.reading_type}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground">
                            {READING_LABELS[e.reading_type]}
                          </span>
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-full capitalize",
                              st === "high" && "bg-destructive/10 text-destructive",
                              st === "low" && "bg-warning/10 text-warning",
                              st === "normal" && "bg-success/10 text-success",
                            )}
                          >
                            {st}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{format(new Date(e.date_time), "EEEE, MMM d, yyyy · HH:mm")}</span>
                        </div>

                        <div className="space-y-1 mt-1">
                          {e.food && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Utensils className="h-3.5 w-3.5 shrink-0 text-muted-foreground/80" />
                              <span className="font-medium text-foreground truncate">
                                Food: <span className="text-muted-foreground font-normal">{e.food}</span>
                              </span>
                            </div>
                          )}

                          {dayInsulin ? (
                            <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 px-2.5 rounded-xl border border-border/50 w-fit">
                              <Syringe className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-[11px] font-medium text-muted-foreground">Daily Insulin:</span>
                              <div className="flex items-center gap-1">
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold" title="Morning">M: {dayInsulin.morning}u</span>
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold" title="Lunch">L: {dayInsulin.lunch}u</span>
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold" title="Evening">E: {dayInsulin.evening}u</span>
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold" title="Night">N: {dayInsulin.night}u</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground border-border/80 ml-1">
                                Total: {Number(dayInsulin.morning) + Number(dayInsulin.lunch) + Number(dayInsulin.evening) + Number(dayInsulin.night)}u
                              </Badge>
                            </div>
                          ) : e.symptoms ? (
                            <div className="flex flex-wrap items-center gap-2 bg-muted/40 p-1.5 px-2.5 rounded-xl border border-border/50 w-fit">
                              <Syringe className="h-3.5 w-3.5 text-primary shrink-0" />
                              <span className="text-[11px] font-medium text-muted-foreground">Daily Insulin:</span>
                              <span className="text-[11px] font-semibold text-foreground">{e.symptoms}</span>
                            </div>
                          ) : null}

                          {e.notes && (
                            <div className="flex items-start gap-2 text-xs text-muted-foreground">
                              <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5 text-muted-foreground/80" />
                              <p className="italic font-normal text-muted-foreground leading-relaxed break-words line-clamp-2" title={e.notes}>
                                &ldquo;{e.notes}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 self-end sm:self-center">
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
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5 border-t border-border bg-card/50">
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{" "}
                  <span className="font-semibold text-foreground">{endIndex}</span> of{" "}
                  <span className="font-semibold text-foreground">{filtered.length}</span> entries
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (totalPages > 5 && Math.abs(page - currentPage) > 1 && page !== 1 && page !== totalPages) {
                        if (page === 2 || page === totalPages - 1) {
                          return <span key={page} className="text-muted-foreground text-xs px-1">...</span>;
                        }
                        return null;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={cn("h-8 w-8 p-0 text-xs", currentPage === page ? "gradient-primary text-primary-foreground font-semibold" : "")}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
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
