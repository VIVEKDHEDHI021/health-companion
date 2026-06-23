import { getToken } from "firebase/messaging";
import { messaging, vapidKey } from "../lib/firebase";

export async function requestNotificationPermission(): Promise<string | null> {
  console.log("Notification service started");

  // 1. Verify Browser Support
  if (typeof window === "undefined") {
    console.warn("[Notification Service] Running on server-side, skipping registration");
    return null;
  }

  if (!("Notification" in window)) {
    console.error("[Notification Service] This browser does not support desktop notifications.");
    return null;
  }

  if (!("serviceWorker" in navigator)) {
    console.error("[Notification Service] Service Workers are not supported in this browser.");
    return null;
  }

  if (!("PushManager" in window)) {
    console.error("[Notification Service] Push messaging is not supported in this browser.");
    return null;
  }

  if (
    window.location.protocol !== "https:" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    console.error(
      "[Notification Service] Notifications require a secure context (HTTPS or localhost).",
    );
    return null;
  }

  try {
    // 2. Request Permission
    console.log("[Notification Service] Requesting notification permission...");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn(`[Notification Service] Notification permission denied/ignored: ${permission}`);
      return null;
    }
    console.log("Permission granted");

    // 3. Register Service Worker
    console.log("[Notification Service] Registering Service Worker...");
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/",
    });
    console.log("[Notification Service] Service Worker registered successfully:", registration);

    // 4. Retrieve FCM Token
    if (!messaging) {
      console.error("[Notification Service] Firebase messaging client is not initialized.");
      return null;
    }

    console.log("[Notification Service] Retrieving FCM Token...");
    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("FCM Token:", token);
      return token;
    } else {
      console.warn("[Notification Service] No registration token available.");
      return null;
    }
  } catch (error) {
    console.error("[Notification Service] Error during notification setup:", error);
    return null;
  }
}

export function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;

  if (Notification.permission === "granted") {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          reg.showNotification(title, {
            body: body,
            icon: "/logo.png",
          });
        })
        .catch((err) => {
          console.error("Service worker not ready for notification:", err);
          try {
            new Notification(title, { body, icon: "/logo.png" });
          } catch (e) {
            console.error("Failed to show legacy notification fallback:", e);
          }
        });
    } else {
      try {
        new Notification(title, { body, icon: "/logo.png" });
      } catch (e) {
        console.error("Failed to show legacy notification:", e);
      }
    }
  } else {
    console.warn(
      "[Notification Service] Cannot show notification, permission status:",
      Notification.permission,
    );
  }
}
