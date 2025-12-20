// src/firebase.js (FIXED PRODUCTION VERSION)
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  setPersistence, 
  browserLocalPersistence 
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

/**
 * 🛠️ FIX FOR MOBILE APK (Missing Initial State Error):
 * We force 'browserLocalPersistence' so that the authentication state
 * is saved in localStorage instead of sessionStorage. 
 * This prevents the browser from "forgetting" the login request during redirects.
 */
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Firebase: Local persistence enabled.");
  })
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

export const googleProvider = new GoogleAuthProvider(); 

// Optional: Forces the account selection popup to show every time
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export { auth };