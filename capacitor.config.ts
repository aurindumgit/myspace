import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.aurindum.myspace",
  appName: "myspace",
  webDir: "out",
  plugins: {
    LocalNotifications: {
      iconColor: "#9FB5E3",
    },
  },
};

export default config;
