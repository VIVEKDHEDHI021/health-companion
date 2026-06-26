import { StartClient } from "@tanstack/react-start/client";
import { RouterProvider } from "@tanstack/react-router";
import { hydrateRoot, createRoot } from "react-dom/client";
import { getRouter } from "./router";
import { Capacitor } from "@capacitor/core";

const router = getRouter();

if (Capacitor.isNativePlatform()) {
  const rootEl = document.getElementById("root");
  if (rootEl) {
    createRoot(rootEl).render(<RouterProvider router={router} />);
  } else {
    createRoot(document.body).render(<RouterProvider router={router} />);
  }
} else {
  hydrateRoot(document, <StartClient />);
}
