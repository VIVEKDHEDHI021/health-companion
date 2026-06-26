import { Capacitor } from "@capacitor/core";

// We use dynamic imports for native Capacitor SQLite to avoid breaking Web builds
let sqliteConnection: any = null;
let database: any = null;

const isMobile = Capacitor.isNativePlatform();

export const localDbService = {
  // Initialize connection and tables on mobile
  async initDb() {
    if (!isMobile) return;

    try {
      console.log("[SQLITE] Initializing database...");
      const { CapacitorSQLite, SQLiteConnection } = await import("@capacitor-community/sqlite");
      
      sqliteConnection = new SQLiteConnection(CapacitorSQLite);
      
      // Check if connection already exists
      const isConn = await sqliteConnection.isConnection("glucolab_local", false);
      
      if (isConn.result) {
        database = await sqliteConnection.retrieveConnection("glucolab_local", false);
      } else {
        database = await sqliteConnection.createConnection(
          "glucolab_local",
          false,
          "no-encryption",
          1,
          false
        );
      }

      await database.open();
      console.log("[SQLITE] Database opened successfully.");

      // Run DDL scripts
      const tablesSchema = `
        CREATE TABLE IF NOT EXISTS glucose_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          glucose REAL,
          reading_type TEXT,
          notes TEXT,
          date_time TEXT,
          sync_status TEXT DEFAULT 'synced'
        );
        CREATE TABLE IF NOT EXISTS insulin_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          morning INTEGER,
          lunch INTEGER,
          evening INTEGER,
          night INTEGER,
          entry_date TEXT,
          sync_status TEXT DEFAULT 'synced'
        );
        CREATE TABLE IF NOT EXISTS weight_entries (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          weight_kg REAL,
          notes TEXT,
          entry_date TEXT,
          sync_status TEXT DEFAULT 'synced'
        );
        CREATE TABLE IF NOT EXISTS profiles (
          user_id TEXT PRIMARY KEY,
          name TEXT,
          phone TEXT,
          sync_status TEXT DEFAULT 'synced'
        );
        CREATE TABLE IF NOT EXISTS smart_scan_readings (
          id TEXT PRIMARY KEY,
          user_id TEXT,
          device_type TEXT,
          reading_date TEXT,
          reading_time TEXT,
          confidence REAL,
          ocr_source TEXT,
          image_url TEXT,
          notes TEXT,
          data TEXT,
          sync_status TEXT DEFAULT 'synced'
        );
      `;
      
      await database.execute(tablesSchema);
      console.log("[SQLITE] Database schema verified.");
    } catch (err) {
      console.error("[SQLITE] Failed to initialize local SQLite database:", err);
    }
  },

  // Generic write execution
  async runQuery(query: string, values: any[] = []) {
    if (!isMobile || !database) return null;
    try {
      return await database.run(query, values);
    } catch (err) {
      console.error(`[SQLITE] Run query failed: ${query}`, err);
      throw err;
    }
  },

  // Generic read query
  async selectQuery(query: string, values: any[] = []) {
    if (!isMobile || !database) return [];
    try {
      const res = await database.query(query, values);
      return res.values || [];
    } catch (err) {
      console.error(`[SQLITE] Select query failed: ${query}`, err);
      return [];
    }
  },

  // Cache glucose entries
  async cacheGlucose(entries: any[]) {
    if (!isMobile || !database) return;
    try {
      for (const entry of entries) {
        await database.run(
          `INSERT OR REPLACE INTO glucose_entries (id, user_id, glucose, reading_type, notes, date_time, sync_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [entry.id, entry.user_id, entry.glucose, entry.reading_type, entry.notes, entry.date_time, entry.sync_status || "synced"]
        );
      }
    } catch (err) {
      console.error("[SQLITE] Error caching glucose:", err);
    }
  },

  // Get glucose entries
  async getGlucose(userId: string) {
    return this.selectQuery(
      `SELECT * FROM glucose_entries WHERE user_id = ? ORDER BY date_time DESC`,
      [userId]
    );
  },

  // Cache insulin entries
  async cacheInsulin(entries: any[]) {
    if (!isMobile || !database) return;
    try {
      for (const entry of entries) {
        await database.run(
          `INSERT OR REPLACE INTO insulin_entries (id, user_id, morning, lunch, evening, night, entry_date, sync_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [entry.id, entry.user_id, entry.morning, entry.lunch, entry.evening, entry.night, entry.entry_date, entry.sync_status || "synced"]
        );
      }
    } catch (err) {
      console.error("[SQLITE] Error caching insulin:", err);
    }
  },

  // Get insulin entries
  async getInsulin(userId: string) {
    return this.selectQuery(
      `SELECT * FROM insulin_entries WHERE user_id = ? ORDER BY entry_date DESC`,
      [userId]
    );
  },

  // Cache weight entries
  async cacheWeight(entries: any[]) {
    if (!isMobile || !database) return;
    try {
      for (const entry of entries) {
        await database.run(
          `INSERT OR REPLACE INTO weight_entries (id, user_id, weight_kg, notes, entry_date, sync_status) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [entry.id, entry.user_id, entry.weight_kg, entry.notes, entry.entry_date, entry.sync_status || "synced"]
        );
      }
    } catch (err) {
      console.error("[SQLITE] Error caching weight:", err);
    }
  },

  // Get weight entries
  async getWeight(userId: string) {
    return this.selectQuery(
      `SELECT * FROM weight_entries WHERE user_id = ? ORDER BY entry_date DESC`,
      [userId]
    );
  },

  // Cache profile
  async cacheProfile(userId: string, profile: any) {
    if (!isMobile || !database || !profile) return;
    try {
      await database.run(
        `INSERT OR REPLACE INTO profiles (user_id, name, phone, sync_status) VALUES (?, ?, ?, ?)`,
        [userId, profile.name || "", profile.phone || "", profile.sync_status || "synced"]
      );
    } catch (err) {
      console.error("[SQLITE] Error caching profile:", err);
    }
  },

  // Get profile
  async getProfile(userId: string) {
    const rows = await this.selectQuery(`SELECT * FROM profiles WHERE user_id = ?`, [userId]);
    return rows.length > 0 ? rows[0] : null;
  },

  // Cache smart scan readings
  async cacheScanReadings(readings: any[]) {
    if (!isMobile || !database) return;
    try {
      for (const r of readings) {
        await database.run(
          `INSERT OR REPLACE INTO smart_scan_readings (id, user_id, device_type, reading_date, reading_time, confidence, ocr_source, image_url, notes, data, sync_status) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id,
            r.user_id,
            r.device_type,
            r.reading_date,
            r.reading_time,
            r.confidence,
            r.ocr_source,
            r.image_url || "",
            r.notes || "",
            typeof r.data === "string" ? r.data : JSON.stringify(r.data),
            r.sync_status || "synced",
          ]
        );
      }
    } catch (err) {
      console.error("[SQLITE] Error caching scan readings:", err);
    }
  },

  // Get smart scan readings
  async getScanReadings(userId: string) {
    const rows = await this.selectQuery(
      `SELECT * FROM smart_scan_readings WHERE user_id = ? ORDER BY reading_date DESC, reading_time DESC`,
      [userId]
    );
    return rows.map((r: any) => ({
      ...r,
      data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
    }));
  },

  // Fetch all pending sync rows across all tables
  async getPendingSyncRows() {
    const pendingGlucose = await this.selectQuery(`SELECT * FROM glucose_entries WHERE sync_status = 'pending_sync'`);
    const pendingInsulin = await this.selectQuery(`SELECT * FROM insulin_entries WHERE sync_status = 'pending_sync'`);
    const pendingWeight = await this.selectQuery(`SELECT * FROM weight_entries WHERE sync_status = 'pending_sync'`);
    const pendingProfile = await this.selectQuery(`SELECT * FROM profiles WHERE sync_status = 'pending_sync'`);
    const pendingScans = await this.selectQuery(`SELECT * FROM smart_scan_readings WHERE sync_status = 'pending_sync'`);

    return {
      glucose: pendingGlucose,
      insulin: pendingInsulin,
      weight: pendingWeight,
      profile: pendingProfile,
      scans: pendingScans.map((r: any) => ({
        ...r,
        data: typeof r.data === "string" ? JSON.parse(r.data) : r.data,
      })),
    };
  },

  // Clear caches
  async clearAllCaches() {
    if (!isMobile || !database) return;
    try {
      await database.execute(`
        DELETE FROM glucose_entries;
        DELETE FROM insulin_entries;
        DELETE FROM weight_entries;
        DELETE FROM profiles;
        DELETE FROM smart_scan_readings;
      `);
      console.log("[SQLITE] Local caches cleared.");
    } catch (err) {
      console.error("[SQLITE] Failed to clear local caches:", err);
    }
  }
};
