import { StartClient } from "@tanstack/react-start/client";
import { RouterProvider } from "@tanstack/react-router";
import { hydrateRoot, createRoot } from "react-dom/client";
import { getRouter } from "./router";
import { Capacitor } from "@capacitor/core";

if (typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("GLOBAL ERROR DETECTED:", event.message, event.error?.stack || event.error);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("UNHANDLED REJECTION DETECTED:", event.reason?.message || event.reason, event.reason?.stack);
  });
}

const router = getRouter();

const rootEl = document.getElementById("root");
const isSPA = Capacitor.isNativePlatform() || (!!rootEl && rootEl.innerHTML.trim() === "");

if (isSPA) {
  createRoot(rootEl || document.body).render(<RouterProvider router={router} />);
} else {
  hydrateRoot(document, <StartClient />);
}
