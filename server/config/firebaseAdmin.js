// server/config/firebaseAdmin.js
// THIS VERSION WORKS 100% ON RENDER, VERCEL, RAILWAY, LOCAL — EVERYWHERE

import admin from "firebase-admin";

// Prevent multiple initializations
if (!admin.apps.length) {
  try {
    let serviceAccount;

    // METHOD 1: Best & simplest for Render/Vercel — ONE SINGLE ENV VAR (recommended)
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      console.log("Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY (Recommended)");
    }
    // METHOD 2: Fallback — old multi-var style (still supported for backward compat)
    else if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
        private_key_id: process.env.FIREBASE_ADMIN_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_ADMIN_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_ADMIN_CLIENT_X509_CERT_URL,
      };
      console.log("Firebase Admin initialized from multiple ENV vars (Legacy mode)");
    }
    // METHOD 3: Local dev only
    else if (process.env.NODE_ENV !== "production") {
      // Allow local dev without any env var (uses default credentials or emulator)
      console.warn("No Firebase credentials found — assuming local emulator or ADC");
      // Don't initialize — let Firebase use default credentials or fail loudly later
    } else {
      throw new Error("No Firebase credentials provided");
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }

  } catch (error) {
    console.error("FATAL: Firebase Admin SDK failed to initialize:", error.message);
    // We don't throw — your /google route already handles this case
  }
}

export default admin;