import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  indexedDBLocalPersistence, // 🚀 Required for APK stability
  browserLocalPersistence,
  initializeAuth, 
  signInWithPopup,
  signInWithCredential 
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const firebaseConfig = {
  apiKey: "AIzaSyCPKJ6LO2Mylk5d4CNqkXkKRQK7jnmoPs4",
  authDomain: "resolveit-project.firebaseapp.com",
  projectId: "resolveit-project",
  storageBucket: "resolveit-project.firebasestorage.app",
  messagingSenderId: "509516392972",
  appId: "1:509516392972:web:441432180c7a915c8e9c29",
  measurementId: "G-S91L1D13HD"
};

// 1. Initialize Firebase App
const app = initializeApp(firebaseConfig);

// 2. 🛡️ Initialize Auth with "White Screen" Prevention
// We use a conditional check to ensure the correct persistence is used.
let auth;

if (Capacitor.isNativePlatform()) {
  // On Android/iOS, we MUST use initializeAuth to avoid crashing the WebView
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence
  });
  
  // Initialize the native Google Auth plugin
  GoogleAuth.initialize();
} else {
  // On Web, the standard getAuth is perfectly fine
  auth = getAuth(app);
}

export const googleProvider = new GoogleAuthProvider(); 

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * 🚀 HYBRID LOGIN HELPER
 * This single function works seamlessly for both your Web site and the APK.
 */
export const signInWithGoogle = async () => {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    // === WEB LOGIC ===
    console.log("Initiating Web Google Login...");
    return await signInWithPopup(auth, googleProvider);
  } else {
    // === APK/ANDROID LOGIC ===
    console.log("Initiating Native APK Google Login...");
    try {
      // 1. Trigger the native Android account selector (Native Layer)
      const googleUser = await GoogleAuth.signIn();
      
      // 2. Extract the ID Token from the native response
      const idToken = googleUser.authentication.idToken;
      
      // 3. Create a Firebase Credential using that token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // 4. Sign into Firebase with the native credential (Web Layer)
      // We 'await' here to ensure the login completes before the UI continues.
      return await signInWithCredential(auth, credential);
    } catch (error) {
      console.error("Native Google Login Failed:", error);
      throw error;
    }
  }
};

export { auth };