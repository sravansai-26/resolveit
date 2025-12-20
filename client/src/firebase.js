// src/firebase.js
import { initializeApp } from 'firebase/app';
import { 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  GoogleAuthProvider 
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

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

/**
 * 🛠️ THE ULTIMATE APK FIX (Missing Initial State):
 * We use 'initializeAuth' instead of 'getAuth'.
 * We prioritize 'indexedDBLocalPersistence' because it is more robust 
 * than localStorage in mobile WebView environments.
 */
const auth = initializeAuth(app, {
  persistence: [indexedDBLocalPersistence, browserLocalPersistence],
});

export const googleProvider = new GoogleAuthProvider(); 

// Forces the account selection popup to show every time
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth };