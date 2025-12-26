import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  
  // 🔥 appType: "spa" ensures your routing works correctly on page refreshes
  appType: "spa",

  resolve: {
    alias: {
      // Allows using '@' to refer to your 'src' folder for cleaner imports
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    
    // 🚀 THE GUNSHOT FIX: Rollup settings to handle Capacitor
    rollupOptions: {
      /**
       * We list these as 'external' so Rollup doesn't panic when it can't 
       * find the native source code during the web-bundling phase.
       */
      external: [
        "@capacitor/core",
        "@codetrix-studio/capacitor-google-auth",
        "@capacitor/app",
        "@capacitor/haptics",
        "@capacitor/keyboard",
        "@capacitor/status-bar"
      ],
      output: {
        // Ensures proper pathing for assets in the APK WebView
        manualChunks: undefined,
      },
    },
  },

  server: {
    host: true, // Needed for local network testing on physical devices
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});