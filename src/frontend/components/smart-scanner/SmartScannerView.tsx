import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraOff,
  ChevronLeft,
  Sparkles,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { performOcr, initOcrEngine, terminateOcrEngine } from "./ocrEngine";
import { detectDeviceAndReadings, ParsedReading } from "./deviceHeuristics";
import { preprocessCanvasForOcr } from "./imageFilters";
import { ConfirmationSheet } from "./ConfirmationSheet";
import { scannerService } from "@/backend/services/scannerService";
import { useGlucoseScanner } from "@/features/scanner/hooks/useGlucoseScanner";
import { onCallPlusProfile } from "@/features/scanner/meterProfiles/onCallPlus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/frontend/components/ui/dialog";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";

export default function SmartScannerView() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const ocrIntervalRef = useRef<any>(null);

  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [ocrLog, setOcrLog] = useState<string>("Initializing camera feed...");
  const [detectedReading, setDetectedReading] = useState<ParsedReading | null>(null);
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("user_gemini_api_key") || "" : "",
  );
  const [visionApiKey, setVisionApiKey] = useState<string>(() =>
    typeof window !== "undefined" ? localStorage.getItem("user_vision_api_key") || "" : "",
  );
  const [scannerMode, setScannerMode] = useState<"general" | "on_call_plus">("general");

  const { isReady: isGlucoseReady, scanFrame: scanGlucoseFrame } =
    useGlucoseScanner(onCallPlusProfile);

  const handleSaveSettings = () => {
    let savedAny = false;
    if (geminiApiKey.trim()) {
      localStorage.setItem("user_gemini_api_key", geminiApiKey.trim());
      savedAny = true;
    } else {
      localStorage.removeItem("user_gemini_api_key");
    }

    if (visionApiKey.trim()) {
      localStorage.setItem("user_vision_api_key", visionApiKey.trim());
      savedAny = true;
    } else {
      localStorage.removeItem("user_vision_api_key");
    }

    if (savedAny) {
      toast.success("API key(s) saved locally!");
    } else {
      toast.info("API key(s) cleared.");
    }
    setSettingsOpen(false);
  };

  // High confidence automatic capture states
  const [consecutiveMatches, setConsecutiveMatches] = useState<number>(0);
  const [lastMatchedVal, setLastMatchedVal] = useState<string>("");

  useEffect(() => {
    // Initialize OCR engine on load
    initOcrEngine();
    startCamera();

    return () => {
      stopCamera();
      terminateOcrEngine();
    };
  }, []);

  const startCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      setHasCameraAccess(true);
      setIsScanning(true);
      setOcrLog("Tap 'Scan with Camera' to capture device screen.");
      return;
    }

    try {
      setHasCameraAccess(null);
      setIsScanning(true);
      setOcrLog("Requesting rear camera access...");

      // Request rear camera ideal constraints
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasCameraAccess(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // required for iOS
        videoRef.current.play();

        // Start processing frames and running OCR
        setOcrLog("Camera started. Align device screen inside target box.");
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setHasCameraAccess(false);
      setIsScanning(false);
      setOcrLog("Camera access denied or unavailable. You can upload an image instead.");
      toast.error("Could not access camera. Please allow permission or upload an image.");
    }
  };

  const handleMobileCapture = async (source: "camera" | "gallery") => {
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      
      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: source === "camera" ? CameraSource.Camera : CameraSource.Photos,
      });

      if (!image.webPath) return;

      setOcrLog("Loading captured image...");
      const img = new Image();
      img.onload = async () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 960;
        tempCanvas.height = 600;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        // Draw image fitted to scanning bounds
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        setOcrLog("Processing OCR on image...");

        if (scannerMode === "on_call_plus") {
          const result = await scanGlucoseFrame(tempCanvas);
          if (result.success && result.value !== undefined) {
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: result.confidence || 0.95,
              data: { glucose: result.value, unit: result.unit || "mg/dL" },
              rawText: `Offline Profile parsed: ${result.value}`,
              ocrSource: "OCR (Offline Profile)",
            } as any);
            setConfirmOpen(true);
          } else {
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: 0.3,
              data: { glucose: 100, unit: "mg/dL" },
              rawText: result.message || "Native scan failed to extract reading.",
              ocrSource: "OCR (Offline Profile)",
            } as any);
            setConfirmOpen(true);
            toast.warning("Profile-based offline scan was inconclusive. Please verify values.");
          }
        } else {
          const ocrResult = await performOcr(tempCanvas);
          if (ocrResult.geminiResult && ocrResult.geminiResult.error) {
            setOcrLog(`❌ ${ocrResult.geminiResult.error}`);
            toast.error(ocrResult.geminiResult.error);
            return;
          }
          const matchedReading = detectDeviceAndReadings(ocrResult);
          if (matchedReading) {
            setDetectedReading({
              ...matchedReading,
              ocrSource: ocrResult.source,
            } as any);
            setConfirmOpen(true);
          } else {
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: 0.3,
              data: { glucose: 100, unit: "mg/dL" },
              rawText: ocrResult.text,
              ocrSource: ocrResult.source,
            } as any);
            setConfirmOpen(true);
            toast.warning("Heuristic scan was inconclusive. Please verify values.");
          }
        }
      };
      img.src = image.webPath;
    } catch (err) {
      console.error("Capacitor camera capture failed:", err);
      toast.error("Camera capture canceled or failed.");
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (ocrIntervalRef.current) {
      clearInterval(ocrIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // The rendering frame loop (draws video to visible/invisible canvas for cropping)
  const drawFrameLoop = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext("2d");
    if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
      // Scale canvas to video aspect ratio
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      canvas.width = 960;
      canvas.height = 600;

      // Draw cropped center of the video onto our canvas (the scanning box)
      // Scanner box relative bounds in camera preview:
      const sourceWidth = videoWidth * 0.7; // Crop width is 70% of video width
      const sourceHeight = videoHeight * 0.5; // Crop height is 50% of video height
      const sourceX = (videoWidth - sourceWidth) / 2;
      const sourceY = (videoHeight - sourceHeight) / 2;

      ctx.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    }

    animationFrameRef.current = requestAnimationFrame(drawFrameLoop);
  };

  // Initialize frame draw loop
  useEffect(() => {
    if (hasCameraAccess && isScanning) {
      animationFrameRef.current = requestAnimationFrame(drawFrameLoop);
    }
  }, [hasCameraAccess, isScanning]);

  // Restart OCR loop when camera access, scanning state, or scanner mode changes
  useEffect(() => {
    if (hasCameraAccess && isScanning) {
      startOcrLoop();
    }
  }, [hasCameraAccess, isScanning, scannerMode]);

  // Periodic OCR loop
  const startOcrLoop = () => {
    if (ocrIntervalRef.current) clearInterval(ocrIntervalRef.current);

    ocrIntervalRef.current = setInterval(async () => {
      const canvas = canvasRef.current;
      if (!canvas || !isScanning) return;

      try {
        // Create an offline processor canvas to run filters and avoid altering preview
        const processCanvas = document.createElement("canvas");
        processCanvas.width = canvas.width;
        processCanvas.height = canvas.height;
        const pCtx = processCanvas.getContext("2d");
        if (!pCtx) return;

        // Copy current frame (raw colored image)
        pCtx.drawImage(canvas, 0, 0);

        setOcrLog("Analyzing frame...");

        if (scannerMode === "on_call_plus") {
          const result = await scanGlucoseFrame(processCanvas);
          if (result.success && result.value !== undefined) {
            setOcrLog(`✅ Glucose detected: ${result.value} mg/dL`);
            stopCamera();
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: result.confidence || 0.95,
              data: { glucose: result.value, unit: result.unit || "mg/dL" },
              rawText: `Offline Profile parsed: ${result.value}`,
              ocrSource: "OCR (Offline Profile)",
            } as any);
            setConfirmOpen(true);
            toast.success(`Glucose reading detected: ${result.value} mg/dL`);
          } else {
            setOcrLog(result.message || "Align LCD screen within target guide box.");
          }
        } else {
          // Invoke OCR with raw color canvas
          const ocrResult = await performOcr(processCanvas);

          if (ocrResult.geminiResult && ocrResult.geminiResult.error) {
            setOcrLog(`❌ ${ocrResult.geminiResult.error}`);
            return;
          }

          if (ocrResult.text.trim()) {
            // Parse values
            const matchedReading = detectDeviceAndReadings(ocrResult);

            if (matchedReading) {
              const valHash = JSON.stringify(matchedReading.data);

              if (matchedReading.confidence >= 0.85) {
                setOcrLog(`✅ Reading detected successfully! (${matchedReading.deviceType})`);
                stopCamera();
                setDetectedReading({
                  ...matchedReading,
                  ocrSource: ocrResult.source,
                } as any);
                setConfirmOpen(true);
                toast.success(`Success! Found ${matchedReading.deviceType}`);
                setConsecutiveMatches(0);
              } else {
                // Wait for stabilization or prompt user to verify
                if (valHash === lastMatchedVal) {
                  const matches = consecutiveMatches + 1;
                  setConsecutiveMatches(matches);
                  if (matches >= 2) {
                    setOcrLog(
                      `⚠️ Please verify the detected value. (${matchedReading.deviceType})`,
                    );
                    stopCamera();
                    setDetectedReading({
                      ...matchedReading,
                      ocrSource: ocrResult.source,
                    } as any);
                    setConfirmOpen(true);
                    setConsecutiveMatches(0);
                  } else {
                    setOcrLog(`🔍 Stabilizing reading... (${matchedReading.deviceType})`);
                  }
                } else {
                  setLastMatchedVal(valHash);
                  setConsecutiveMatches(1);
                  setOcrLog(`🔍 Aligning details... (${matchedReading.deviceType})`);
                }
              }
            } else {
              setOcrLog("📷 Align screen flat inside the box. Adjust lighting.");
              setConsecutiveMatches(0);
            }
          }
        }
      } catch (err) {
        console.error("OCR analysis cycle error:", err);
      }
    }, 1500);
  };

  // Manual Trigger Capture
  const handleManualCapture = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    stopCamera();
    setOcrLog("Processing snapshot...");

    try {
      const processCanvas = document.createElement("canvas");
      processCanvas.width = canvas.width;
      processCanvas.height = canvas.height;
      const pCtx = processCanvas.getContext("2d");
      if (!pCtx) return;

      pCtx.drawImage(canvas, 0, 0);

      if (scannerMode === "on_call_plus") {
        const result = await scanGlucoseFrame(processCanvas);
        if (result.success && result.value !== undefined) {
          setDetectedReading({
            deviceType: "Blood Glucose Meter",
            confidence: result.confidence || 0.95,
            data: { glucose: result.value, unit: result.unit || "mg/dL" },
            rawText: `Offline Profile parsed: ${result.value}`,
            ocrSource: "OCR (Offline Profile)",
          } as any);
          setConfirmOpen(true);
        } else {
          setDetectedReading({
            deviceType: "Blood Glucose Meter",
            confidence: 0.3,
            data: { glucose: 100, unit: "mg/dL" },
            rawText: result.message || "Manual capture failed to extract reading.",
            ocrSource: "OCR (Offline Profile)",
          } as any);
          setConfirmOpen(true);
          toast.warning("Profile-based offline scan was inconclusive. Please verify values.");
        }
      } else {
        const ocrResult = await performOcr(processCanvas);

        if (ocrResult.geminiResult && ocrResult.geminiResult.error) {
          setOcrLog(`❌ ${ocrResult.geminiResult.error}`);
          toast.error(ocrResult.geminiResult.error);
          startCamera();
          return;
        }

        const matchedReading = detectDeviceAndReadings(ocrResult);

        if (matchedReading) {
          setDetectedReading({
            ...matchedReading,
            ocrSource: ocrResult.source,
          } as any);
          setConfirmOpen(true);
        } else {
          // Fallback: If heuristics failed, let user select device and enter values manually
          setDetectedReading({
            deviceType: "Blood Glucose Meter",
            confidence: 0.3,
            data: { glucose: 100, unit: "mg/dL" },
            rawText: ocrResult.text,
            ocrSource: ocrResult.source,
          } as any);
          setConfirmOpen(true);
          toast.warning("Heuristic scan was inconclusive. Please enter values manually.");
        }
      }
    } catch (err) {
      console.error(err);
      toast.error("Scanner error. Please try again.");
      startCamera();
    }
  };

  // Upload Photo Fallback
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopCamera();
    setOcrLog("Loading uploaded image...");

    try {
      const img = new Image();
      img.onload = async () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = 960;
        tempCanvas.height = 600;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        // Draw image stretched to scanning bounds
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);

        setOcrLog("Running OCR on image...");

        if (scannerMode === "on_call_plus") {
          const result = await scanGlucoseFrame(tempCanvas);
          if (result.success && result.value !== undefined) {
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: result.confidence || 0.95,
              data: { glucose: result.value, unit: result.unit || "mg/dL" },
              rawText: `Offline Profile parsed: ${result.value}`,
              ocrSource: "OCR (Offline Profile)",
            } as any);
            setConfirmOpen(true);
          } else {
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: 0.3,
              data: { glucose: 100, unit: "mg/dL" },
              rawText: result.message || "Upload scan failed to extract reading.",
              ocrSource: "OCR (Offline Profile)",
            } as any);
            setConfirmOpen(true);
            toast.warning("Profile-based offline scan was inconclusive. Please verify values.");
          }
        } else {
          const ocrResult = await performOcr(tempCanvas);

          if (ocrResult.geminiResult && ocrResult.geminiResult.error) {
            setOcrLog(`❌ ${ocrResult.geminiResult.error}`);
            toast.error(ocrResult.geminiResult.error);
            startCamera();
            return;
          }

          const matchedReading = detectDeviceAndReadings(ocrResult);

          if (matchedReading) {
            setDetectedReading({
              ...matchedReading,
              ocrSource: ocrResult.source,
            } as any);
            setConfirmOpen(true);
          } else {
            // If heuristics failed, let user choose device manually
            setDetectedReading({
              deviceType: "Blood Glucose Meter",
              confidence: 0.3,
              data: { glucose: 100, unit: "mg/dL" },
              rawText: ocrResult.text,
              ocrSource: ocrResult.source,
            } as any);
            setConfirmOpen(true);
            toast.warning("Heuristic scan was inconclusive. Please enter values manually.");
          }
        }
      };

      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          img.src = event.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Image upload processing error:", err);
      toast.error("Failed to parse image.");
      startCamera();
    }
  };

  // Save Confirmed Scan
  const handleSaveConfirmed = async (finalData: any) => {
    try {
      const res = await scannerService.saveScanReading(finalData);
      if (res.error) {
        throw res.error;
      }

      if ((res.data as any)?.offline) {
        toast.info("Saved locally. Reading will sync when online.");
      } else {
        toast.success("Reading successfully saved!");
      }

      navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save reading.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white select-none">
      {/* Top Header Bar */}
      <header className="flex h-16 items-center justify-between px-4 bg-zinc-900/60 backdrop-blur-md border-b border-zinc-800">
        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
        >
          <ChevronLeft className="h-6 w-6 text-zinc-300" />
        </button>
        <span className="font-semibold text-zinc-100 flex items-center gap-1.5">
          <Sparkles className="h-5 w-5 text-primary fill-primary/20" /> Smart Health Scanner
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors"
            title="Settings"
          >
            <Settings className="h-5 w-5 text-zinc-300" />
          </button>
          <label className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors cursor-pointer">
            <Upload className="h-5 w-5 text-zinc-300" />
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>
      </header>

      {/* Main Camera Viewport */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        {/* Mode Selector */}
        {hasCameraAccess && isScanning && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex bg-zinc-900/90 border border-zinc-800 rounded-full p-1 shadow-lg backdrop-blur-md pointer-events-auto">
            <button
              onClick={() => {
                setScannerMode("general");
                setOcrLog("General scanner mode activated.");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                scannerMode === "general"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              General Scanner
            </button>
            <button
              onClick={() => {
                setScannerMode("on_call_plus");
                setOcrLog("On Call Plus offline scanner mode activated.");
              }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                scannerMode === "on_call_plus"
                  ? "bg-amber-500 text-black shadow"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              On Call Plus
            </button>
          </div>
        )}

        {Capacitor.isNativePlatform() ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 p-6 text-center">
            <div className="relative w-80 h-48 sm:w-[450px] sm:h-64 rounded-3xl border border-zinc-800 bg-zinc-900/40 flex flex-col items-center justify-center overflow-hidden shadow-2xl p-6">
              <div className="absolute inset-0 border border-dashed border-zinc-700/60 rounded-3xl pointer-events-none" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg mb-4">
                <Camera className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <span className="text-base font-bold text-zinc-100">Native Scanner Interface</span>
              <span className="text-xs text-zinc-400 max-w-xs mt-2 leading-relaxed">
                {scannerMode === "on_call_plus"
                  ? "Align the On Call Plus meter screen and capture a photo. Only the large digits will be parsed."
                  : "Align your health device screen within the frame and capture a photo."}
              </span>
            </div>
          </div>
        ) : (
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover ${hasCameraAccess ? "block" : "hidden"}`}
            playsInline
            muted
          />
        )}

        {hasCameraAccess === false && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400 gap-4">
            <CameraOff className="h-16 w-16 text-zinc-600 stroke-[1.5]" />
            <div>
              <p className="text-lg font-bold text-zinc-200">Camera Access Required</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                Please allow camera access to scan your health devices, or choose a file from your
                photo library.
              </p>
            </div>
            <Button onClick={startCamera} variant="secondary" className="mt-2">
              <RefreshCw className="mr-1.5 h-4 w-4" /> Try Again
            </Button>
          </div>
        )}

        {hasCameraAccess === null && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400 gap-3">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm font-medium text-zinc-300">Requesting camera...</p>
          </div>
        )}

        {/* Target Overlay Mask - Web Only */}
        {!Capacitor.isNativePlatform() && hasCameraAccess && isScanning && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center bg-black/40">
            {/* The Cutout Scanning Box */}
            <div className="relative w-80 h-48 sm:w-[450px] sm:h-64 rounded-2xl border-2 border-primary/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] flex items-center justify-center overflow-hidden">
              {/* Corner lasers */}
              <div className="absolute inset-0 border-4 border-transparent">
                <span className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary rounded-tl-md" />
                <span className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary rounded-br-md" />
              </div>

              {/* Scanning laser animation line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent animate-[scan_2s_infinite] shadow-[0_0_8px_var(--primary)]" />

              {/* Custom LCD guidelines crop box guide */}
              {scannerMode === "on_call_plus" && (
                <div
                  className="absolute border border-dashed border-amber-400 rounded flex items-center justify-center"
                  style={{
                    top: `${onCallPlusProfile.screenCrop.topRatio * 100}%`,
                    left: `${onCallPlusProfile.screenCrop.leftRatio * 100}%`,
                    width: `${onCallPlusProfile.screenCrop.widthRatio * 100}%`,
                    height: `${onCallPlusProfile.screenCrop.heightRatio * 100}%`,
                  }}
                >
                  <span className="absolute bottom-1 right-1 text-[8px] bg-black/70 px-1 rounded text-amber-300 font-semibold uppercase tracking-wider">
                    LCD Guide Box
                  </span>
                </div>
              )}

              {consecutiveMatches > 0 && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center animate-pulse">
                  <CheckCircle2 className="h-12 w-12 text-primary drop-shadow-md animate-[bounce_0.5s_infinite]" />
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 mt-6 font-medium text-center max-w-xs">
              {scannerMode === "on_call_plus" ? (
                <>
                  Align the LCD screen inside the dashed amber guide box.
                  <br />
                  The scanner will read the glucose value.
                </>
              ) : (
                <>
                  Place device screen flat inside the green box.
                  <br />
                  Scanner detects values automatically.
                </>
              )}
            </p>
          </div>
        )}

        {/* Live crop canvas - used for frame capturing (can be hidden or absolute/invisible) */}
        <canvas
          ref={canvasRef}
          className="hidden absolute bottom-4 right-4 border border-zinc-700 w-24 h-16 rounded opacity-80"
        />
      </div>

      {/* Footer log / Action panel */}
      <footer className="flex flex-col gap-4 p-4 bg-zinc-900 border-t border-zinc-800 safe-bottom">
        <div className="flex items-center gap-2 rounded-xl bg-zinc-950/80 px-3 py-2.5 border border-zinc-800/80">
          <AlertCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-zinc-300 font-mono truncate">{ocrLog}</span>
        </div>

        {Capacitor.isNativePlatform() ? (
          <div className="flex flex-col gap-2.5 w-full">
            <div className="flex items-center gap-3">
              <Button
                onClick={() => handleMobileCapture("camera")}
                size="lg"
                className="flex-1 gradient-primary text-primary-foreground font-semibold shadow-soft h-12"
              >
                <Camera className="mr-1.5 h-5 w-5" /> Take Photo
              </Button>
              <Button
                onClick={() => handleMobileCapture("gallery")}
                size="lg"
                variant="secondary"
                className="flex-1 font-semibold h-12 bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700"
              >
                <Upload className="mr-1.5 h-5 w-5" /> Upload Image
              </Button>
            </div>
            <Button
              onClick={() => navigate({ to: "/dashboard" })}
              variant="ghost"
              className="w-full text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
        ) : (
          hasCameraAccess && isScanning && (
            <div className="flex items-center gap-3">
              <Button
                onClick={handleManualCapture}
                size="lg"
                className="flex-1 gradient-primary text-primary-foreground font-semibold"
              >
                <Camera className="mr-1.5 h-5 w-5" /> Take Snapshot
              </Button>
              <Button
                onClick={() => {
                  stopCamera();
                  navigate({ to: "/dashboard" });
                }}
                size="lg"
                variant="secondary"
                className="px-6"
              >
                Cancel
              </Button>
            </div>
          )
        )}
      </footer>

      {/* Confirmation Bottom Sheet Dialog */}
      <ConfirmationSheet
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) startCamera(); // resume camera if closed
        }}
        reading={detectedReading}
        onSave={handleSaveConfirmed}
      />

      {/* Scanner Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md border-zinc-800 bg-zinc-900 text-white shadow-lg rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-zinc-100">
              <Settings className="h-6 w-6 text-primary animate-[spin_10s_linear_infinite]" />{" "}
              Configure Vision AI
            </DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">
              Provide an API Key to enable 100% accurate device scanning on your mobile phone or
              browser.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="visionApiKeyInput" className="text-sm font-semibold text-zinc-300">
                Google Cloud Vision API Key
              </Label>
              <Input
                id="visionApiKeyInput"
                type="password"
                placeholder="Paste Cloud Vision API Key (starts with AIzaSy...)"
                value={visionApiKey}
                onChange={(e) => setVisionApiKey(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKeyInput" className="text-sm font-semibold text-zinc-300">
                Gemini API Key
              </Label>
              <Input
                id="apiKeyInput"
                type="password"
                placeholder="Paste Gemini API Key (starts with AIzaSy...)"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-0"
              />
              <p className="text-[10px] text-zinc-500 leading-normal">
                Your keys are stored securely on your own device and are only used to directly query
                Google's Vision/Gemini models for text extraction.
              </p>
            </div>
          </div>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 pt-2 border-t border-zinc-800">
            <Button
              onClick={() => {
                setGeminiApiKey("");
                setVisionApiKey("");
                localStorage.removeItem("user_gemini_api_key");
                localStorage.removeItem("user_vision_api_key");
                toast.info("API keys cleared.");
                setSettingsOpen(false);
              }}
              variant="ghost"
              className="text-zinc-400 hover:text-white"
            >
              Clear Keys
            </Button>
            <div className="flex gap-2">
              <Button onClick={() => setSettingsOpen(false)} variant="secondary">
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} className="gradient-primary">
                Save Keys
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
