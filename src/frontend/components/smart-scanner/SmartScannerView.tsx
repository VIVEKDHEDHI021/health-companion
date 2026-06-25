import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Camera, CameraOff, ChevronLeft, Sparkles, Upload, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/frontend/components/ui/button";
import { performOcr, initOcrEngine, terminateOcrEngine } from "./ocrEngine";
import { detectDeviceAndReadings, ParsedReading } from "./deviceHeuristics";
import { preprocessCanvasForOcr } from "./imageFilters";
import { ConfirmationSheet } from "./ConfirmationSheet";
import { scannerService } from "@/backend/services/scannerService";

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
        startOcrLoop();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setHasCameraAccess(false);
      setIsScanning(false);
      setOcrLog("Camera access denied or unavailable. You can upload an image instead.");
      toast.error("Could not access camera. Please allow permission or upload an image.");
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
      canvas.width = 480;
      canvas.height = 300;

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
        canvas.height
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

        // Copy current frame
        pCtx.drawImage(canvas, 0, 0);

        // Preprocess (grayscale, contrast, binarize)
        preprocessCanvasForOcr(processCanvas);

        setOcrLog("Analyzing frame...");
        
        // Invoke OCR
        const ocrResult = await performOcr(processCanvas);
        
        if (ocrResult.text.trim()) {
          // Parse values
          const matchedReading = detectDeviceAndReadings(ocrResult.text);
          
          if (matchedReading) {
            setOcrLog(`Detected: ${matchedReading.deviceType}`);
            const valHash = JSON.stringify(matchedReading.data);

            // Strict matching criteria for auto-capture
            if (valHash === lastMatchedVal) {
              const matches = consecutiveMatches + 1;
              setConsecutiveMatches(matches);
              
              // If reading stabilizes over 2 consecutive cycles (approx 3 seconds), freeze and confirm
              if (matches >= 2 || matchedReading.confidence >= 0.85) {
                stopCamera();
                setDetectedReading({
                  ...matchedReading,
                  ocrSource: ocrResult.source,
                } as any);
                setConfirmOpen(true);
                toast.success(`Success! Found ${matchedReading.deviceType}`);
                setConsecutiveMatches(0);
              }
            } else {
              setLastMatchedVal(valHash);
              setConsecutiveMatches(1);
            }
          } else {
            setOcrLog("Searching for display text...");
            setConsecutiveMatches(0);
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
      preprocessCanvasForOcr(processCanvas);

      const ocrResult = await performOcr(processCanvas);
      const matchedReading = detectDeviceAndReadings(ocrResult.text);

      if (matchedReading) {
        setDetectedReading({
          ...matchedReading,
          ocrSource: ocrResult.source,
        } as any);
        setConfirmOpen(true);
      } else {
        toast.error("Could not recognize reading. Please try again or adjust lighting.");
        startCamera();
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
        tempCanvas.width = 480;
        tempCanvas.height = 300;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        // Draw image stretched to scanning bounds
        ctx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
        
        // Enhance
        preprocessCanvasForOcr(tempCanvas);

        setOcrLog("Running OCR on image...");
        const ocrResult = await performOcr(tempCanvas);
        const matchedReading = detectDeviceAndReadings(ocrResult.text);

        if (matchedReading) {
          setDetectedReading({
            ...matchedReading,
            ocrSource: ocrResult.source,
          } as any);
          setConfirmOpen(true);
        } else {
          // If heuristics failed, let user choose device manually
          setDetectedReading({
            deviceType: "Blood Glucose Meter", // default to Glucose
            confidence: 0.3,
            data: { glucose: 100, unit: "mg/dL" },
            rawText: ocrResult.text,
            ocrSource: ocrResult.source,
          } as any);
          setConfirmOpen(true);
          toast.warning("Heuristic scan was inconclusive. Please enter values manually.");
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
      
      if (res.data?.offline) {
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
        <label className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 transition-colors cursor-pointer">
          <Upload className="h-5 w-5 text-zinc-300" />
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </header>

      {/* Main Camera Viewport */}
      <div className="relative flex-1 flex flex-col items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className={`absolute inset-0 h-full w-full object-cover ${hasCameraAccess ? "block" : "hidden"}`}
          playsInline
          muted
        />

        {hasCameraAccess === false && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400 gap-4">
            <CameraOff className="h-16 w-16 text-zinc-600 stroke-[1.5]" />
            <div>
              <p className="text-lg font-bold text-zinc-200">Camera Access Required</p>
              <p className="text-xs text-zinc-500 max-w-xs mt-1">
                Please allow camera access to scan your health devices, or choose a file from your photo library.
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

        {/* Target Overlay Mask */}
        {hasCameraAccess && isScanning && (
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
              
              {consecutiveMatches > 0 && (
                <div className="absolute inset-0 bg-primary/10 flex items-center justify-center animate-pulse">
                  <CheckCircle2 className="h-12 w-12 text-primary drop-shadow-md animate-[bounce_0.5s_infinite]" />
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-400 mt-6 font-medium text-center max-w-xs">
              Place device screen flat inside the green box.<br />Scanner detects values automatically.
            </p>
          </div>
        )}

        {/* Live crop canvas - used for frame capturing (can be hidden or absolute/invisible) */}
        <canvas ref={canvasRef} className="hidden absolute bottom-4 right-4 border border-zinc-700 w-24 h-16 rounded opacity-80" />
      </div>

      {/* Footer log / Action panel */}
      <footer className="flex flex-col gap-4 p-4 bg-zinc-900 border-t border-zinc-800 safe-bottom">
        <div className="flex items-center gap-2 rounded-xl bg-zinc-950/80 px-3 py-2.5 border border-zinc-800/80">
          <AlertCircle className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-zinc-300 font-mono truncate">{ocrLog}</span>
        </div>

        {hasCameraAccess && isScanning && (
          <div className="flex items-center gap-3">
            <Button
              onClick={handleManualCapture}
              size="lg"
              className="flex-1 gradient-primary text-primary-foreground font-semibold"
            >
              <Camera className="mr-1.5 h-5 w-5" /> Take Snapshot
            </Button>
            <Button
              onClick={() => { stopCamera(); navigate({ to: "/dashboard" }); }}
              size="lg"
              variant="secondary"
              className="px-6"
            >
              Cancel
            </Button>
          </div>
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
    </div>
  );
}
