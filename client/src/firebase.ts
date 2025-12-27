// src/firebase.ts
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  Auth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  signInWithPopup,
  signInWithCredential,
} from "firebase/auth";

import { Capacitor } from "@capacitor/core";
import { GoogleAuth } from "@codetrix-studio/capacitor-google-auth";

const firebaseConfig = {
  apiKey: "AIzaSyCPKJ6LO2Mylk5d4CNqkXkKRQK7jnmoPs4",
  authDomain: "resolveit-project.firebaseapp.com",
  projectId: "resolveit-project",
  storageBucket: "resolveit-project.firebasestorage.app",
  messagingSenderId: "509516392972",
  appId: "1:509516392972:web:441432180c7a915c8e9c29",
};

const app = initializeApp(firebaseConfig);

/* =====================================================
   AUTH INITIALIZATION (NO ANY, NO CRASH)
===================================================== */
let auth: Auth;

if (Capacitor.isNativePlatform()) {
  auth = initializeAuth(app, {
    persistence: indexedDBLocalPersistence,
  });

  if (!import.meta.env.VITE_FIREBASE_WEB_CLIENT_ID) {
    console.error("❌ Missing VITE_FIREBASE_WEB_CLIENT_ID in client/.env");
  } else {
    GoogleAuth.initialize({
      clientId: import.meta.env.VITE_FIREBASE_WEB_CLIENT_ID,
      scopes: ["profile", "email"],
      grantOfflineAccess: true,
    });
  }
} else {
  auth = getAuth(app);
  auth.setPersistence(browserLocalPersistence);
}

/* =====================================================
   GOOGLE PROVIDER (EXPORT REQUIRED)
===================================================== */
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/* =====================================================
   HYBRID GOOGLE LOGIN
===================================================== */
export const signInWithGoogle = async () => {
  if (!Capacitor.isNativePlatform()) {
    return await signInWithPopup(auth, googleProvider);
  }

  const googleUser = await GoogleAuth.signIn();

  if (!googleUser.authentication?.idToken) {
    throw new Error("Google ID Token missing");
  }

  const credential = GoogleAuthProvider.credential(
    googleUser.authentication.idToken
  );

  return await signInWithCredential(auth, credential);
};

/* =====================================================
   EXPORTS
===================================================== */
export { auth, googleProvider };
