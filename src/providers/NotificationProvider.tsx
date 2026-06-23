import React, { createContext, useContext, useEffect, useRef } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "@/frontend/lib/auth-context";

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
      notifications.initNotifications();
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
