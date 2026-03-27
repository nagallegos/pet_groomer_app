import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.barksbubblesandlove.petgroomer",
  appName: "Barks",
  webDir: "dist",
  bundledWebRuntime: false,
  server: {
    androidScheme: "http",
  },
};

export default config;
