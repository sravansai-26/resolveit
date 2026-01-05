import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load ENV
import "dotenv/config";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Routes
import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import userRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT || 5000;

/* --------------------------------------------------------
   Body Parser
-------------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* --------------------------------------------------------
   ✅ CRITICAL FIX: CORS CONFIGURATION
-------------------------------------------------------- */
const ALLOWED_ORIGINS = [
    // Production – Custom Domains
    "https://resolveit-community.me",
    "https://www.resolveit-community.me",

    // Production – Vercel fallback
    "https://resolveit-community.vercel.app",
    "https://resolveit-welfare.vercel.app",

    // Render (self-calls / health)
    "https://resolveit-api.onrender.com",

    // Mobile / WebView / Capacitor
    "capacitor://localhost",
    "http://localhost",
    "https://localhost",
    "http://10.0.2.2",

    // Local dev
    "http://localhost:5173",
    "http://localhost:5000",
    "http://192.168.24.6:5000",

    // Legacy / blog
    "https://sailyfspot.blogspot.com"
];

const corsOptions = {
    origin: function (origin, callback) {
        console.log("🔵 CORS CHECK:", origin || "NO ORIGIN");

        // Allow server-to-server, Postman, mobile apps
        if (!origin) {
            return callback(null, true);
        }

        const isAllowed =
            ALLOWED_ORIGINS.includes(origin) ||
            origin.endsWith(".vercel.app");

        if (isAllowed) {
            console.log("✅ CORS ALLOWED:", origin);
            return callback(null, true);
        }

        console.error("❌ CORS BLOCKED:", origin);
        return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With"
    ],
    exposedHeaders: ["Authorization"],
    optionsSuccessStatus: 204,
    maxAge: 86400
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* --------------------------------------------------------
   Security Headers (Firebase + Google Auth safe)
-------------------------------------------------------- */
app.use(
    helmet({
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
        contentSecurityPolicy: false
    })
);

/* --------------------------------------------------------
   Firebase Google Auth popup fix
-------------------------------------------------------- */
app.use((req, res, next) => {
    if (req.path.startsWith("/api/auth/google")) {
        res.setHeader(
            "Cross-Origin-Opener-Policy",
            "same-origin-allow-popups"
        );
        res.setHeader(
            "Cross-Origin-Embedder-Policy",
            "credentialless"
        );
    }
    next();
});

/* --------------------------------------------------------
   Serve uploads folder (Cloudinary / Images / APK WebView)
-------------------------------------------------------- */
app.use(
    "/uploads",
    (req, res, next) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "*");
        next();
    },
    express.static(join(__dirname, "uploads"))
);

/* --------------------------------------------------------
   Request Logging
-------------------------------------------------------- */
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}

app.use((req, res, next) => {
    console.log(`\n📨 ${req.method} ${req.path}`);
    console.log("🔵 Origin:", req.headers.origin || "NONE");
    console.log("🔑 Auth:", req.headers.authorization ? "YES" : "NO");
    next();
});

/* --------------------------------------------------------
   MongoDB Connection
-------------------------------------------------------- */
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error("❌ Missing ENV variables");
    process.exit(1);
}

mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("✅ MongoDB Connected");
        console.log("📦 DB:", mongoose.connection.name);
    })
    .catch((err) => {
        console.error("❌ MongoDB Error:", err);
        process.exit(1);
    });

/* --------------------------------------------------------
   Routes
-------------------------------------------------------- */
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "ResolveIt API running",
        time: new Date().toISOString()
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        mongodb:
            mongoose.connection.readyState === 1
                ? "connected"
                : "disconnected",
        time: new Date().toISOString()
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/users", userRoutes);

/* --------------------------------------------------------
   404 Handler
-------------------------------------------------------- */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Endpoint not found",
        path: req.path
    });
});

/* --------------------------------------------------------
   Global Error Handler
-------------------------------------------------------- */
app.use((err, req, res, next) => {
    console.error("🔥 ERROR:", err.message);

    if (err.message.includes("CORS")) {
        return res.status(403).json({
            success: false,
            message: "CORS blocked this request"
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Internal server error"
    });
});

/* --------------------------------------------------------
   Graceful Shutdown
-------------------------------------------------------- */
process.on("SIGINT", async () => {
    console.log("🔴 Shutting down...");
    await mongoose.connection.close();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("🔴 SIGTERM received");
    await mongoose.connection.close();
    process.exit(0);
});

/* --------------------------------------------------------
   Start Server
-------------------------------------------------------- */
app.listen(PORT, () => {
    console.log("\n==========================================");
    console.log("🚀 ResolveIt API Server Running");
    console.log(`📍 Port: ${PORT}`);
    console.log(`🌍 ENV: ${process.env.NODE_ENV || "development"}`);
    console.log("==========================================\n");
});
