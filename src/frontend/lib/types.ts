export const READING_TYPES = ["BB", "AB", "BL", "AL", "BD", "AD", "BT", "Fasting"] as const;
export type ReadingType = (typeof READING_TYPES)[number];

export const READING_LABELS: Record<ReadingType, string> = {
  BB: "Before Breakfast",
  AB: "After Breakfast",
  BL: "Before Lunch",
  AL: "After Lunch",
  BD: "Before Dinner",
  AD: "After Dinner",
  BT: "Bedtime",
  Fasting: "Fasting",
};

export interface GlucoseEntry {
  id: string;
  user_id: string;
  glucose: number;
  reading_type: ReadingType;
  food: string | null;
  notes: string | null;
  symptoms: string | null;
  date_time: string;
  created_at: string;
  updated_at: string;
}

export interface InsulinEntry {
  id: string;
  user_id: string;
  entry_date: string;
  morning: number;
  lunch: number;
  evening: number;
  night: number;
  notes: string | null;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
  notes: string | null;
}

export function glucoseStatus(value: number, type: ReadingType): "low" | "normal" | "high" {
  const isFasting =
    type === "Fasting" || type === "BB" || type === "BL" || type === "BD" || type === "BT";
  if (value < 70) return "low";
  if (isFasting) return value > 130 ? "high" : "normal";
  return value > 180 ? "high" : "normal";
}
