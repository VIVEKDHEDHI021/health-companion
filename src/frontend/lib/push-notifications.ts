import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { supabase } from "@/db/client";
import { toast } from "sonner";

export const pushService = {
  async register(userId: string) {
    try {
      // 1. Request permission
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== "granted") {
        console.warn("Push Notifications: Permission denied");
        return;
      }

      // 2. Register with Apple/Google to get a token
      await PushNotifications.register();

      // 3. Listen for the registration event
      PushNotifications.addListener("registration", async (token) => {
        console.log("Push Registration Token:", token.value);

        // 4. Save token to Supabase
        const info = await Device.getInfo();

        const { error } = await supabase.from("push_tokens").upsert(
          {
            user_id: userId,
            token: token.value,
            platform: info.platform,
            device_name: info.model,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,token" },
        );

        if (error) {
          console.error("Error saving push token:", error);
        } else {
          console.log("Push token saved to database");
        }
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push Registration Error:", error);
      });

      // 5. Handle notification received while app is open
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        toast.info(notification.title || "New Alert", {
          description: notification.body,
        });
      });
    } catch (e) {
      console.error("Push Notification Setup Error:", e);
    }
  },
};
