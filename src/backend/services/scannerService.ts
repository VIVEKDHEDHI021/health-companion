import { supabase } from "@/db/client";

export interface ScanReadingData {
  glucose?: number;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  spo2?: number;
  temperature?: number;
  weight?: number;
  unit?: string;
  glucose_reading_type?: "BB" | "AB" | "BL" | "AL" | "BD" | "AD" | "BT" | "Fasting";
}

export interface ScanReadingPayload {
  device_type: "Blood Glucose Meter" | "Blood Pressure Monitor" | "Pulse Oximeter" | "Thermometer" | "Weight Scale";
  reading_date: string; // yyyy-MM-dd
  reading_time: string; // HH:mm
  confidence: number;
  ocr_source: string;
  image_url?: string | null;
  notes?: string | null;
  data: ScanReadingData;
}

export const scannerService = {
  // Save scan reading directly to database
  async saveScanReading(payload: ScanReadingPayload) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // 1. Insert into smart_scan_readings
      const scanInsert = await supabase.from("smart_scan_readings").insert({
        user_id: user.id,
        device_type: payload.device_type,
        reading_date: payload.reading_date,
        reading_time: payload.reading_time,
        confidence: payload.confidence,
        ocr_source: payload.ocr_source,
        image_url: payload.image_url || null,
        notes: payload.notes || null,
        sync_status: "synced",
        data: payload.data as any,
      }).select().single();

      if (scanInsert.error) throw scanInsert.error;

      const combinedDateTime = `${payload.reading_date}T${payload.reading_time}`;
      const utcIsoString = new Date(combinedDateTime).toISOString();

      // 2. Map to existing table: Blood Glucose Meter -> glucose_entries
      if (payload.device_type === "Blood Glucose Meter" && payload.data.glucose !== undefined) {
        const glucoseType = payload.data.glucose_reading_type || "Fasting";
        const glucoseInsert = await supabase.from("glucose_entries").insert({
          user_id: user.id,
          glucose: payload.data.glucose,
          reading_type: glucoseType,
          notes: payload.notes ? `${payload.notes} (Scanned)` : "Scanned via Smart Scanner",
          date_time: utcIsoString,
        });
        if (glucoseInsert.error) {
          console.error("Failed to mirror scan to glucose_entries:", glucoseInsert.error);
        }
      }

      // 3. Map to existing table: Weight Scale -> weight_entries
      if (payload.device_type === "Weight Scale" && payload.data.weight !== undefined) {
        const weightInsert = await supabase.from("weight_entries").upsert({
          user_id: user.id,
          entry_date: payload.reading_date,
          weight_kg: payload.data.weight,
          notes: payload.notes ? `${payload.notes} (Scanned)` : "Scanned via Smart Scanner",
        }, { onConflict: "user_id,entry_date" });
        if (weightInsert.error) {
          console.error("Failed to mirror scan to weight_entries:", weightInsert.error);
        }
      }

      return { data: scanInsert.data, error: null };
    } catch (err: any) {
      console.error("Error saving scan reading:", err);
      return { data: null, error: err };
    }
  },

  // Stubs to prevent compilation breaks in legacy imports
  saveToLocalStorage(payload: ScanReadingPayload) {
    // Disabled
  },

  getPendingScans(): (ScanReadingPayload & { id: string; sync_status: string })[] {
    return [];
  },

  async syncPendingScans() {
    return { success: true, count: 0 };
  },

  // Fetch user's scan history
  async getScanHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    return supabase
      .from("smart_scan_readings")
      .select("*")
      .eq("user_id", user.id)
      .order("reading_date", { ascending: false })
      .order("reading_time", { ascending: false });
  }
};
