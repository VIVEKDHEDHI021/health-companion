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

const LOCAL_STORAGE_KEY = "glucolab_pending_scans";

export const scannerService = {
  // Save scan reading (handles database and auto-mapping to legacy tables)
  async saveScanReading(payload: ScanReadingPayload) {
    // Check if offline
    if (typeof window !== "undefined" && !navigator.onLine) {
      this.saveToLocalStorage(payload);
      return { data: { offline: true }, error: null };
    }

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
      // Fallback: Save locally if database insert failed due to network glitch
      this.saveToLocalStorage(payload);
      return { data: null, error: err };
    }
  },

  // Save scan locally for offline mode
  saveToLocalStorage(payload: ScanReadingPayload) {
    if (typeof window === "undefined") return;
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
      const items = existing ? JSON.parse(existing) : [];
      items.push({
        ...payload,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        sync_status: "pending"
      });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save scan to local storage:", e);
    }
  },

  // Get pending offline scans
  getPendingScans(): (ScanReadingPayload & { id: string; sync_status: string })[] {
    if (typeof window === "undefined") return [];
    try {
      const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
      return existing ? JSON.parse(existing) : [];
    } catch (e) {
      console.error("Failed to read pending scans:", e);
      return [];
    }
  },

  // Sync pending scans to server
  async syncPendingScans(onProgress?: (index: number, total: number) => void) {
    if (typeof window === "undefined") return { success: true, count: 0 };
    const pending = this.getPendingScans();
    if (pending.length === 0) return { success: true, count: 0 };

    console.log(`[SYNC] Syncing ${pending.length} pending scans...`);
    let successCount = 0;
    const remaining: typeof pending = [];

    for (let i = 0; i < pending.length; i++) {
      onProgress?.(i, pending.length);
      const item = pending[i];
      // strip local uuid/status metadata before saving
      const payload: ScanReadingPayload = {
        device_type: item.device_type,
        reading_date: item.reading_date,
        reading_time: item.reading_time,
        confidence: item.confidence,
        ocr_source: item.ocr_source,
        image_url: item.image_url,
        notes: item.notes,
        data: item.data,
      };

      const res = await this.saveScanReading(payload);
      if (!res.error && (!res.data || !("offline" in res.data))) {
        successCount++;
      } else {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(remaining));
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }

    return { success: remaining.length === 0, count: successCount };
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
