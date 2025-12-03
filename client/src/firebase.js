// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Replace the placeholder values below with your actual Firebase project config.
// These keys are public and safe to include in your client-side code.
const firebaseConfig = {
    apiKey: "AIzaSyCPKJ6LO2Mylk5d4CNqkXkKRQK7jnmoPs4", 
    authDomain: "resolveit-project.firebaseapp.com",
    projectId: "resolveit-project",
    storageBucket: "resolveit-project.firebasestorage.app",
    messagingSenderId: "509516392972",
    appId: "1:509516392972:web:441432180c7a915c8e9c29",
    measurementId: "G-S91L1D13HD" // Optional
};

// 1. Initialize Firebase
const app = initializeApp(firebaseConfig);

// 2. Export the Auth service instance
export const auth = getAuth(app);

// 3. Export the Google Auth Provider instance
export const googleProvider = new GoogleAuthProvider(); 

// Optional: If you need to enforce a specific language or setting:
// googleProvider.setCustomParameters({
//   prompt: 'select_account' // Forces account selection every time
// });

// This file is now complete and ready to be imported into your components 
// (Login/Register) and your central Auth Context.