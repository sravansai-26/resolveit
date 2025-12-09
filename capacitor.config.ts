import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lyfspot.resolveit',
  appName: 'Resolveit',
  webDir: 'client/dist',
  
  // === CRITICAL FIXES FOR ANDROID REDIRECTS ===
  server: {
    // Ensures the WebView uses HTTPS locally
    androidScheme: 'https', 
  },

  plugins: {
    // Explicitly define Google Auth settings to help the build system
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // Note: You may need to add your actual web client ID here later
    },
    
    // AppLauncher settings are often needed for redirects to work reliably
    AppLauncher: {
        // This is a common fix to handle the return URL from third-party services
        launchUrl: 'com.lyfspot.resolveit://' 
    }
  },
  
  // Use the Android block for specific preferences (though the plugins block should be enough)
  android: {
    // No further preferences needed here if plugins are correct
  }
};

export default config;