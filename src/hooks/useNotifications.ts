import { useState, useCallback } from "react";
import { requestNotificationPermission } from "@/services/notificationService";

export function useNotifications() {
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    return Notification.permission;
  });
  const [loading, setLoading] = useState(false);

  const initNotifications = useCallback(async () => {
    if (typeof window === "undefined") return null;
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return null;
    }

    setLoading(true);
    try {
      const fcmToken = await requestNotificationPermission();
      setToken(fcmToken);
      setPermission(Notification.permission);
      return fcmToken;
    } catch (error) {
      console.error("[useNotifications] Error initializing notifications:", error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    token,
    permission,
    loading,
    initNotifications,
  };
}
