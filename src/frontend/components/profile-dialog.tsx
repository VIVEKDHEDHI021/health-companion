import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { healthService } from "@/backend/services/healthService";
import { useAuth } from "@/frontend/lib/auth-context";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/frontend/components/ui/dialog";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  phone: z.string().max(20).optional(),
});
type FormData = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved?: () => void;
}

export function ProfileDialog({ open, onOpenChange, onSaved }: Props) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  useEffect(() => {
    if (open && user) {
      healthService.getProfile().then((res) => {
        if (res.data) {
          form.reset({
            name: res.data.name || "",
            phone: res.data.phone || "",
          });
        }
      });
    }
  }, [open, user, form]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setSaving(true);
    try {
      const res = await healthService.updateProfile(data);
      if (res.error) throw res.error;
      toast.success("Profile updated");
      onOpenChange(false);
      onSaved?.();
    } catch (e) {
      console.error("Profile update error:", e);
      toast.error(e instanceof Error ? e.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Profile Settings</DialogTitle>
          <DialogDescription>
            Update your profile and set a mobile number for glucose alerts.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Your Name</Label>
            <Input id="name" placeholder="John Doe" {...form.register("name")} />
            {form.formState.errors.name && <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone">Alert Mobile Number</Label>
            <Input id="phone" type="tel" placeholder="+1234567890" {...form.register("phone")} />
            <p className="text-[0.7rem] text-muted-foreground">
              We'll send a message to this number whenever you log a new glucose reading.
            </p>
            {form.formState.errors.phone && <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save settings"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
