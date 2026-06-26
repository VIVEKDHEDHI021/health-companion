import { createFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Upload,
  Trash2,
  Download,
  Layers,
  Cpu,
  Activity,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight,
  Database,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";
import { toast } from "sonner";
import { trainingService, TrainingSample, BoundingBox } from "@/backend/services/trainingService";

export const Route = createFileRoute("/_authenticated/training")({
  component: TrainingPage,
  head: () => ({ meta: [{ title: "AI Training Portal — GlucoLab" }] }),
});

type ActiveTab = "workspace" | "dataset";

// Fields required per device type
const DEVICE_LABELS = {
  "Blood Glucose Meter": ["glucose", "unit"],
  "Blood Pressure Monitor": ["systolic", "diastolic", "pulse"],
  "Pulse Oximeter": ["spo2", "pulse"],
  Thermometer: ["temperature", "unit"],
  "Weight Scale": ["weight", "unit"],
};

const FIELD_HELP = {
  display: "Draw a box around the LCD Display Screen.",
  glucose: "Draw a box around the Glucose Reading Digits.",
  systolic: "Draw a box around the Systolic Pressure value.",
  diastolic: "Draw a box around the Diastolic Pressure value.",
  pulse: "Draw a box around the Pulse Rate value.",
  spo2: "Draw a box around the SpO2 % value.",
  temperature: "Draw a box around the Temperature value.",
  weight: "Draw a box around the Weight value.",
  unit: "Draw a box around the unit string (e.g. mg/dL, kg, °C).",
};

function TrainingPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ActiveTab>("workspace");
  const [samples, setSamples] = useState<TrainingSample[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters / Search
  const [filterDevice, setFilterDevice] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [searchModel, setSearchModel] = useState<string>("");

  // Step 1: Upload Details
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageRes, setImageRes] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const [deviceType, setDeviceType] = useState<keyof typeof DEVICE_LABELS>("Blood Glucose Meter");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [deviceName, setDeviceName] = useState("");

  // Step 2: Annotation Workspace State
  // We guide the user step by step: 'display' first, then each field for the device
  const [annotationStep, setAnnotationStep] = useState<number>(0); // 0 = display, 1+ = field indexes
  const [displayBbox, setDisplayBbox] = useState<BoundingBox | null>(null);
  const [readingBboxes, setReadingBboxes] = useState<{ [field: string]: BoundingBox }>({});
  const [actualValues, setActualValues] = useState<{ [field: string]: string | number }>({});
  const [units, setUnits] = useState<{ [field: string]: string }>({});

  // Drawing mouse states
  const workspaceRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  // Field values temp input
  const [tempValue, setTempValue] = useState("");

  // Fetch dataset on mount/tab change
  const fetchDataset = async () => {
    setLoading(true);
    try {
      const data = await trainingService.getTrainingSamples();
      setSamples(data);
    } catch (e) {
      toast.error("Failed to load dataset.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataset();
  }, [activeTab]);

  // Handle uploaded image
  const handleImageLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const src = event.target.result as string;
        setImageSrc(src);

        // Extract natural resolution
        const img = new Image();
        img.onload = () => {
          setImageRes({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.src = src;

        // Reset drawing state
        setAnnotationStep(0);
        setDisplayBbox(null);
        setReadingBboxes({});
        setActualValues({});
        setUnits({});
        setCurrentBox(null);
        setTempValue("");
      }
    };
    reader.readAsDataURL(file);
  };

  const currentFields = DEVICE_LABELS[deviceType] || [];
  const currentStepField = annotationStep === 0 ? "display" : currentFields[annotationStep - 1];

  // Mouse/Pointer Drawing Handlers
  const handlePointerDown = (e: React.MouseEvent) => {
    if (!imageSrc || !workspaceRef.current) return;

    const rect = workspaceRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);
    setDrawStart({ x, y });
    setCurrentBox({ x, y, w: 0, h: 0 });
  };

  const handlePointerMove = (e: React.MouseEvent) => {
    if (!isDrawing || !currentBox || !workspaceRef.current) return;

    const rect = workspaceRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

    const x = Math.min(drawStart.x, currentX);
    const y = Math.min(drawStart.y, currentY);
    const w = Math.abs(drawStart.x - currentX);
    const h = Math.abs(drawStart.y - currentY);

    setCurrentBox({ x, y, w, h });
  };

  const handlePointerUp = () => {
    if (!isDrawing || !currentBox || !workspaceRef.current) return;
    setIsDrawing(false);

    // Filter tiny clicks
    if (currentBox.w < 10 || currentBox.h < 10) {
      setCurrentBox(null);
      return;
    }

    // Save Bounding Box as percentage ratios (0.0 to 1.0)
    const rect = workspaceRef.current.getBoundingClientRect();
    const normalizedBbox: BoundingBox = {
      x: currentBox.x / rect.width,
      y: currentBox.y / rect.height,
      width: currentBox.w / rect.width,
      height: currentBox.h / rect.height,
    };

    if (currentStepField === "display") {
      setDisplayBbox(normalizedBbox);
      // Advance step
      setAnnotationStep(1);
      setCurrentBox(null);
      toast.success("Display bounds saved. Now label fields.");
    } else {
      // It is a reading field. Save box, ask for value/unit
      const fieldName = currentStepField;

      // Automatically fill unit value if drawing a unit box
      if (fieldName === "unit") {
        let defaultUnit = "mg/dL";
        if (deviceType === "Thermometer") defaultUnit = "°C";
        else if (deviceType === "Weight Scale") defaultUnit = "kg";
        else if (deviceType === "Pulse Oximeter") defaultUnit = "%";

        setReadingBboxes((prev) => ({ ...prev, [fieldName]: normalizedBbox }));
        setUnits((prev) => ({ ...prev, [fieldName]: defaultUnit }));
        setActualValues((prev) => ({ ...prev, [fieldName]: defaultUnit }));

        // Auto advance or save
        advanceStep();
      } else {
        // Cache box for drawing, open value input
        setReadingBboxes((prev) => ({ ...prev, [fieldName]: normalizedBbox }));
        setCurrentBox(null);
      }
    }
  };

  const advanceStep = () => {
    setCurrentBox(null);
    setTempValue("");
    if (annotationStep < currentFields.length) {
      setAnnotationStep((prev) => prev + 1);
    } else {
      // Completed labelling!
      setAnnotationStep(currentFields.length + 1);
      toast.success("All bounding boxes annotated! Verify and save.");
    }
  };

  const handleSaveFieldValue = () => {
    if (!tempValue.trim()) {
      toast.error("Please enter the actual value visible on device.");
      return;
    }

    const fieldName = currentStepField;
    const isNum = !isNaN(Number(tempValue));

    setActualValues((prev) => ({
      ...prev,
      [fieldName]: isNum ? Number(tempValue) : tempValue,
    }));

    // Auto assign units if needed
    if (deviceType === "Blood Glucose Meter" && fieldName === "glucose") {
      setUnits((prev) => ({ ...prev, [fieldName]: "mg/dL" }));
    } else if (deviceType === "Thermometer" && fieldName === "temperature") {
      setUnits((prev) => ({ ...prev, [fieldName]: "°C" }));
    } else if (deviceType === "Weight Scale" && fieldName === "weight") {
      setUnits((prev) => ({ ...prev, [fieldName]: "kg" }));
    }

    advanceStep();
  };

  const handleSaveSample = async () => {
    if (!imageSrc) return;
    if (!brand.trim() || !model.trim()) {
      toast.error("Brand and Model Number are required.");
      return;
    }
    if (!displayBbox) {
      toast.error("Display bounding box is required.");
      return;
    }

    setLoading(true);
    try {
      const result = await trainingService.saveTrainingSample({
        device_type: deviceType,
        brand: brand.trim(),
        model: model.trim(),
        device_name: deviceName.trim() || undefined,
        image_url: imageSrc,
        image_resolution: imageRes,
        display_bbox: displayBbox,
        reading_bboxes: readingBboxes,
        actual_values: actualValues,
        units: units,
      });

      if (result.success) {
        toast.success("Sample saved successfully!");
        // Reset state
        setImageSrc(null);
        setBrand("");
        setModel("");
        setDeviceName("");
        setDisplayBbox(null);
        setReadingBboxes({});
        setActualValues({});
        setUnits({});
        setAnnotationStep(0);
      }
    } catch (e) {
      toast.error("Failed to save training sample.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSample = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sample?")) return;
    try {
      const ok = await trainingService.deleteTrainingSample(id);
      if (ok) {
        toast.success("Sample deleted.");
        fetchDataset();
      }
    } catch (e) {
      toast.error("Failed to delete sample.");
    }
  };

  const handleExport = async () => {
    try {
      toast.info("Preparing dataset JSON...");
      await trainingService.exportDataset();
      toast.success("Dataset exported successfully!");
    } catch (e) {
      toast.error("Failed to export dataset.");
    }
  };

  // Unique lists for filters
  const uniqueBrands = Array.from(new Set(samples.map((s) => s.brand)));

  // Filtered samples
  const filteredSamples = samples.filter((s) => {
    const devMatch = filterDevice === "all" || s.device_type === filterDevice;
    const brandMatch = filterBrand === "all" || s.brand === filterBrand;
    const modelMatch =
      !searchModel.trim() || s.model.toLowerCase().includes(searchModel.toLowerCase());
    return devMatch && brandMatch && modelMatch;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-6 select-none">
      {/* Title block */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-5">
        <div>
          <h1 className="text-3xl font-display font-extrabold tracking-tight flex items-center gap-2">
            <Cpu className="h-8 w-8 text-primary" /> Smart Scanner Training Portal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage a labeled bounding box dataset to train the future Smart Health Scanner
            AI models.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setActiveTab(activeTab === "workspace" ? "dataset" : "workspace")}
            variant="secondary"
          >
            {activeTab === "workspace" ? (
              <Database className="mr-1.5 h-4 w-4" />
            ) : (
              <Plus className="mr-1.5 h-4 w-4" />
            )}
            {activeTab === "workspace" ? "View Dataset Manager" : "Annotation Workspace"}
          </Button>
          <Button onClick={handleExport} className="gradient-primary">
            <Download className="mr-1.5 h-4 w-4" /> Export Dataset (JSON)
          </Button>
        </div>
      </div>

      {activeTab === "workspace" ? (
        // Annotation Workspace View
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workspace Settings Sidebar */}
          <div className="space-y-5 lg:col-span-1">
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">
              <h2 className="text-base font-bold flex items-center gap-1.5 text-foreground">
                <Layers className="h-4.5 w-4.5 text-primary" /> Device Specifications
              </h2>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <Label htmlFor="deviceType">Device Category</Label>
                  <Select
                    value={deviceType}
                    onValueChange={(val: any) => {
                      setDeviceType(val);
                      // reset labeling steps
                      setAnnotationStep(0);
                      setDisplayBbox(null);
                      setReadingBboxes({});
                      setActualValues({});
                    }}
                  >
                    <SelectTrigger id="deviceType" className="font-medium">
                      <SelectValue />
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

                <div className="space-y-1">
                  <Label htmlFor="brand">Brand Name</Label>
                  <Input
                    id="brand"
                    placeholder="e.g. On Call Plus, Omron"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="model">Model Number</Label>
                  <Input
                    id="model"
                    placeholder="e.g. OCP-100, HEM-7120"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="deviceName">Device Nickname (Optional)</Label>
                  <Input
                    id="deviceName"
                    placeholder="e.g. Grandma's Glucose Meter"
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Label Steps Log */}
            {imageSrc && (
              <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Annotation Guide
                </h3>

                <div className="space-y-2.5">
                  <div
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${
                      annotationStep === 0
                        ? "bg-primary-soft border-primary/20 text-primary"
                        : "bg-muted/40 border-transparent text-muted-foreground"
                    }`}
                  >
                    <span>1. LCD Display Bounds</span>
                    {displayBbox ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </div>

                  {currentFields.map((field, idx) => {
                    const stepNum = idx + 1;
                    const isCurrent = annotationStep === stepNum;
                    const isDone = readingBboxes[field] !== undefined;
                    return (
                      <div
                        key={field}
                        className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-semibold ${
                          isCurrent
                            ? "bg-primary-soft border-primary/20 text-primary"
                            : "bg-muted/40 border-transparent text-muted-foreground"
                        }`}
                      >
                        <span className="capitalize">
                          {stepNum + 1}. Label {field} Box
                        </span>
                        {isDone ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
                              {String(actualValues[field] || "")}
                            </span>
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-500/10" />
                          </div>
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {annotationStep > currentFields.length && (
                  <div className="mt-4 p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-xs font-medium text-center">
                    🎉 Annotation checklist complete! Verify boxes on right and save.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Labeling Workspace */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="flex-1 min-h-[400px] rounded-2xl border border-border border-dashed bg-muted/30 flex flex-col items-center justify-center p-6 relative overflow-hidden">
              {!imageSrc ? (
                <label className="flex flex-col items-center justify-center gap-3 cursor-pointer p-10 text-center max-w-sm hover:bg-muted/50 rounded-xl transition-colors">
                  <div className="h-14 w-14 rounded-2xl bg-primary-soft flex items-center justify-center text-primary shadow-soft">
                    <Upload className="h-7 w-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Upload Device Image</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Drag & drop a high resolution photo of your medical screen, or click to
                      browse.
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageLoad}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative w-full max-w-md mx-auto space-y-4">
                  {/* Drawing Instructions Overlay Banner */}
                  <div className="p-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-xs flex items-center gap-2.5 shadow-md">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0 animate-pulse" />
                    <div>
                      <span className="font-bold text-primary capitalize">
                        {currentStepField === "display"
                          ? "LCD Display Screen"
                          : `Label: ${currentStepField}`}
                      </span>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        {FIELD_HELP[currentStepField as keyof typeof FIELD_HELP] ||
                          "Click and drag to draw outline box."}
                      </p>
                    </div>
                  </div>

                  {/* Canvas Viewport container */}
                  <div
                    ref={workspaceRef}
                    onMouseDown={handlePointerDown}
                    onMouseMove={handlePointerMove}
                    onMouseUp={handlePointerUp}
                    className="relative w-full aspect-[4/3] bg-zinc-950 rounded-2xl overflow-hidden shadow-inner border border-zinc-800 cursor-crosshair select-none"
                  >
                    <img
                      src={imageSrc}
                      alt="Device to label"
                      className="w-full h-full object-contain pointer-events-none"
                    />

                    {/* Display box (Yellow overlay) */}
                    {displayBbox && (
                      <div
                        className="absolute border-2 border-yellow-500 bg-yellow-500/10 shadow-[0_0_6px_rgba(234,179,8,0.4)] pointer-events-none flex items-start p-1"
                        style={{
                          left: `${displayBbox.x * 100}%`,
                          top: `${displayBbox.y * 100}%`,
                          width: `${displayBbox.width * 100}%`,
                          height: `${displayBbox.height * 100}%`,
                        }}
                      >
                        <span className="text-[8px] font-bold text-yellow-500 bg-zinc-950 px-1 rounded uppercase tracking-wider">
                          LCD
                        </span>
                      </div>
                    )}

                    {/* Reading value boxes (Green overlay) */}
                    {Object.entries(readingBboxes).map(([field, box]) => (
                      <div
                        key={field}
                        className={`absolute border-2 bg-emerald-500/15 pointer-events-none flex items-start p-1 ${
                          field === "unit"
                            ? "border-purple-500 bg-purple-500/15"
                            : "border-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]"
                        }`}
                        style={{
                          left: `${box.x * 100}%`,
                          top: `${box.y * 100}%`,
                          width: `${box.width * 100}%`,
                          height: `${box.height * 100}%`,
                        }}
                      >
                        <span
                          className={`text-[8px] font-bold px-1 rounded uppercase tracking-wider ${
                            field === "unit"
                              ? "text-purple-400 bg-zinc-950"
                              : "text-emerald-400 bg-zinc-950"
                          }`}
                        >
                          {field}: {String(actualValues[field] || "")}
                        </span>
                      </div>
                    ))}

                    {/* Live drawing outline rectangle */}
                    {isDrawing && currentBox && (
                      <div
                        className={`absolute border-2 pointer-events-none border-dashed ${
                          currentStepField === "display"
                            ? "border-yellow-400 bg-yellow-400/5"
                            : "border-emerald-400 bg-emerald-400/5"
                        }`}
                        style={{
                          left: currentBox.x,
                          top: currentBox.y,
                          width: currentBox.w,
                          height: currentBox.h,
                        }}
                      />
                    )}
                  </div>

                  {/* Input dialog popup for values after drawing */}
                  {imageSrc &&
                    currentStepField !== "display" &&
                    currentStepField !== "unit" &&
                    readingBboxes[currentStepField] &&
                    actualValues[currentStepField] === undefined && (
                      <div className="p-4 border border-border bg-card rounded-2xl shadow-lg flex items-end gap-3 animate-in slide-in-from-bottom-2">
                        <div className="flex-1 space-y-1">
                          <Label htmlFor="tempValInput" className="capitalize">
                            Enter Value for {currentStepField}
                          </Label>
                          <Input
                            id="tempValInput"
                            type="text"
                            placeholder={`Value shown for ${currentStepField}`}
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveFieldValue()}
                            autoFocus
                          />
                        </div>
                        <Button onClick={handleSaveFieldValue} className="gradient-primary">
                          Confirm <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </div>
                    )}

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      Resolution: {imageRes.width}x{imageRes.height}
                    </span>
                    <button
                      onClick={() => setImageSrc(null)}
                      className="text-xs text-destructive hover:underline font-semibold"
                    >
                      Remove Photo
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Save Action */}
            {imageSrc && annotationStep > currentFields.length && (
              <div className="p-4 border border-border bg-card rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-foreground">Save Annotated Dataset Sample</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Please check display and reading outlines before saving.
                  </p>
                </div>
                <Button
                  onClick={handleSaveSample}
                  disabled={loading}
                  className="gradient-primary font-semibold px-6"
                >
                  {loading ? "Saving..." : (
                    <>
                      <Plus className="mr-1.5 h-4 w-4" /> Save Training Sample
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Dataset Management Dashboard View
        <div className="space-y-6">
          {/* Dataset Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Total Samples</span>
              <p className="text-3xl font-extrabold mt-1">{samples.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Device Types</span>
              <p className="text-3xl font-extrabold mt-1">
                {Array.from(new Set(samples.map((s) => s.device_type))).length}
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Distinct Brands</span>
              <p className="text-3xl font-extrabold mt-1">{uniqueBrands.length}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <span className="text-xs text-muted-foreground font-semibold">Unique Models</span>
              <p className="text-3xl font-extrabold mt-1">
                {Array.from(new Set(samples.map((s) => s.model))).length}
              </p>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row gap-3 p-4 border border-border bg-card rounded-2xl shadow-sm">
            <div className="flex-1 flex flex-col md:flex-row gap-3">
              <div className="space-y-1 flex-1">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Filter Category
                </Label>
                <Select value={filterDevice} onValueChange={setFilterDevice}>
                  <SelectTrigger className="font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Blood Glucose Meter">Blood Glucose Meter</SelectItem>
                    <SelectItem value="Blood Pressure Monitor">Blood Pressure Monitor</SelectItem>
                    <SelectItem value="Pulse Oximeter">Pulse Oximeter</SelectItem>
                    <SelectItem value="Thermometer">Thermometer</SelectItem>
                    <SelectItem value="Weight Scale">Weight Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 flex-1">
                <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                  Filter Brand
                </Label>
                <Select value={filterBrand} onValueChange={setFilterBrand}>
                  <SelectTrigger className="font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {uniqueBrands.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="md:w-72 space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                Search Model
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search model number..."
                  value={searchModel}
                  onChange={(e) => setSearchModel(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Samples Grid List */}
          {loading ? (
            <div className="text-center py-20">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-medium text-muted-foreground mt-3">Loading samples...</p>
            </div>
          ) : filteredSamples.length === 0 ? (
            <div className="text-center py-20 border border-border border-dashed rounded-2xl bg-muted/10">
              <Database className="h-12 w-12 text-zinc-400 mx-auto" />
              <h3 className="font-bold text-foreground mt-3">No dataset samples found</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                No labeled images match your filter parameters. Switch to Annotation workspace to
                add samples.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col"
                >
                  {/* Thumbnail viewport */}
                  <div className="relative w-full aspect-[4/3] bg-zinc-950 overflow-hidden border-b border-border flex items-center justify-center">
                    <img
                      src={sample.image_url}
                      alt={sample.brand}
                      className="w-full h-full object-contain"
                    />

                    {/* Display outlines overlay on hover */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-between pointer-events-none">
                      <div className="relative w-full h-full">
                        {/* LCD */}
                        <div
                          className="absolute border border-yellow-500 bg-yellow-500/10 flex items-start"
                          style={{
                            left: `${sample.display_bbox.x * 100}%`,
                            top: `${sample.display_bbox.y * 100}%`,
                            width: `${sample.display_bbox.width * 100}%`,
                            height: `${sample.display_bbox.height * 100}%`,
                          }}
                        >
                          <span className="text-[6px] font-bold text-yellow-400 bg-zinc-950 px-0.5 rounded">
                            LCD
                          </span>
                        </div>
                        {/* Readings */}
                        {Object.entries(sample.reading_bboxes).map(([field, box]) => (
                          <div
                            key={field}
                            className={`absolute border flex items-start ${
                              field === "unit"
                                ? "border-purple-500 bg-purple-500/10"
                                : "border-emerald-500 bg-emerald-500/10"
                            }`}
                            style={{
                              left: `${box.x * 100}%`,
                              top: `${box.y * 100}%`,
                              width: `${box.width * 100}%`,
                              height: `${box.height * 100}%`,
                            }}
                          >
                            <span className="text-[5px] font-bold text-zinc-100 bg-zinc-950 px-0.5 rounded uppercase">
                              {field}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Sample details */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase text-primary tracking-wider">
                          {sample.device_type}
                        </span>
                        <button
                          onClick={() => handleDeleteSample(sample.id)}
                          className="p-1.5 text-zinc-400 hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors"
                          aria-label="Delete sample"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <h3 className="font-extrabold text-foreground text-sm mt-1">
                        {sample.brand}{" "}
                        <span className="font-medium text-muted-foreground font-mono">
                          {sample.model}
                        </span>
                      </h3>
                      {sample.device_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{sample.device_name}</p>
                      )}
                    </div>

                    <div className="border-t border-border pt-3">
                      <Label className="text-[10px] font-semibold uppercase text-muted-foreground">
                        Labeled Readings
                      </Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {Object.entries(sample.actual_values).map(([field, val]) => (
                          <div
                            key={field}
                            className="flex items-center gap-1 text-[11px] bg-muted px-2 py-0.5 rounded-lg font-medium"
                          >
                            <span className="text-muted-foreground capitalize">{field}:</span>
                            <span className="text-foreground font-bold">{String(val)}</span>
                            {sample.units[field] && (
                              <span className="text-[9px] text-muted-foreground font-semibold">
                                {sample.units[field]}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
