import { Capacitor } from "@capacitor/core";
import { supabase } from "@/db/client";
import { localDbService } from "./localDbService";
import { toast } from "sonner";

const isMobile = Capacitor.isNativePlatform();
let isSyncing = false;

export const syncService = {
  // Setup listener for network reconnection
  async setupNetworkSyncListener() {
    if (!isMobile) return;

    try {
      const { Network } = await import("@capacitor/network");

      // Check current status on load
      const status = await Network.getStatus();
      if (status.connected) {
        this.syncPendingData();
      }

      // Add reconnection listener
      Network.addListener("networkStatusChange", (change) => {
        console.log("[SYNC] Network status change detected:", change);
        if (change.connected) {
          // Silent sync - no toast message shown to user
          this.syncPendingData();
        }
      });
    } catch (err) {
      console.error("[SYNC] Failed to initialize Network connection listener:", err);
    }
  },

  // Read SQLite pending rows and upload them to Supabase
  async syncPendingData() {
    if (!isMobile || isSyncing) return;
    isSyncing = true;

    try {
      console.log("[SYNC] Querying pending records from SQLite...");
      const { glucose, insulin, weight, profile, scans } = await localDbService.getPendingSyncRows();

      let syncedCount = 0;

      // 1. Sync Glucose Entries
      if (glucose.length > 0) {
        console.log(`[SYNC] Syncing ${glucose.length} glucose entries...`);
        for (const g of glucose) {
          const { error } = await supabase.from("glucose_entries").insert({
            id: g.id,
            user_id: g.user_id,
            glucose: g.glucose,
            reading_type: g.reading_type,
            notes: g.notes,
            date_time: g.date_time,
          });

          if (!error) {
            await localDbService.runQuery(
              `UPDATE glucose_entries SET sync_status = 'synced' WHERE id = ?`,
              [g.id]
            );
            syncedCount++;
          } else {
            console.error(`[SYNC] Failed to sync glucose ID ${g.id}:`, error);
          }
        }
      }

      // 2. Sync Insulin Entries
      if (insulin.length > 0) {
        console.log(`[SYNC] Syncing ${insulin.length} insulin entries...`);
        for (const i of insulin) {
          const { error } = await supabase.from("insulin_entries").insert({
            id: i.id,
            user_id: i.user_id,
            morning: i.morning,
            lunch: i.lunch,
            afternoon: i.afternoon || 0,
            evening: i.evening,
            night: i.night,
            entry_date: i.entry_date,
          });

          if (!error) {
            await localDbService.runQuery(
              `UPDATE insulin_entries SET sync_status = 'synced' WHERE id = ?`,
              [i.id]
            );
            syncedCount++;
          } else {
            console.error(`[SYNC] Failed to sync insulin ID ${i.id}:`, error);
          }
        }
      }

      // 3. Sync Weight Entries
      if (weight.length > 0) {
        console.log(`[SYNC] Syncing ${weight.length} weight entries...`);
        for (const w of weight) {
          const { error } = await supabase.from("weight_entries").insert({
            id: w.id,
            user_id: w.user_id,
            weight_kg: w.weight_kg,
            notes: w.notes,
            entry_date: w.entry_date,
          });

          if (!error) {
            await localDbService.runQuery(
              `UPDATE weight_entries SET sync_status = 'synced' WHERE id = ?`,
              [w.id]
            );
            syncedCount++;
          } else {
            console.error(`[SYNC] Failed to sync weight ID ${w.id}:`, error);
          }
        }
      }

      // 4. Sync Profiles
      if (profile.length > 0) {
        console.log(`[SYNC] Syncing ${profile.length} profiles...`);
        for (const p of profile) {
          const { error } = await supabase.from("profiles").upsert({
            user_id: p.user_id,
            name: p.name,
            phone: p.phone,
          });

          if (!error) {
            await localDbService.runQuery(
              `UPDATE profiles SET sync_status = 'synced' WHERE user_id = ?`,
              [p.user_id]
            );
            syncedCount++;
          } else {
            console.error(`[SYNC] Failed to sync profile for user ${p.user_id}:`, error);
          }
        }
      }

      // 5. Sync Smart Scans
      if (scans.length > 0) {
        console.log(`[SYNC] Syncing ${scans.length} smart scans...`);
        for (const s of scans) {
          const { error } = await supabase.from("smart_scan_readings").insert({
            id: s.id,
            user_id: s.user_id,
            device_type: s.device_type,
            reading_date: s.reading_date,
            reading_time: s.reading_time,
            confidence: s.confidence,
            ocr_source: s.ocr_source,
            image_url: s.image_url || null,
            notes: s.notes || null,
            sync_status: "synced",
            data: s.data,
          });

          if (!error) {
            await localDbService.runQuery(
              `UPDATE smart_scan_readings SET sync_status = 'synced' WHERE id = ?`,
              [s.id]
            );
            syncedCount++;
          } else {
            console.error(`[SYNC] Failed to sync scan ID ${s.id}:`, error);
          }
        }
      }

      // Silent sync complete - no toast message shown to user
    } catch (err) {
      console.error("[SYNC] Sync execution failed:", err);
    } finally {
      isSyncing = false;
    }
  },
};
