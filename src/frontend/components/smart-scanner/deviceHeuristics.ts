export interface ParsedReading {
  deviceType: "Blood Glucose Meter" | "Blood Pressure Monitor" | "Pulse Oximeter" | "Thermometer" | "Weight Scale";
  confidence: number; // 0.0 to 1.0
  data: {
    glucose?: number;
    systolic?: number;
    diastolic?: number;
    pulse?: number;
    spo2?: number;
    temperature?: number;
    weight?: number;
    unit?: string;
  };
  rawText: string;
}

// Clean and normalize text from OCR
export function cleanOcrText(text: string): string {
  return text
    .toUpperCase()
    // Replace characters that OCR often confuses in numbers on segmented screens
    .replace(/[\|\[\]\(\)\{\}]/g, "") // remove brackets/lines
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
}

// Attempt to parse number from a string, fixing common digital display reading errors
function parseNumberCorrection(str: string): number | null {
  // Replace letter O with zero, I/L with 1, S with 5, Z with 2, B with 8, G with 6, etc.
  const cleaned = str
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1")
    .replace(/S/g, "5")
    .replace(/Z/g, "2")
    .replace(/B/g, "8")
    .replace(/G/g, "6")
    .replace(/T/g, "7")
    .replace(/[^\d\.]/g, ""); // strip non-numeric
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parsers for each supported device. Returns ParsedReading or null.
 */

// 1. Blood Glucose Meter Parser
function parseGlucose(text: string): ParsedReading | null {
  let confidence = 0.2;
  let glucoseValue: number | null = null;
  let unit = "mg/dL";

  // Keywords
  if (text.includes("GLU") || text.includes("GLUCOSE") || text.includes("SUGAR") || text.includes("METER")) {
    confidence += 0.3;
  }
  if (text.includes("MG/DL") || text.includes("MG/D") || text.includes("G/DL")) {
    confidence += 0.4;
    unit = "mg/dL";
  } else if (text.includes("MMOL/L") || text.includes("MMOL")) {
    confidence += 0.4;
    unit = "mmol/L";
  }

  // Look for a number next to mg/dL or floating by itself
  // Glucose readings are typically integers between 20 and 600
  const numbers = text.match(/\b\d{2,3}\b/g);
  if (numbers) {
    for (const numStr of numbers) {
      const val = parseNumberCorrection(numStr);
      if (val !== null && val >= 20 && val <= 700) {
        glucoseValue = val;
        confidence += 0.2;
        break;
      }
    }
  }

  // Double check decimal values (mmol/L is typically like 5.6, 7.2 etc)
  if (unit === "mmol/L") {
    const decimals = text.match(/\b\d{1,2}\.\d{1}\b/g);
    if (decimals) {
      const val = parseNumberCorrection(decimals[0]);
      if (val !== null && val >= 1.5 && val <= 40.0) {
        glucoseValue = val;
        confidence += 0.3;
      }
    }
  }

  if (glucoseValue !== null && confidence >= 0.5) {
    return {
      deviceType: "Blood Glucose Meter",
      confidence: Math.min(1.0, confidence),
      data: { glucose: glucoseValue, unit },
      rawText: text,
    };
  }
  return null;
}

// 2. Blood Pressure Monitor Parser
function parseBloodPressure(text: string): ParsedReading | null {
  let confidence = 0.2;
  let systolic: number | null = null;
  let diastolic: number | null = null;
  let pulse: number | null = null;

  // Keywords
  if (text.includes("SYS") || text.includes("SYSTOLIC") || text.includes("DIA") || text.includes("DIASTOLIC") || text.includes("mmHg")) {
    confidence += 0.4;
  }
  if (text.includes("PUL") || text.includes("PULSE") || text.includes("/MIN")) {
    confidence += 0.2;
  }

  // Try to find numbers using labels: SYS, DIA, PULSE
  const sysMatch = text.match(/(?:SYS|SYSTOLIC|mmHg)\D*(\d{2,3})/);
  const diaMatch = text.match(/(?:DIA|DIASTOLIC)\D*(\d{2,3})/);
  const pulMatch = text.match(/(?:PUL|PULSE|PUL\/MIN)\D*(\d{2,3})/);

  if (sysMatch) {
    const s = parseNumberCorrection(sysMatch[1]);
    if (s && s >= 60 && s <= 250) {
      systolic = s;
      confidence += 0.15;
    }
  }
  if (diaMatch) {
    const d = parseNumberCorrection(diaMatch[1]);
    if (d && d >= 30 && d <= 160) {
      diastolic = d;
      confidence += 0.15;
    }
  }
  if (pulMatch) {
    const p = parseNumberCorrection(pulMatch[1]);
    if (p && p >= 35 && p <= 200) {
      pulse = p;
      confidence += 0.1;
    }
  }

  // Fallback: If labels not explicitly matched, look for 3 numbers stacked or consecutive
  // Often displays show: 120 (SYS), 80 (DIA), 72 (PULSE)
  if (!systolic || !diastolic) {
    const numbers = text.match(/\b\d{2,3}\b/g);
    if (numbers && numbers.length >= 2) {
      const candidates = numbers.map(n => parseNumberCorrection(n)).filter((n): n is number => n !== null);
      
      // Look for a pair that resembles BP (e.g. 90-180 and 50-110)
      for (let i = 0; i < candidates.length - 1; i++) {
        const s = candidates[i];
        const d = candidates[i + 1];
        if (s >= 70 && s <= 200 && d >= 40 && d <= 120 && s > d) {
          systolic = s;
          diastolic = d;
          confidence += 0.2;
          
          // Next element could be pulse
          if (i + 2 < candidates.length) {
            const p = candidates[i + 2];
            if (p >= 40 && p <= 180) {
              pulse = p;
              confidence += 0.1;
            }
          }
          break;
        }
      }
    }
  }

  if (systolic && diastolic) {
    return {
      deviceType: "Blood Pressure Monitor",
      confidence: Math.min(1.0, confidence),
      data: { systolic, diastolic, pulse: pulse || undefined, unit: "mmHg" },
      rawText: text,
    };
  }
  return null;
}

// 3. Pulse Oximeter Parser
function parsePulseOximeter(text: string): ParsedReading | null {
  let confidence = 0.2;
  let spo2: number | null = null;
  let pulse: number | null = null;

  // Keywords
  if (text.includes("SPO2") || text.includes("SP02") || text.includes("%SPO2") || text.includes("%O2")) {
    confidence += 0.4;
  }
  if (text.includes("BPM") || text.includes("PR") || text.includes("PULSE")) {
    confidence += 0.2;
  }

  // Standard pulse oximeters display SpO2 (usually 80-100) and Pulse Rate (usually 45-160)
  // Let's find two numbers in the string
  const numbers = text.match(/\b\d{2,3}\b/g);
  if (numbers) {
    const candidates = numbers.map(n => parseNumberCorrection(n)).filter((n): n is number => n !== null);
    
    // One candidate should be SpO2 (75 to 100), the other Pulse Rate (40 to 180)
    const spo2Cand = candidates.find(n => n >= 80 && n <= 100);
    const pulseCand = candidates.find(n => n >= 40 && n <= 180 && n !== spo2Cand);
    
    if (spo2Cand) {
      spo2 = spo2Cand;
      confidence += 0.25;
    }
    if (pulseCand) {
      pulse = pulseCand;
      confidence += 0.25;
    }
  }

  if (spo2 && pulse) {
    return {
      deviceType: "Pulse Oximeter",
      confidence: Math.min(1.0, confidence),
      data: { spo2, pulse, unit: "%" },
      rawText: text,
    };
  }
  return null;
}

// 4. Thermometer Parser
function parseThermometer(text: string): ParsedReading | null {
  let confidence = 0.2;
  let temp: number | null = null;
  let unit = "°C";

  // Keywords
  if (text.includes("TEMP") || text.includes("THERMOMETER") || text.includes("CELSIUS") || text.includes("FAHRENHEIT")) {
    confidence += 0.3;
  }
  if (text.includes("°C") || text.includes(" C ") || text.endsWith(" C")) {
    confidence += 0.3;
    unit = "°C";
  } else if (text.includes("°F") || text.includes(" F ") || text.endsWith(" F")) {
    confidence += 0.3;
    unit = "°F";
  }

  // Look for decimal number (e.g. 36.8, 98.6)
  const decimalMatch = text.match(/\b(\d{2,3})\.(\d{1})\b/);
  if (decimalMatch) {
    const val = parseFloat(`${decimalMatch[1]}.${decimalMatch[2]}`);
    
    // Celsius ranges: 32.0 to 45.0
    // Fahrenheit ranges: 89.6 to 113.0
    if (val >= 32.0 && val <= 45.0) {
      temp = val;
      unit = "°C";
      confidence += 0.3;
    } else if (val >= 89.6 && val <= 113.0) {
      temp = val;
      unit = "°F";
      confidence += 0.3;
    }
  }

  if (temp !== null && confidence >= 0.5) {
    return {
      deviceType: "Thermometer",
      confidence: Math.min(1.0, confidence),
      data: { temperature: temp, unit },
      rawText: text,
    };
  }
  return null;
}

// 5. Weight Scale Parser
function parseWeightScale(text: string): ParsedReading | null {
  let confidence = 0.15;
  let weight: number | null = null;
  let unit = "kg";

  // Keywords
  if (text.includes("WEIGHT") || text.includes("SCALE") || text.includes("BODY")) {
    confidence += 0.25;
  }
  if (text.includes("KG") || text.includes("KILO")) {
    confidence += 0.35;
    unit = "kg";
  } else if (text.includes("LB") || text.includes("LBS")) {
    confidence += 0.35;
    unit = "lbs";
  }

  // Look for a number (often decimal, sometimes integer)
  // Standard weights for adults: 30kg - 300kg, 60lbs - 600lbs
  const decimals = text.match(/\b(\d{2,3})\.(\d{1,2})\b/);
  if (decimals) {
    const val = parseFloat(`${decimals[1]}.${decimals[2]}`);
    if ((unit === "kg" && val >= 30 && val <= 300) || (unit === "lbs" && val >= 60 && val <= 650)) {
      weight = val;
      confidence += 0.3;
    }
  } else {
    // try integer
    const integers = text.match(/\b\d{2,3}\b/g);
    if (integers) {
      const candidates = integers.map(n => parseNumberCorrection(n)).filter((n): n is number => n !== null);
      const val = candidates.find(n => (unit === "kg" && n >= 35 && n <= 200) || (unit === "lbs" && n >= 75 && n <= 450));
      if (val) {
        weight = val;
        confidence += 0.2;
      }
    }
  }

  if (weight !== null && confidence >= 0.5) {
    return {
      deviceType: "Weight Scale",
      confidence: Math.min(1.0, confidence),
      data: { weight, unit },
      rawText: text,
    };
  }
  return null;
}

/**
 * Main parser entry point. Checks all devices and returns the match with highest confidence.
 */
export function detectDeviceAndReadings(rawOcrText: string): ParsedReading | null {
  const cleaned = cleanOcrText(rawOcrText);
  if (!cleaned) return null;

  const parsers = [
    parseGlucose,
    parseBloodPressure,
    parsePulseOximeter,
    parseThermometer,
    parseWeightScale
  ];

  let bestMatch: ParsedReading | null = null;

  for (const parser of parsers) {
    const result = parser(cleaned);
    if (result && (!bestMatch || result.confidence > bestMatch.confidence)) {
      bestMatch = result;
    }
  }

  return bestMatch;
}

/**
 * Validates whether parsed values lie in reasonable human physiological ranges
 */
export function validatePhysiologicalRange(deviceType: string, data: any): { valid: boolean; warning?: string } {
  switch (deviceType) {
    case "Blood Glucose Meter":
      if (data.glucose < 40 || data.glucose > 400) {
        return { valid: false, warning: `Glucose reading (${data.glucose} ${data.unit}) is in a critical range. Please confirm.` };
      }
      break;
    case "Blood Pressure Monitor":
      if (data.systolic < 80 || data.systolic > 200 || data.diastolic < 50 || data.diastolic > 120) {
        return { valid: false, warning: `Blood Pressure (${data.systolic}/${data.diastolic} mmHg) is outside normal ranges. Please verify.` };
      }
      break;
    case "Pulse Oximeter":
      if (data.spo2 < 85) {
        return { valid: false, warning: `SpO2 reading (${data.spo2}%) is abnormally low. Please verify.` };
      }
      break;
    case "Thermometer":
      const tempC = data.unit === "°F" ? ((data.temperature - 32) * 5) / 9 : data.temperature;
      if (tempC < 34.5 || tempC > 41.5) {
        return { valid: false, warning: `Body temperature (${data.temperature}${data.unit}) seems unusual. Please verify.` };
      }
      break;
    case "Weight Scale":
      const wtKg = data.unit === "lbs" ? data.weight * 0.45359237 : data.weight;
      if (wtKg < 35 || wtKg > 200) {
        return { valid: false, warning: `Weight (${data.weight} ${data.unit}) is unusual. Please confirm.` };
      }
      break;
  }
  return { valid: true };
}
