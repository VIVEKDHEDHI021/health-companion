import { toast } from "sonner";

/**
 * Service to handle sending messages (SMS, etc.)
 * To use a real SMS service like Twilio, add your credentials to .env 
 * and implement the fetch call here.
 */
export const messagingService = {
  async sendGlucoseAlert(phone: string, data: { glucose: number; type: string; date: string; notes?: string | null }) {
    console.log(`[MESSAGING_SERVICE] Preparing alert for ${phone}...`);
    
    if (!phone) {
      console.warn("[MESSAGING_SERVICE] No phone number provided, skipping alert.");
      return;
    }

    const message = `GlucoLab Alert: New reading ${data.glucose} mg/dL (${data.type}) at ${data.date}. ${data.notes ? "Notes: " + data.notes : ""}`;

    console.log(`[MESSAGING_SERVICE] MESSAGE CONTENT: "${message}"`);
    console.log(`[MESSAGING_SERVICE] TO: ${phone}`);

    // NOTE: This is currently a MOCK implementation. 
    // To send real SMS, you need to integrate with a provider like Twilio.
    console.info("[MESSAGING_SERVICE] This is a mock. Real SMS sending is not yet implemented.");

    // For now, we'll just show a toast to confirm the logic is working
    toast.info("Alert message simulated", {
      description: `Sent to ${phone}: ${data.glucose} mg/dL`,
    });
    
    return true;
  }
};
