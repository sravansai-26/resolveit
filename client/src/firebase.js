// src/firebase.js

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Replace the placeholder values below with your actual Firebase project config.
// These keys are public and safe to include in your client-side code.
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY", 
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
    // measurementId: "G-XXXXXXXXXX" // Optional
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