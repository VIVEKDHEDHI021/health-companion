import React, { createContext, useContext, useEffect, useRef } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "@/frontend/lib/auth-context";
import { supabase } from "@/db/client";

interface NotificationContextType {
  token: string | null;
  permission: NotificationPermission | "unsupported";
  loading: boolean;
  initNotifications: () => Promise<string | null>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const notifications = useNotifications();
  const initializedRef = useRef(false);

  useEffect(() => {
    // Only request permission/register token once when the user is logged in
    if (user && !initializedRef.current && typeof window !== "undefined") {
      initializedRef.current = true;
      notifications.initNotifications().then(async (token) => {
        if (token) {
          console.log("[NotificationProvider] Saving FCM web token to database...");
          const { error } = await supabase.from("push_tokens").upsert(
            {
              user_id: user.id,
              token: token,
              platform: "web",
              device_name: navigator.userAgent.substring(0, 100),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,token" },
          );
          if (error) {
            console.error("[NotificationProvider] Error saving web FCM token:", error);
          } else {
            console.log(
              "[NotificationProvider] Web FCM token successfully registered in database.",
            );
          }
        }
      });
    }
  }, [user, notifications]);

  return (
    <NotificationContext.Provider value={notifications}>{children}</NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotificationContext must be used within a NotificationProvider");
  }
  return context;
}
