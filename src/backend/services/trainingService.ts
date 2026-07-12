import { supabase } from "@/db/client";
import { Capacitor } from "@capacitor/core";

export interface BoundingBox {
  x: number; // Normalized ratio [0.0, 1.0]
  y: number; // Normalized ratio [0.0, 1.0]
  width: number; // Normalized ratio [0.0, 1.0]
  height: number; // Normalized ratio [0.0, 1.0]
}

export interface TrainingSample {
  id: string;
  user_id?: string | null;
  device_type:
    | "Blood Glucose Meter"
    | "Blood Pressure Monitor"
    | "Pulse Oximeter"
    | "Thermometer"
    | "Weight Scale";
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

export const trainingService = {
  // Save training sample directly to Supabase (fails if database/network is unavailable)
  async saveTrainingSample(
    sample: Omit<TrainingSample, "id" | "created_at">,
  ): Promise<{ success: boolean; id: string }> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

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
      created_at: createdAt,
    });

    if (error) throw error;

    console.log("[TrainingService] Sample saved to Supabase successfully.");
    return { success: true, id };
  },

  // Retrieve all training samples from Supabase only
  async getTrainingSamples(): Promise<TrainingSample[]> {
    const { data, error } = await supabase
      .from("smart_scan_training_samples")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as any[];
  },

  // Delete a training sample directly from Supabase
  async deleteTrainingSample(id: string): Promise<boolean> {
    const { error } = await supabase.from("smart_scan_training_samples").delete().eq("id", id);

    if (error) throw error;
    return true;
  },

  // Save correction feedback log directly to Supabase
  async saveFeedback(feedback: {
    device_type: string;
    ocr_prediction: string;
    corrected_value: string;
  }): Promise<void> {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { error } = await supabase.from("smart_scan_feedback").insert({
      id,
      user_id: userId,
      device_type: feedback.device_type,
      ocr_prediction: feedback.ocr_prediction,
      corrected_value: feedback.corrected_value,
      created_at: createdAt,
    });
    if (error) throw error;
  },

  // Retrieve feedback logs from Supabase only
  async getFeedback(): Promise<OcrFeedback[]> {
    const { data, error } = await supabase
      .from("smart_scan_feedback")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
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
      samples: samples.map((s) => ({
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
        image_url: s.image_url,
        created_at: s.created_at,
      })),
      feedback_corrections: feedback,
    };

    const fname = `smart_health_scanner_dataset_${new Date().toISOString().split("T")[0]}.json`;

    if (Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Directory, Encoding } = await import("@capacitor/filesystem");
        const { Share } = await import("@capacitor/share");

        const jsonString = JSON.stringify(dataset, null, 2);

        const writeResult = await Filesystem.writeFile({
          path: fname,
          data: jsonString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: fname,
          text: `Exported dataset: ${fname}`,
          url: writeResult.uri,
          dialogTitle: "Save or share dataset JSON",
        });
      } catch (err) {
        console.error("[NATIVE EXPORT] Error sharing/saving JSON file:", err);
        throw err;
      }
      return;
    }

    const dataStr =
      "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataset, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", fname);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  },
};
