import { OcrResult, OcrBlock } from "./ocrEngine";

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

interface NumberCandidate {
  block: OcrBlock;
  value: number;
  score: number;
}

/**
 * Main parser entry point. Checks all devices and returns the match with highest confidence.
 */
export function detectDeviceAndReadings(ocrInput: OcrResult | string): ParsedReading | null {
  // Check if we already have a parsed result from Gemini AI Vision
  if (typeof ocrInput !== "string" && (ocrInput as any).geminiResult) {
    const gr = (ocrInput as any).geminiResult;
    return {
      deviceType: gr.deviceType,
      confidence: gr.confidence,
      data: gr.data,
      rawText: ocrInput.text,
    };
  }

  let text = "";
  let blocks: OcrBlock[] = [];
  
  if (typeof ocrInput === "string") {
    text = ocrInput;
  } else {
    text = ocrInput.text;
    blocks = ocrInput.blocks;
  }

  const cleanedText = cleanOcrText(text);
  if (!cleanedText) return null;

  // Synthesize blocks if none are provided (fallback for legacy calls)
  if (!blocks || blocks.length === 0) {
    blocks = cleanedText.split(" ").map((word, idx) => ({
      text: word,
      confidence: 75,
      x: 100 + idx * 60,
      y: 300,
      width: 50,
      height: 25
    }));
  }

  // Calculate canvas size bounds from block coordinates
  const canvasWidth = Math.max(...blocks.map(b => b.x + b.width), 960);
  const canvasHeight = Math.max(...blocks.map(b => b.y + b.height), 600);
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  // 1. Identify and Rank Numeric Candidates
  const candidates: NumberCandidate[] = [];
  for (const block of blocks) {
    const cleanedWord = cleanOcrText(block.text);
    const num = parseNumberCorrection(cleanedWord);
    if (num !== null) {
      // Exclude values touching outer 12% borders (likely background noise/keyboard buttons)
      const borderX = canvasWidth * 0.12;
      const borderY = canvasHeight * 0.12;
      const isAtBorder = 
        block.x < borderX || 
        block.y < borderY || 
        (block.x + block.width) > (canvasWidth - borderX) || 
        (block.y + block.height) > (canvasHeight - borderY);

      // Score base on block pixel area and confidence
      let baseScore = (block.height * block.width) * (block.confidence / 100);
      
      // Penalize border noise
      if (isAtBorder) {
        baseScore *= 0.15;
      }

      // Distance multiplier (closeness to center)
      const bCenterX = block.x + block.width / 2;
      const bCenterY = block.y + block.height / 2;
      const dist = Math.sqrt(Math.pow(bCenterX - centerX, 2) + Math.pow(bCenterY - centerY, 2));
      const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
      const distanceFactor = 1.0 - (dist / maxDist) * 0.4; // up to 40% discount for outer edges

      candidates.push({
        block,
        value: num,
        score: baseScore * distanceFactor,
      });
    }
  }

  // Sort candidates so highest visual priority (largest, centered) is first
  candidates.sort((a, b) => b.score - a.score);

  // 2. Identify Device Indicators & Unit Positions
  const keywords = blocks.map(b => ({
    text: cleanOcrText(b.text),
    x: b.x + b.width / 2,
    y: b.y + b.height / 2,
    block: b
  }));

  // Calculate device weights based on keywords
  let glScore = 0;
  let bpScore = 0;
  let oxScore = 0;
  let thScore = 0;
  let wtScore = 0;

  for (const kw of keywords) {
    const t = kw.text;
    // Glucose
    if (t.includes("MG/DL") || t.includes("MG/D") || t.includes("G/DL")) glScore += 100;
    if (t.includes("MMOL/L") || t.includes("MMOL")) glScore += 100;
    if (t.includes("GLU") || t.includes("GLUCOSE") || t.includes("SUGAR")) glScore += 40;

    // Blood Pressure
    if (t.includes("SYS") || t.includes("SYSTOLIC")) bpScore += 80;
    if (t.includes("DIA") || t.includes("DIASTOLIC")) bpScore += 80;
    if (t.includes("MMHG")) bpScore += 80;
    if (t.includes("PULSE") || t.includes("PUL/MIN") || t.includes("/MIN") || t.includes("BPM")) bpScore += 40;

    // Pulse Oximeter
    if (t.includes("SPO2") || t.includes("SP02") || t.includes("%SPO2") || t.includes("%O2")) oxScore += 100;
    if (t === "%") oxScore += 50;
    if (t.includes("PR") || t.includes("BPM") || t.includes("PULSE")) oxScore += 20;

    // Thermometer
    if (t.includes("°C") || t.includes("°F") || t === "C" || t === "F") thScore += 80;
    if (t.includes("TEMP") || t.includes("THERMOMETER") || t.includes("CELSIUS") || t.includes("FAHRENHEIT")) thScore += 50;

    // Weight Scale
    if (t.includes("KG") || t.includes("KILO") || t.includes("LBS") || t.includes("LB")) wtScore += 100;
    if (t.includes("WEIGHT") || t.includes("SCALE") || t.includes("BODY")) wtScore += 40;
  }

  // Helper to find closest unit word to a block
  const getMinDistanceToKeyword = (block: OcrBlock, targetKeywords: string[]) => {
    const bx = block.x + block.width / 2;
    const by = block.y + block.height / 2;
    let minDist = 999999;
    for (const kw of keywords) {
      if (targetKeywords.some(tk => kw.text.includes(tk))) {
        const d = Math.sqrt(Math.pow(bx - kw.x, 2) + Math.pow(by - kw.y, 2));
        if (d < minDist) minDist = d;
      }
    }
    return minDist;
  };

  const parsedDevices: ParsedReading[] = [];

  // ==========================================
  // PARSER 1: BLOOD GLUCOSE
  // ==========================================
  const glucoseCandidates = candidates.filter(c => {
    const val = c.value;
    return (val >= 20 && val <= 700) || (val >= 1.5 && val <= 40.0);
  });

  if (glucoseCandidates.length > 0) {
    const bestCand = glucoseCandidates[0];
    let unit = "mg/dL";
    if (cleanedText.includes("MMOL/L") || cleanedText.includes("MMOL") || bestCand.value <= 40.0) {
      unit = "mmol/L";
    }

    const distToUnit = getMinDistanceToKeyword(bestCand.block, ["MG/DL", "MMOL/L", "GLUCOSE"]);
    let conf = 0.4;
    if (glScore > 0) conf += 0.25;
    if (distToUnit < 250) conf += 0.15;
    if (bestCand.value >= 50 && bestCand.value <= 200) conf += 0.15; // healthy range bonus
    if (bestCand.block.confidence > 75) conf += 0.05;

    parsedDevices.push({
      deviceType: "Blood Glucose Meter",
      confidence: Math.min(0.99, conf),
      data: { glucose: bestCand.value, unit },
      rawText: text
    });
  }

  // ==========================================
  // PARSER 2: BLOOD PRESSURE
  // ==========================================
  // BP usually has 2 large values (SYS and DIA) and 1 smaller (Pulse)
  if (candidates.length >= 2) {
    // Look for a combination of SYS (70-220) and DIA (40-130) where SYS > DIA
    let bestSys: NumberCandidate | null = null;
    let bestDia: NumberCandidate | null = null;
    let bestPulse: NumberCandidate | null = null;
    let bestBPScore = 0;

    for (let i = 0; i < candidates.length; i++) {
      for (let j = 0; j < candidates.length; j++) {
        if (i === j) continue;
        const s = candidates[i];
        const d = candidates[j];

        if (s.value >= 70 && s.value <= 220 && d.value >= 40 && d.value <= 130 && s.value > d.value) {
          // Calculate layout score
          // Check if vertically aligned (similar X coords)
          const sX = s.block.x + s.block.width / 2;
          const dX = d.block.x + d.block.width / 2;
          const xDiff = Math.abs(sX - dX);
          
          let layoutScore = s.score + d.score;
          if (xDiff < 120) layoutScore += 1000; // heavy alignment bonus
          if (s.block.y < d.block.y) layoutScore += 500; // SYS is typically above DIA

          if (layoutScore > bestBPScore) {
            bestBPScore = layoutScore;
            bestSys = s;
            bestDia = d;
          }
        }
      }
    }

    if (bestSys && bestDia) {
      // Find pulse (a remaining candidate in range 40-180, preferably below DIA)
      const sysBlock = (bestSys as NumberCandidate).block;
      const diaBlock = (bestDia as NumberCandidate).block;
      const pulseCandidates = candidates.filter(c => 
        c.block !== sysBlock && 
        c.block !== diaBlock && 
        c.value >= 40 && 
        c.value <= 180
      );
      if (pulseCandidates.length > 0) {
        bestPulse = pulseCandidates[0];
      }

      let conf = 0.35;
      if (bpScore > 0) conf += 0.25;
      if (Math.abs((bestSys.block.x + bestSys.block.width / 2) - (bestDia.block.x + bestDia.block.width / 2)) < 100) conf += 0.20; // good layout
      if (bestSys.value >= 90 && bestSys.value <= 140 && bestDia.value >= 50 && bestDia.value <= 90) conf += 0.15; // standard physiological range
      if (bestPulse) conf += 0.05;

      parsedDevices.push({
        deviceType: "Blood Pressure Monitor",
        confidence: Math.min(0.99, conf),
        data: { 
          systolic: bestSys.value, 
          diastolic: bestDia.value, 
          pulse: bestPulse ? bestPulse.value : undefined, 
          unit: "mmHg" 
        },
        rawText: text
      });
    }
  }

  // ==========================================
  // PARSER 3: PULSE OXIMETER
  // ==========================================
  if (candidates.length >= 2) {
    const spo2Cands = candidates.filter(c => c.value >= 75 && c.value <= 100);
    const pulseCands = candidates.filter(c => c.value >= 40 && c.value <= 180);

    let bestSpo2: NumberCandidate | null = null;
    let bestPls: NumberCandidate | null = null;
    let bestOxCombScore = 0;

    for (const s of spo2Cands) {
      for (const p of pulseCands) {
        if (s.block === p.block) continue;
        
        let comboScore = s.score + p.score;
        const sDist = getMinDistanceToKeyword(s.block, ["SPO2", "SP02", "%", "O2"]);
        const pDist = getMinDistanceToKeyword(p.block, ["PR", "BPM", "PULSE"]);
        
        if (sDist < 200) comboScore += 500;
        if (pDist < 200) comboScore += 500;

        if (comboScore > bestOxCombScore) {
          bestOxCombScore = comboScore;
          bestSpo2 = s;
          bestPls = p;
        }
      }
    }

    if (bestSpo2 && bestPls) {
      let conf = 0.35;
      if (oxScore > 0) conf += 0.25;
      const sDist = getMinDistanceToKeyword(bestSpo2.block, ["SPO2", "SP02", "%", "O2"]);
      if (sDist < 150) conf += 0.15;
      if (bestSpo2.value >= 94) conf += 0.20; // physiological check bonus

      parsedDevices.push({
        deviceType: "Pulse Oximeter",
        confidence: Math.min(0.99, conf),
        data: {
          spo2: bestSpo2.value,
          pulse: bestPls.value,
          unit: "%"
        },
        rawText: text
      });
    }
  }

  // ==========================================
  // PARSER 4: THERMOMETER
  // ==========================================
  // Digital thermometers often omit decimal points. Recover 368 -> 36.8
  const tempCandidates = candidates.map(c => {
    let val = c.value;
    let recoveredDecimal = false;
    if (val >= 320 && val <= 450) {
      val = val / 10;
      recoveredDecimal = true;
    } else if (val >= 896 && val <= 1130) {
      val = val / 10;
      recoveredDecimal = true;
    }
    return { ...c, value: val, recoveredDecimal };
  }).filter(c => {
    const val = c.value;
    return (val >= 32.0 && val <= 45.0) || (val >= 89.6 && val <= 113.0);
  });

  if (tempCandidates.length > 0) {
    const bestCand = tempCandidates[0];
    let unit = "°C";
    if (bestCand.value > 50) unit = "°F";
    else if (cleanedText.includes("°F") || cleanedText.includes(" F ") || cleanedText.endsWith(" F")) unit = "°F";

    const distToUnit = getMinDistanceToKeyword(bestCand.block, ["°C", "°F", "TEMP", "CELSIUS", "FAHRENHEIT"]);
    let conf = 0.35;
    if (thScore > 0) conf += 0.25;
    if (distToUnit < 200) conf += 0.20;
    if (bestCand.value >= 35.5 && bestCand.value <= 39.5 && unit === "°C") conf += 0.15; // physiological
    if (bestCand.recoveredDecimal) conf += 0.04;

    parsedDevices.push({
      deviceType: "Thermometer",
      confidence: Math.min(0.99, conf),
      data: { temperature: bestCand.value, unit },
      rawText: text
    });
  }

  // ==========================================
  // PARSER 5: WEIGHT SCALE
  // ==========================================
  // Weights are decimals or integers. Support 3-digit decimals dot recovery (725 -> 72.5)
  const weightCandidates = candidates.map(c => {
    let val = c.value;
    let recoveredDecimal = false;
    if (val >= 300 && val <= 2500) {
      val = val / 10;
      recoveredDecimal = true;
    }
    return { ...c, value: val, recoveredDecimal };
  }).filter(c => {
    const val = c.value;
    return (val >= 10.0 && val <= 400.0);
  });

  if (weightCandidates.length > 0) {
    const bestCand = weightCandidates[0];
    let unit = "kg";
    if (cleanedText.includes("LB") || cleanedText.includes("LBS")) {
      unit = "lbs";
    }

    const distToUnit = getMinDistanceToKeyword(bestCand.block, ["KG", "KILO", "LB", "LBS", "WEIGHT", "SCALE"]);
    let conf = 0.30;
    if (wtScore > 0) conf += 0.25;
    if (distToUnit < 250) conf += 0.20;
    if (bestCand.value >= 40 && bestCand.value <= 150 && unit === "kg") conf += 0.20; // normal range

    parsedDevices.push({
      deviceType: "Weight Scale",
      confidence: Math.min(0.99, conf),
      data: { weight: bestCand.value, unit },
      rawText: text
    });
  }

  // 3. Select Device with highest confidence match
  if (parsedDevices.length === 0) return null;

  parsedDevices.sort((a, b) => b.confidence - a.confidence);
  
  // If the best match is too weak, let's boost it if it matches keyword scores
  const bestMatch = parsedDevices[0];
  if (bestMatch.deviceType === "Blood Glucose Meter" && glScore > 100) bestMatch.confidence = Math.max(bestMatch.confidence, 0.85);
  if (bestMatch.deviceType === "Blood Pressure Monitor" && bpScore > 100) bestMatch.confidence = Math.max(bestMatch.confidence, 0.85);
  if (bestMatch.deviceType === "Pulse Oximeter" && oxScore > 100) bestMatch.confidence = Math.max(bestMatch.confidence, 0.85);
  if (bestMatch.deviceType === "Thermometer" && thScore > 100) bestMatch.confidence = Math.max(bestMatch.confidence, 0.85);
  if (bestMatch.deviceType === "Weight Scale" && wtScore > 100) bestMatch.confidence = Math.max(bestMatch.confidence, 0.85);

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
