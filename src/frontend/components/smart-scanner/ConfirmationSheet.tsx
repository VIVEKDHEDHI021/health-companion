import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, Shield } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/frontend/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";
import { READING_TYPES, READING_LABELS } from "@/frontend/lib/types";
import { ParsedReading, validatePhysiologicalRange } from "./deviceHeuristics";
import { trainingService } from "@/backend/services/trainingService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reading: ParsedReading | null;
  onSave: (finalData: ParsedReading) => Promise<void>;
}

export function ConfirmationSheet({ open, onOpenChange, reading, onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState("");
  const [readingDate, setReadingDate] = useState("");
  const [readingTime, setReadingTime] = useState("");
  
  // Device Type State (allows user overrides)
  const [deviceType, setDeviceType] = useState<"Blood Glucose Meter" | "Blood Pressure Monitor" | "Pulse Oximeter" | "Thermometer" | "Weight Scale">("Blood Glucose Meter");

  // Dynamic fields
  const [glucose, setGlucose] = useState<number>(0);
  const [glucoseUnit, setGlucoseUnit] = useState("mg/dL");
  const [glucoseType, setGlucoseType] = useState<any>("Fasting");
  
  const [systolic, setSystolic] = useState<number>(0);
  const [diastolic, setDiastolic] = useState<number>(0);
  const [bpPulse, setBpPulse] = useState<number>(0);
  
  const [spo2, setSpo2] = useState<number>(0);
  const [oxPulse, setOxPulse] = useState<number>(0);
  
  const [temperature, setTemperature] = useState<number>(0);
  const [tempUnit, setTempUnit] = useState("°C");
  
  const [weight, setWeight] = useState<number>(0);
  const [weightUnit, setWeightUnit] = useState("kg");

  // Warnings
  const [rangeWarning, setRangeWarning] = useState<string | null>(null);

  // Initialize values when reading changes
  useEffect(() => {
    if (open && reading) {
      const now = new Date();
      setReadingDate(format(now, "yyyy-MM-dd"));
      setReadingTime(format(now, "HH:mm"));
      setNotes(reading.notes || "");
      setRangeWarning(null);
      setDeviceType(reading.deviceType);

      // Prepopulate states based on read data
      const d = reading.data;
      
      // Parse any numeric candidates from raw text to prefill other fields in case user switches device type
      const numbers = (reading.rawText || "").match(/\b\d{1,3}(?:\.\d)?\b/g) || [];
      const num0 = numbers.length > 0 ? parseFloat(numbers[0]) : 0;
      const num1 = numbers.length > 1 ? parseFloat(numbers[1]) : 0;
      const num2 = numbers.length > 2 ? parseFloat(numbers[2]) : 0;

      // Smart pre-population for all possible device types
      setGlucose(d.glucose || (num0 >= 30 && num0 <= 400 ? num0 : 100));
      setGlucoseUnit(d.unit || "mg/dL");
      setGlucoseType(d.glucose_reading_type || glucoseType || "Fasting");

      setSystolic(d.systolic || (num0 >= 70 && num0 <= 200 ? num0 : 120));
      setDiastolic(d.diastolic || (num1 >= 40 && num1 <= 120 ? num1 : 80));
      setBpPulse(d.pulse || (num2 >= 40 && num2 <= 180 ? num2 : 70));

      setSpo2(d.spo2 || (num0 >= 80 && num0 <= 100 ? num0 : 98));
      setOxPulse(d.pulse || (num1 >= 40 && num1 <= 180 ? num1 : 72));

      setTemperature(d.temperature || (num0 >= 30 && num0 <= 110 ? num0 : 36.5));
      setTempUnit(d.unit || "°C");

      setWeight(d.weight || (num0 >= 30 && num0 <= 300 ? num0 : 70.0));
      setWeightUnit(d.unit || "kg");
    }
  }, [open, reading]);

  // Run range validation on change
  useEffect(() => {
    if (!reading) return;

    let testData: any = {};
    if (deviceType === "Blood Glucose Meter") {
      testData = { glucose, unit: glucoseUnit };
    } else if (deviceType === "Blood Pressure Monitor") {
      testData = { systolic, diastolic, pulse: bpPulse };
    } else if (deviceType === "Pulse Oximeter") {
      testData = { spo2, pulse: oxPulse };
    } else if (deviceType === "Thermometer") {
      testData = { temperature, unit: tempUnit };
    } else if (deviceType === "Weight Scale") {
      testData = { weight, unit: weightUnit };
    }

    const valResult = validatePhysiologicalRange(deviceType, testData);
    if (!valResult.valid && valResult.warning) {
      setRangeWarning(valResult.warning);
    } else {
      setRangeWarning(null);
    }
  }, [reading, deviceType, glucose, glucoseUnit, systolic, diastolic, bpPulse, spo2, oxPulse, temperature, tempUnit, weight, weightUnit]);

  if (!reading) return null;

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      // Assemble final data structure
      let finalDataFields: any = {};
      if (deviceType === "Blood Glucose Meter") {
        finalDataFields = { 
          glucose: Number(glucose), 
          unit: glucoseUnit,
          glucose_reading_type: glucoseType 
        };
      } else if (deviceType === "Blood Pressure Monitor") {
        finalDataFields = { 
          systolic: Number(systolic), 
          diastolic: Number(diastolic), 
          pulse: bpPulse ? Number(bpPulse) : undefined, 
          unit: "mmHg" 
        };
      } else if (deviceType === "Pulse Oximeter") {
        finalDataFields = { 
          spo2: Number(spo2), 
          pulse: oxPulse ? Number(oxPulse) : undefined, 
          unit: "%" 
        };
      } else if (deviceType === "Thermometer") {
        finalDataFields = { 
          temperature: Number(temperature), 
          unit: tempUnit 
        };
      } else if (deviceType === "Weight Scale") {
        finalDataFields = { 
          weight: Number(weight), 
          unit: weightUnit 
        };
      }

      const finalPayload: ParsedReading = {
        deviceType: deviceType,
        confidence: reading.confidence,
        data: finalDataFields,
        notes: notes || null,
        rawText: reading.rawText,
      };

      // Inject captured date and time overrides
      (finalPayload as any).reading_date = readingDate;
      (finalPayload as any).reading_time = readingTime;

      // Check for OCR corrections and log feedback
      try {
        const d = reading.data;
        let corrected = false;
        let predictionStr = "";
        let correctedStr = "";

        if (deviceType === "Blood Glucose Meter" && d.glucose !== undefined) {
          if (Number(glucose) !== Number(d.glucose)) {
            corrected = true;
            predictionStr = `glucose: ${d.glucose}`;
            correctedStr = `glucose: ${glucose}`;
          }
        } else if (deviceType === "Blood Pressure Monitor") {
          const sysCorr = d.systolic !== undefined && Number(systolic) !== Number(d.systolic);
          const diaCorr = d.diastolic !== undefined && Number(diastolic) !== Number(d.diastolic);
          const pulseCorr = d.pulse !== undefined && bpPulse && Number(bpPulse) !== Number(d.pulse);
          if (sysCorr || diaCorr || pulseCorr) {
            corrected = true;
            predictionStr = `SYS:${d.systolic || ""}, DIA:${d.diastolic || ""}, Pulse:${d.pulse || ""}`;
            correctedStr = `SYS:${systolic}, DIA:${diastolic}, Pulse:${bpPulse || ""}`;
          }
        } else if (deviceType === "Pulse Oximeter") {
          const spo2Corr = d.spo2 !== undefined && Number(spo2) !== Number(d.spo2);
          const pulseCorr = d.pulse !== undefined && oxPulse && Number(oxPulse) !== Number(d.pulse);
          if (spo2Corr || pulseCorr) {
            corrected = true;
            predictionStr = `SpO2:${d.spo2 || ""}, Pulse:${d.pulse || ""}`;
            correctedStr = `SpO2:${spo2}, Pulse:${oxPulse || ""}`;
          }
        } else if (deviceType === "Thermometer" && d.temperature !== undefined) {
          if (Number(temperature) !== Number(d.temperature)) {
            corrected = true;
            predictionStr = `temp: ${d.temperature}`;
            correctedStr = `temp: ${temperature}`;
          }
        } else if (deviceType === "Weight Scale" && d.weight !== undefined) {
          if (Number(weight) !== Number(d.weight)) {
            corrected = true;
            predictionStr = `weight: ${d.weight}`;
            correctedStr = `weight: ${weight}`;
          }
        }

        if (corrected) {
          trainingService.saveFeedback({
            device_type: deviceType,
            ocr_prediction: predictionStr,
            corrected_value: correctedStr
          });
          console.log(`[Feedback Logged] Corrected ${deviceType} from ${predictionStr} to ${correctedStr}`);
        }
      } catch (err) {
        console.error("Error logging correction feedback:", err);
      }

      await onSave(finalPayload);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  // Render confidence badge
  const renderConfidenceBadge = () => {
    const score = reading.confidence;
    if (score >= 0.85) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200/50">
          <ShieldCheck className="h-3.5 w-3.5" /> High Confidence ({Math.round(score * 100)}%)
        </span>
      );
    } else if (score >= 0.65) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200/50">
          <Shield className="h-3.5 w-3.5" /> Medium Confidence ({Math.round(score * 100)}%)
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/5 px-2.5 py-0.5 text-xs font-semibold text-destructive dark:bg-destructive/10 border border-destructive/20 animate-pulse">
          <ShieldAlert className="h-3.5 w-3.5" /> Low Confidence ({Math.round(score * 100)}%) — please review values
        </span>
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md border-border bg-card shadow-lg rounded-2xl">
        <DialogHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-primary" /> Confirm Reading
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground">
            Review and adjust the extracted device readings.
          </DialogDescription>
          <div className="pt-1.5">{renderConfidenceBadge()}</div>
          <div className="p-3 bg-primary-soft/50 border border-primary/10 rounded-xl text-xs space-y-1 mt-2.5">
            <span className="font-bold text-foreground">Is this reading correct?</span>
            <p className="text-muted-foreground leading-normal">
              Please double check the values. If the OCR was incorrect, adjust the fields below. We will use your corrections to train the scanner's AI.
            </p>
          </div>
        </DialogHeader>

        {rangeWarning && (
          <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-warning leading-relaxed">
            <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-warning" />
            <div>
              <span className="font-semibold">Range Warning:</span> {rangeWarning}
            </div>
          </div>
        )}

        <div className="space-y-4 py-3">
          {/* Device Type Select Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="deviceTypeSelect" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Device Type</Label>
            <Select value={deviceType} onValueChange={(val: any) => setDeviceType(val)}>
              <SelectTrigger id="deviceTypeSelect" className="font-semibold text-foreground">
                <SelectValue placeholder="Select Device Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Blood Glucose Meter">Blood Glucose Meter</SelectItem>
                <SelectItem value="Blood Pressure Monitor">Blood Pressure Monitor</SelectItem>
                <SelectItem value="Pulse Oximeter">Pulse Oximeter</SelectItem>
                <SelectItem value="Thermometer">Thermometer</SelectItem>
                <SelectItem value="Weight Scale">Weight Scale</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dynamic input blocks per device type */}
          {deviceType === "Blood Glucose Meter" && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="glucoseVal">Glucose Value</Label>
                <div className="relative">
                  <Input
                    id="glucoseVal"
                    type="number"
                    value={glucose || ""}
                    onChange={(e) => setGlucose(Number(e.target.value))}
                    className="pr-16 text-lg font-bold"
                  />
                  <span className="absolute right-3 top-2.5 text-sm font-semibold text-muted-foreground">
                    {glucoseUnit}
                  </span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="glucoseUnit">Unit</Label>
                <Select value={glucoseUnit} onValueChange={setGlucoseUnit}>
                  <SelectTrigger id="glucoseUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mg/dL">mg/dL</SelectItem>
                    <SelectItem value="mmol/L">mmol/L</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="glucoseType">Reading Type</Label>
                <Select value={glucoseType} onValueChange={setGlucoseType}>
                  <SelectTrigger id="glucoseType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {READING_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {READING_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {deviceType === "Blood Pressure Monitor" && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sys">Systolic (SYS)</Label>
                <div className="relative">
                  <Input
                    id="sys"
                    type="number"
                    value={systolic || ""}
                    onChange={(e) => setSystolic(Number(e.target.value))}
                    className="text-center text-lg font-bold"
                  />
                  <span className="block text-[10px] text-center text-muted-foreground mt-1">mmHg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dia">Diastolic (DIA)</Label>
                <div className="relative">
                  <Input
                    id="dia"
                    type="number"
                    value={diastolic || ""}
                    onChange={(e) => setDiastolic(Number(e.target.value))}
                    className="text-center text-lg font-bold"
                  />
                  <span className="block text-[10px] text-center text-muted-foreground mt-1">mmHg</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bpPulse">Pulse</Label>
                <div className="relative">
                  <Input
                    id="bpPulse"
                    type="number"
                    value={bpPulse || ""}
                    onChange={(e) => setBpPulse(Number(e.target.value))}
                    className="text-center text-lg font-bold"
                  />
                  <span className="block text-[10px] text-center text-muted-foreground mt-1">bpm</span>
                </div>
              </div>
            </div>
          )}

          {deviceType === "Pulse Oximeter" && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="spo2">SpO₂ Level</Label>
                <div className="relative">
                  <Input
                    id="spo2"
                    type="number"
                    value={spo2 || ""}
                    onChange={(e) => setSpo2(Number(e.target.value))}
                    className="text-center text-lg font-bold pr-8"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="oxPulse">Pulse Rate</Label>
                <div className="relative">
                  <Input
                    id="oxPulse"
                    type="number"
                    value={oxPulse || ""}
                    onChange={(e) => setOxPulse(Number(e.target.value))}
                    className="text-center text-lg font-bold pr-12"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-muted-foreground text-xs">bpm</span>
                </div>
              </div>
            </div>
          )}

          {deviceType === "Thermometer" && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="temp">Temperature</Label>
                <Input
                  id="temp"
                  type="number"
                  step="0.1"
                  value={temperature || ""}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="text-lg font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tempUnit">Unit</Label>
                <Select value={tempUnit} onValueChange={setTempUnit}>
                  <SelectTrigger id="tempUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="°C">°C</SelectItem>
                    <SelectItem value="°F">°F</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {deviceType === "Weight Scale" && (
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={weight || ""}
                  onChange={(e) => setWeight(Number(e.target.value))}
                  className="text-lg font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weightUnit">Unit</Label>
                <Select value={weightUnit} onValueChange={setWeightUnit}>
                  <SelectTrigger id="weightUnit">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="lbs">lbs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Time and Date */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="readingDate">Date</Label>
              <Input
                id="readingDate"
                type="date"
                value={readingDate}
                max={format(new Date(), "yyyy-MM-dd")}
                onChange={(e) => setReadingDate(e.target.value)}
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="readingTime">Time</Label>
              <Input
                id="readingTime"
                type="time"
                value={readingTime}
                onChange={(e) => setReadingTime(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              placeholder="e.g. Felt a bit dizzy before scanning"
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Retake
          </Button>
          <Button
            type="button"
            onClick={handleConfirmSave}
            disabled={saving}
            className="gradient-primary text-primary-foreground font-semibold"
          >
            {saving ? "Saving..." : "Confirm & Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
