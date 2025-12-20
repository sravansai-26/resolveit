import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence, 
  setPersistence,
  signInWithPopup // 👈 Added for stable Mobile Auth
} from 'firebase/auth';

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

/**
 * 🛠️ STABILITY FIX:
 * Forces persistence to LocalStorage. This ensures that even if the 
 * WebView is killed in the background, the user stays logged in.
 */
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase: Persistence set to Local.");
  })
  .catch((error) => {
    console.error("Firebase Persistence Error:", error);
  });

export const googleProvider = new GoogleAuthProvider(); 

// Forces account selection popup every time
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Helper for stable login on both Web and APK
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

export { auth };