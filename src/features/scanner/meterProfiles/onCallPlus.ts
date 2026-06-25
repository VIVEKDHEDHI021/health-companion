export interface MeterProfile {
  id: string;
  device: string;
  brand: string;
  screenCrop: {
    topRatio: number;
    leftRatio: number;
    widthRatio: number;
    heightRatio: number;
  };
  reading: {
    position: "center" | "top" | "bottom" | string;
    min: number;
    max: number;
    unit: string;
  };
  ignorePatterns: string[];
}

export const onCallPlusProfile: MeterProfile = {
  id: "on_call_plus",
  device: "Blood Glucose Meter",
  brand: "On Call Plus",
  screenCrop: {
    topRatio: 0.18,
    leftRatio: 0.15,
    widthRatio: 0.7,
    heightRatio: 0.55,
  },
  reading: {
    position: "center",
    min: 20,
    max: 700,
    unit: "mg/dL",
  },
  ignorePatterns: ["/", ":", "AM", "PM", "mg", "dL", "MEM"],
};
