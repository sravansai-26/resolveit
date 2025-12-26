import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence, 
  setPersistence,
  signInWithPopup,
  signInWithCredential // 👈 Added for Native APK login
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core'; // 👈 Needed for platform detection
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth'; // 👈 Native Plugin

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

// 2. Initialize Auth
const auth = getAuth(app);

// Initialize Native Google Auth for Capacitor
if (Capacitor.getPlatform() !== 'web') {
    GoogleAuth.initialize();
}

/**
 * 🛠️ STABILITY FIX:
 */
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase: Persistence set to Local.");
  })
  .catch((error) => {
    console.error("Firebase Persistence Error:", error);
  });

export const googleProvider = new GoogleAuthProvider(); 

googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * 🚀 HYBRID LOGIN HELPER
 * Identifies if user is on Web or APK and uses the appropriate method.
 */
export const signInWithGoogle = async () => {
  const platform = Capacitor.getPlatform();

  if (platform === 'web') {
    // === WEB LOGIC ===
    console.log("Initiating Web Google Login...");
    return signInWithPopup(auth, googleProvider);
  } else {
    // === APK/ANDROID LOGIC ===
    console.log("Initiating Native APK Google Login...");
    try {
      // 1. Trigger the native Android account selector
      const googleUser = await GoogleAuth.signIn();
      
      // 2. Extract the ID Token from the native response
      const idToken = googleUser.authentication.idToken;
      
      // 3. Create a Firebase Credential using that token
      const credential = GoogleAuthProvider.credential(idToken);
      
      // 4. Sign into Firebase with the native credential
      return signInWithCredential(auth, credential);
    } catch (error) {
      console.error("Native Google Login Failed:", error);
      throw error;
    }
  }
};

export { auth };