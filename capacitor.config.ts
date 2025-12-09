import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lyfspot.resolveit',
  appName: 'Resolveit',
  webDir: 'client/dist',
  
  // === CRITICAL FIX FOR ANDROID GOOGLE SIGN-IN ===
  server: {
    // Allows the WebView to load assets using https://localhost
    androidScheme: 'https', 
  },
  
  // NOTE: You do not need to add the Firebase Redirect URI here, 
  // but ensure your Google Sign-In setup uses the 
  // 'com.lyfspot.resolveit' scheme for redirects.
  
  // You might also need this for production builds if running on an older device:
  // android: {
  //   allowMixedContent: true
  // }
};

export default config;