import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lyfspot.resolveit',
  appName: 'Resolveit',
  // 🚀 CRITICAL: This must match where your Vite 'dist' folder is located
  webDir: 'client/dist', 

  server: {
    // Required for modern Android security and cookie handling
    androidScheme: 'https', 
    allowNavigation: ['*'],
  },

  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      /**
       * 🚀 Verified Web Client ID
       */
      serverClientId: '509516392972-cr87vd1nktn429rl2d96kcrjrrcd1fql.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    
    AppLauncher: {
      // Re-opens app after Google login redirect
      launchUrl: 'com.lyfspot.resolveit://' 
    }
  },

  android: {
    backgroundColor: "#ffffff",
    allowMixedContent: true,
    captureInput: true,
    // Ensures the app doesn't crash on older WebViews
    minWebViewVersion: 60 
  }
};

export default config;