import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lyfspot.resolveit',
  appName: 'Resolveit',
  // Matches your Vite build folder
  webDir: 'client/dist', 

  server: {
    // 🚀 FIX: androidScheme must be 'https' for secure cookie/image handling
    androidScheme: 'https', 
    // 🚀 FIX: allows navigation to any external URL (Backend/Image hosting)
    allowNavigation: ['*'],
    // 🚀 FIX: This specifically helps loading images from non-SSL or mixed sources
    cleartext: true 
  },

  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      /**
       * 🚀 Verified Web Client ID (ending in .apps.googleusercontent.com)
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
    // 🚀 FIX: Vital for showing images that might be on a different protocol (HTTP/HTTPS)
    allowMixedContent: true,
    captureInput: true,
    minWebViewVersion: 60 
  }
};

export default config;