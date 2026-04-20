import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { READING_TYPES, READING_LABELS, type ReadingType, type GlucoseEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const schema = z.object({
  glucose: z.coerce.number().min(20, "Too low").max(800, "Too high"),
  reading_type: z.enum(READING_TYPES),
  date_time: z.string().min(1, "Required"),
  food: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
  symptoms: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entry?: GlucoseEntry | null;
  onSaved?: () => void;
}

export function GlucoseDialog({ open, onOpenChange, entry, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      glucose: entry?.glucose ?? ("" as unknown as number),
      reading_type: (entry?.reading_type as ReadingType) ?? "BB",
      date_time: entry ? format(new Date(entry.date_time), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      food: entry?.food ?? "",
      notes: entry?.notes ?? "",
      symptoms: entry?.symptoms ?? "",
    },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        glucose: data.glucose,
        reading_type: data.reading_type,
        date_time: new Date(data.date_time).toISOString(),
        food: data.food || null,
        notes: data.notes || null,
        symptoms: data.symptoms || null,
      };
      const res = entry
        ? await supabase.from("glucose_entries").update(payload).eq("id", entry.id)
        : await supabase.from("glucose_entries").insert(payload);
      if (res.error) throw res.error;
      toast.success(entry ? "Reading updated" : "Reading saved");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{entry ? "Edit Glucose Reading" : "Add Glucose Reading"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="glucose">Glucose (mg/dL)</Label>
              <Input id="glucose" type="number" inputMode="numeric" step="1" {...form.register("glucose")} />
              {form.formState.errors.glucose && <p className="text-xs text-destructive">{form.formState.errors.glucose.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Reading type</Label>
              <Select value={form.watch("reading_type")} onValueChange={(v) => form.setValue("reading_type", v as ReadingType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {READING_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t} — {READING_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date_time">Date & time</Label>
            <Input id="date_time" type="datetime-local" {...form.register("date_time")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="food">Food eaten</Label>
            <Input id="food" placeholder="e.g. Oatmeal, fruit" {...form.register("food")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="symptoms">Symptoms</Label>
            <Input id="symptoms" placeholder="e.g. Dizzy, thirsty" {...form.register("symptoms")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save reading"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
