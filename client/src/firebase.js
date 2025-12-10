// src/firebase.js (FINAL PRODUCTION VERSION)

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    // Reading public keys from Vercel Environment variables (VITE_ prefix required)
   apiKey: "AIzaSyCPKJ6LO2Mylk5d4CNqkXkKRQK7jnmoPs4",
  authDomain: "resolveit-project.firebaseapp.com",
  projectId: "resolveit-project",
  storageBucket: "resolveit-project.firebasestorage.app",
  messagingSenderId: "509516392972",
  appId: "1:509516392972:web:441432180c7a915c8e9c29",
  measurementId: "G-S91L1D13HD"
};

// Initialize Firebase
// This code remains the same, but now uses the dynamic config object
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); 

// NOTE: You must commit and push this updated src/firebase.js file.
// Vercel will then use the secrets you set in Step 1.