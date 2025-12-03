// server/config/firebaseAdmin.js

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs'; // 🟢 NEW: Import the Node.js File System module

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the path to your service account key file
const SERVICE_ACCOUNT_PATH = join(__dirname, 'serviceAccountKey.json'); // Adjust path if you put it elsewhere

// --- Initialization Logic ---
if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    try {
        // Load key directly from the file system
        const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        
        // 🟢 Success Confirmation
        console.log("Firebase Admin SDK initialized successfully via local JSON file (Final Local Fix).");

    } catch (e) {
        // This catches file read or general initialization errors
        console.error("CRITICAL ERROR: Failed to initialize Firebase Admin SDK from JSON file:", e.message);
    }
} else {
    // 🛑 Deployment Mode Check (This handles Render/Vercel)
    if (process.env.FIREBASE_ADMIN_PRIVATE_KEY && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
         // This is the structure you MUST use for Render/Vercel
        try {
            const serviceAccount = {
                type: process.env.FIREBASE_ADMIN_TYPE || "service_account",
                project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
                client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
                // Note: The key for production will still be read from the ENV var
                private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
            };

            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
            console.log("Firebase Admin SDK initialized successfully via Production ENV variables.");

        } catch (e) {
            console.error("CRITICAL PRODUCTION ERROR: Firebase ENV init failed:", e.message);
        }
    } else {
        console.warn("WARNING: Firebase Admin not initialized. Missing local JSON file AND missing production ENV variables.");
    }
}

export default admin;