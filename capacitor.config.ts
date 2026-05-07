import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.glucolab.app',
  appName: 'GlucoLab',
  webDir: 'dist/client',
  server: {
    url: 'https://tanstack-start-app.glucolab.workers.dev',
    cleartext: true
  }
};

export default config;
