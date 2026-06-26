import { createFileRoute } from "@tanstack/react-router";
import React, { Suspense } from "react";
import { Activity } from "lucide-react";

// Lazy load the scanner component to optimize bundle size
const SmartScannerView = React.lazy(
  () => import("@/frontend/components/smart-scanner/SmartScannerView"),
);

export const Route = createFileRoute("/_authenticated/scanner")({
  component: ScannerPage,
  head: () => ({ meta: [{ title: "Smart Scanner — GlucoLab" }] }),
});

function ScannerPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950">
          <div className="text-center space-y-4">
            <Activity className="h-10 w-10 animate-pulse text-primary mx-auto" />
            <p className="text-sm font-medium text-zinc-400">Loading Smart Scanner...</p>
          </div>
        </div>
      }
    >
      <SmartScannerView />
    </Suspense>
  );
}
