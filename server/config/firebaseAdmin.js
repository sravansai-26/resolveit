// server/config/firebaseAdmin.js
// FINAL STABLE VERSION — NO HALF LOGIC, NO GUESSING

import admin from "firebase-admin";

if (!admin.apps.length) {
  try {
    let serviceAccount = null;

    /* =========================================================
       METHOD 1: SINGLE ENV VAR (RECOMMENDED)
       ========================================================= */
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

      // 🔑 ABSOLUTE MUST: fix private key formatting
      if (serviceAccount.private_key) {
        serviceAccount.private_key =
          serviceAccount.private_key.replace(/\\n/g, "\n");
      }

      console.log(
        "Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY (Recommended)"
      );
    }

    /* =========================================================
       METHOD 2: LEGACY MULTI-VAR (OPTIONAL FALLBACK)
       ========================================================= */
    else if (
      process.env.FIREBASE_ADMIN_PRIVATE_KEY &&
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL
    ) {
      serviceAccount = {
        type: "service_account",
        project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
        private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, "\n"),
        client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      };

      console.log(
        "Firebase Admin initialized from multiple ENV vars (Legacy mode)"
      );
    }

    /* =========================================================
       METHOD 3: LOCAL DEV WITHOUT FIREBASE (SAFE)
       ========================================================= */
    else {
      console.warn(
        "⚠️ Firebase Admin NOT initialized (no credentials provided)"
      );
    }

    /* =========================================================
       INITIALIZE SDK (ONLY IF CREDS EXIST)
       ========================================================= */
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
  } catch (error) {
    console.error(
      "❌ FATAL: Firebase Admin SDK failed to initialize:",
      error.message
    );
  }
}

export default admin;
