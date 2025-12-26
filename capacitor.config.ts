import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lyfspot.resolveit',
  appName: 'Resolveit',
  // Ensure this points to your client build folder
  webDir: 'client/dist', 
  
  // === NETWORK & SECURITY FIXES ===
  server: {
    // Required for modern Android WebView to handle HTTPS and cookies correctly
    androidScheme: 'https', 
    // Allows loading images from your Render/Firebase backend
    allowNavigation: ['*'],
  },

  plugins: {
    // === GOOGLE AUTH CONFIGURATION ===
    GoogleAuth: {
      scopes: ['profile', 'email'],
      /**
       * 🚀 CRITICAL: You MUST use the "Web Client ID" here, NOT the Android ID.
       * Find this in Google Cloud Console -> Credentials -> OAuth 2.0 Client IDs.
       */
      serverClientId: '509516392972-cr87vd1nktn429rl2d96kcrjrrcd1fql.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
    
    // === DEEP LINKING FIX ===
    AppLauncher: {
      // Handles the handshake when returning from the Google login screen
      launchUrl: 'com.lyfspot.resolveit://' 
    }
  },

  // === ANDROID SPECIFIC PREFERENCES ===
  android: {
    // Standard preference for modern Capacitor apps
    backgroundColor: "#ffffff",
    allowMixedContent: true,
    captureInput: true,
  }
};

export default config;