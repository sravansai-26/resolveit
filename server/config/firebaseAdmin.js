// server/config/firebaseAdmin.js
const admin = require('firebase-admin');

// Check if the environment variable is present
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        // Parse the JSON string from the environment variable
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized successfully via environment variable.");

    } catch (e) {
        console.error("ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", e);
    }
} else {
    console.warn("WARNING: FIREBASE_SERVICE_ACCOUNT environment variable not found. Google OAuth will not work.");
}

// Export the admin object so it can be used for token verification
module.exports = admin;