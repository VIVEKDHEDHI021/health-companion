import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.glucolab.app",
  appName: "GlucoLab",
  webDir: "dist/client",
  server: {
    cleartext: true,
  },
};

export default config;
