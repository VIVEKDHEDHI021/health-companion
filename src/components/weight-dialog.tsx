import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const schema = z.object({
  entry_date: z.string().min(1),
  weight_kg: z.coerce.number().min(20).max(400),
  notes: z.string().max(500).optional(),
});
type FormData = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

export function WeightDialog({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved?: () => void }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: { entry_date: format(new Date(), "yyyy-MM-dd"), weight_kg: undefined as unknown as number, notes: "" },
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("weight_entries").upsert(
        { user_id: user.id, entry_date: data.entry_date, weight_kg: data.weight_kg, notes: data.notes || null },
        { onConflict: "user_id,entry_date" }
      );
      if (error) throw error;
      toast.success("Weight saved");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle className="text-xl">Log Weight</DialogTitle></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entry_date">Date</Label>
            <Input id="entry_date" type="date" {...form.register("entry_date")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">Weight (kg)</Label>
            <Input id="weight_kg" type="number" inputMode="decimal" step="0.1" {...form.register("weight_kg")} />
            {form.formState.errors.weight_kg && <p className="text-xs text-destructive">{form.formState.errors.weight_kg.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Input id="notes" {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
