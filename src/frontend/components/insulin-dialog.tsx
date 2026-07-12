import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/db/client";
import { useAuth } from "@/frontend/lib/auth-context";
import { showLocalNotification, triggerPushNotification } from "../../services/notificationService";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/frontend/components/ui/dialog";

const schema = z.object({
  entry_date: z
    .string()
    .min(1)
    .refine((val) => {
      return val <= format(new Date(), "yyyy-MM-dd");
    }, "Future dates are not allowed"),
  morning: z.coerce.number().min(0).max(200),
  lunch: z.coerce.number().min(0).max(200),
  evening: z.coerce.number().min(0).max(200),
  night: z.coerce.number().min(0).max(200),
});
type FormData = z.output<typeof schema>;
type FormInput = z.input<typeof schema>;

export function InsulinDialog({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormInput, unknown, FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      entry_date: format(new Date(), "yyyy-MM-dd"),
      morning: 0,
      lunch: 0,
      evening: 0,
      night: 0,
    },
  });

  const w = form.watch();
  const entryDate = w.entry_date;

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user || !open || !entryDate) return;
      const { data } = await supabase
        .from("insulin_entries")
        .select("morning, lunch, evening, night")
        .eq("user_id", user.id)
        .eq("entry_date", entryDate)
        .maybeSingle();

      if (active) {
        if (data) {
          form.reset({ entry_date: entryDate, ...data });
        } else {
          form.reset({ entry_date: entryDate, morning: 0, lunch: 0, evening: 0, night: 0 });
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [entryDate, user, open, form]);

  const total =
    (Number(w.morning) || 0) +
    (Number(w.lunch) || 0) +
    (Number(w.evening) || 0) +
    (Number(w.night) || 0);
  const formatted = `${w.morning || 0}-${w.lunch || 0}-${w.evening || 0}-${w.night || 0}`;

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("insulin_entries")
        .upsert({ user_id: user.id, ...data }, { onConflict: "user_id,entry_date" });
      if (error) throw error;
      toast.success("Insulin saved");

      // Show real browser desktop notification
      showLocalNotification(
        "Insulin Schedule Logged",
        `Logged insulin: ${data.morning}-${data.lunch}-${data.evening}-${data.night} units for ${data.entry_date}.`,
      );

      // Trigger background push notification to all user's registered devices
      triggerPushNotification(
        user.id,
        "Insulin Schedule Logged",
        `Insulin schedule of ${data.morning}-${data.lunch}-${data.evening}-${data.night} units was logged for ${data.entry_date}.`,
      );

      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Insulin Schedule</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="entry_date">Date</Label>
            <Input
              id="entry_date"
              type="date"
              max={format(new Date(), "yyyy-MM-dd")}
              {...form.register("entry_date")}
            />
            {form.formState.errors.entry_date && (
              <p className="text-xs text-destructive">{form.formState.errors.entry_date.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["morning", "lunch", "evening", "night"] as const).map((k) => (
              <div key={k} className="space-y-1.5">
                <Label htmlFor={k} className="capitalize">
                  {k} (units)
                </Label>
                <Input id={k} type="number" inputMode="numeric" step="0.5" {...form.register(k)} />
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Schedule</div>
            <div className="mt-1 font-display text-2xl font-bold tracking-wider text-primary">
              {formatted}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{total} units</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
