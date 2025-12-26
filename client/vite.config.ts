import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  // 🚀 THE CRITICAL FIX: Ensures assets use relative paths (./)
  // Without this, the APK looks in the wrong place and stays white.
  base: './',

  plugins: [react()],
  
  // Ensures single-page application routing works on refresh
  appType: "spa",

  resolve: {
    alias: {
      // Matches your project imports like '@/components/...'
      "@": path.resolve(__dirname, "./src"),
    },
  },

  build: {
    outDir: "dist",
    emptyOutDir: true,
    // We removed the 'external' block. 
    // Vite will now bundle Capacitor properly into the APK.
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },

  server: {
    host: true,
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