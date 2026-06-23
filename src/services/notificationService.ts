import { getToken } from "firebase/messaging";
import { messaging, vapidKey } from "../frontend/lib/firebase";

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      console.log("Notification permission denied.");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey,
    });

    console.log("FCM Token:", token);

    return token;
  } catch (error) {
    console.error("Error getting notification token:", error);
    return null;
  }
}
