import { useEffect } from "react";
import { supabase } from "@/db/client";
import { useAuth } from "@/frontend/lib/auth-context";
import { LocalNotifications } from "@capacitor/local-notifications";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";

export function useNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    console.log("[NOTIFICATIONS] Setting up realtime listener for user:", user.id);

    // 1. Request Local Notification permissions on mobile
    if (Capacitor.isNativePlatform()) {
      LocalNotifications.requestPermissions();
    }

    // 2. Subscribe to new glucose entries for this user
    const channel = supabase
      .channel("glucose-alerts")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "glucose_entries",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const newEntry = payload.new;
          console.log("[NOTIFICATIONS] New entry detected:", newEntry);

          // Prepare notification content
          const title = "New Glucose Reading";
          const body = `${newEntry.glucose} mg/dL logged just now.`;

          // 3. Show notification
          if (Capacitor.isNativePlatform()) {
            await LocalNotifications.schedule({
              notifications: [
                {
                  title,
                  body,
                  id: Math.floor(Math.random() * 100000),
                  schedule: { at: new Date(Date.now() + 100) }, // Almost immediate
                  sound: "default",
                  actionTypeId: "",
                  extra: null,
                },
              ],
            });
          } else {
            // Fallback for web
            toast.info(title, {
              description: body,
            });
          }
        },
      )
      .subscribe();

    return () => {
      console.log("[NOTIFICATIONS] Cleaning up listener");
      supabase.removeChannel(channel);
    };
  }, [user]);
}
