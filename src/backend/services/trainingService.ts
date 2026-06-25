import { supabase } from "@/db/client";

export interface BoundingBox {
  x: number;     // Normalized ratio [0.0, 1.0]
  y: number;     // Normalized ratio [0.0, 1.0]
  width: number; // Normalized ratio [0.0, 1.0]
  height: number;// Normalized ratio [0.0, 1.0]
}

export interface TrainingSample {
  id: string;
  user_id?: string | null;
  device_type: "Blood Glucose Meter" | "Blood Pressure Monitor" | "Pulse Oximeter" | "Thermometer" | "Weight Scale";
  brand: string;
  model: string;
  device_name?: string | null;
  image_url: string; // Base64 or Supabase Storage URL
  image_resolution: { width: number; height: number };
  display_bbox: BoundingBox;
  reading_bboxes: { [field: string]: BoundingBox };
  actual_values: { [field: string]: number | string };
  units: { [field: string]: string };
  created_at?: string;
}

export interface OcrFeedback {
  id: string;
  user_id?: string | null;
  device_type: string;
  ocr_prediction: string;
  corrected_value: string;
  created_at?: string;
}

const LOCAL_SAMPLES_KEY = "glucolab_local_training_samples";
const LOCAL_FEEDBACK_KEY = "glucolab_local_ocr_feedback";

export const trainingService = {
  // Save training sample (attempts Supabase first, falls back to LocalStorage)
  async saveTrainingSample(sample: Omit<TrainingSample, "id" | "created_at">): Promise<{ success: boolean; id: string; local: boolean }> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    let userId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (_) {}

    try {
      // Attempt insert into Supabase
      const { error } = await supabase.from("smart_scan_training_samples").insert({
        id,
        user_id: userId,
        device_type: sample.device_type,
        brand: sample.brand,
        model: sample.model,
        device_name: sample.device_name || null,
        image_url: sample.image_url,
        image_resolution: sample.image_resolution,
        display_bbox: sample.display_bbox,
        reading_bboxes: sample.reading_bboxes,
        actual_values: sample.actual_values,
        units: sample.units,
        created_at: createdAt
      });

      if (error) throw error;
      
      console.log("[TrainingService] Sample saved to Supabase successfully.");
      return { success: true, id, local: false };
    } catch (err) {
      console.warn("[TrainingService] Supabase write failed, saving to LocalStorage fallback:", err);
      
      // LocalStorage Fallback
      const existing = localStorage.getItem(LOCAL_SAMPLES_KEY);
      const items = existing ? JSON.parse(existing) : [];
      const newLocalSample: TrainingSample = {
        ...sample,
        id,
        user_id: userId,
        created_at: createdAt
      };
      items.push(newLocalSample);
      localStorage.setItem(LOCAL_SAMPLES_KEY, JSON.stringify(items));
      
      return { success: true, id, local: true };
    }
  },

  // Retrieve all training samples (merges Supabase + LocalStorage)
  async getTrainingSamples(): Promise<TrainingSample[]> {
    let cloudSamples: TrainingSample[] = [];
    
    try {
      const { data, error } = await supabase
        .from("smart_scan_training_samples")
        .select("*")
        .order("created_at", { ascending: false });
        
      if (!error && data) {
        cloudSamples = data as any[];
      }
    } catch (err) {
      console.warn("[TrainingService] Failed to load cloud samples, relying on local:", err);
    }

    // Load local
    let localSamples: TrainingSample[] = [];
    try {
      const existing = localStorage.getItem(LOCAL_SAMPLES_KEY);
      if (existing) {
        localSamples = JSON.parse(existing);
      }
    } catch (e) {
      console.error(e);
    }

    // Return combined dataset
    return [...localSamples, ...cloudSamples];
  },

  // Delete a training sample
  async deleteTrainingSample(id: string): Promise<boolean> {
    // 1. Try deleting from Supabase
    try {
      const { error } = await supabase
        .from("smart_scan_training_samples")
        .delete()
        .eq("id", id);
      
      if (!error) {
        return true;
      }
    } catch (_) {}

    // 2. Try deleting from LocalStorage fallback
    try {
      const existing = localStorage.getItem(LOCAL_SAMPLES_KEY);
      if (existing) {
        const items: TrainingSample[] = JSON.parse(existing);
        const filtered = items.filter(item => item.id !== id);
        if (filtered.length !== items.length) {
          localStorage.setItem(LOCAL_SAMPLES_KEY, JSON.stringify(filtered));
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }

    return false;
  },

  // Save correction feedback log
  async saveFeedback(feedback: { device_type: string; ocr_prediction: string; corrected_value: string }): Promise<void> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    let userId: string | null = null;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    } catch (_) {}

    try {
      const { error } = await supabase.from("smart_scan_feedback").insert({
        id,
        user_id: userId,
        device_type: feedback.device_type,
        ocr_prediction: feedback.ocr_prediction,
        corrected_value: feedback.corrected_value,
        created_at: createdAt
      });
      if (error) throw error;
    } catch (err) {
      console.warn("[TrainingService] Failed to save feedback to cloud, saving locally:", err);
      // Fallback
      const existing = localStorage.getItem(LOCAL_FEEDBACK_KEY);
      const items = existing ? JSON.parse(existing) : [];
      items.push({
        id,
        user_id: userId,
        ...feedback,
        created_at: createdAt
      });
      localStorage.setItem(LOCAL_FEEDBACK_KEY, JSON.stringify(items));
    }
  },

  // Retrieve feedback logs
  async getFeedback(): Promise<OcrFeedback[]> {
    let cloudFeedback: OcrFeedback[] = [];
    try {
      const { data, error } = await supabase
        .from("smart_scan_feedback")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error && data) cloudFeedback = data;
    } catch (_) {}

    let localFeedback: OcrFeedback[] = [];
    try {
      const existing = localStorage.getItem(LOCAL_FEEDBACK_KEY);
      if (existing) localFeedback = JSON.parse(existing);
    } catch (_) {}

    return [...localFeedback, ...cloudFeedback];
  },

  // Export entire dataset as machine-learning-ready JSON
  async exportDataset(): Promise<void> {
    if (typeof window === "undefined") return;

    const samples = await this.getTrainingSamples();
    const feedback = await this.getFeedback();

    const dataset = {
      description: "Smart Health Scanner Labeled AI Training Dataset",
      export_date: new Date().toISOString(),
      annotation_format: "Normalized ratios [0.0 - 1.0]",
      total_samples: samples.length,
      total_feedback_corrections: feedback.length,
      samples: samples.map(s => ({
        id: s.id,
        device_type: s.device_type,
        brand: s.brand,
        model: s.model,
        device_name: s.device_name || "",
        image_resolution: s.image_resolution,
        display_bbox: s.display_bbox,
        reading_bboxes: s.reading_bboxes,
        actual_values: s.actual_values,
        units: s.units,
        image_url: s.image_url, // contains base64 representation or remote storage URL
        created_at: s.created_at
      })),
      feedback_corrections: feedback
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `smart_health_scanner_dataset_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};
