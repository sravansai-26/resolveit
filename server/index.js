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
import feedbackRoutes from './routes/feedback.js';

const app = express();
const PORT = process.env.PORT || 5000;

/* --------------------------------------------------------
   Body Parser with increased limits
-------------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* --------------------------------------------------------
   Serve uploads folder
-------------------------------------------------------- */
app.use('/uploads', express.static(join(__dirname, 'uploads')));

/* --------------------------------------------------------
   CRITICAL FIX: CORS Configuration (BEFORE other middleware)
-------------------------------------------------------- */
const ALLOWED_ORIGINS = [
  "https://resolveit-welfare.vercel.app",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://192.168.24.6:5000",
];

const corsOptions = {
  origin: function (origin, callback) {
    console.log("🔵 CORS Check - Origin:", origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log("✅ No origin - allowing request");
      return callback(null, true);
    }

    // Check if origin is in allowed list or is a Vercel subdomain
    const isVercelSubdomain = origin.endsWith(".vercel.app");
    const isAllowed = ALLOWED_ORIGINS.includes(origin) || isVercelSubdomain;

    if (isAllowed) {
      console.log("✅ CORS allowed for origin:", origin);
      return callback(null, true);
    }

    console.warn("❌ CORS BLOCKED:", origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 204,
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options("*", cors(corsOptions));

/* --------------------------------------------------------
   CRITICAL FIX: Cross-Origin Headers for Firebase
   These must come AFTER CORS but BEFORE routes
-------------------------------------------------------- */
app.use((req, res, next) => {
  // Allow Firebase pop-up to communicate with parent window
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
  next();
});

/* --------------------------------------------------------
   Security Headers (with adjustments for Firebase)
-------------------------------------------------------- */
app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false, // Disable if causing issues with Firebase
  })
);

/* --------------------------------------------------------
   Request Logging
-------------------------------------------------------- */
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`\n📨 ${req.method} ${req.path}`);
  console.log("🔵 Headers:", {
    authorization: req.headers.authorization ? "Present" : "Missing",
    origin: req.headers.origin || "No origin",
    contentType: req.headers['content-type']
  });
  next();
});

/* --------------------------------------------------------
   MongoDB Connection
-------------------------------------------------------- */
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("❌ Missing required environment variables:");
  if (!process.env.MONGODB_URI) console.error("  - MONGODB_URI");
  if (!process.env.JWT_SECRET) console.error("  - JWT_SECRET");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    console.log("🔵 Database:", mongoose.connection.name);
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

/* --------------------------------------------------------
   API Routes (Order matters!)
-------------------------------------------------------- */
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "ResolveIt API running",
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString()
  });
});

// Mount API routes
console.log("🔧 Registering routes...");
app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/users", userRoutes);
app.use("/api/feedback", feedbackRoutes);
console.log("✅ Routes registered");

/* --------------------------------------------------------
   404 Handler - CRITICAL: Must come after all routes
-------------------------------------------------------- */
app.use((req, res) => {
  console.warn(`⚠️ 404 Not Found: ${req.method} ${req.path}`);
  console.warn("🔵 Available routes:");
  console.warn("  - /api/auth/*");
  console.warn("  - /api/users/*");
  console.warn("  - /api/issues/*");
  console.warn("  - /api/feedback/*");
  
  res.status(404).json({ 
    success: false, 
    message: "Endpoint not found",
    path: req.path,
    method: req.method
  });
});

/* --------------------------------------------------------
   Global Error Handler
-------------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("🔥 Global Error Handler:");
  console.error("🔥 Error:", err.message);
  console.error("🔥 Stack:", err.stack);
  
  // Handle specific error types
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token"
    });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: err.errors
    });
  }

  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: "CORS policy violation"
    });
  }

  // Generic error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { 
      error: err.message,
      stack: err.stack 
    }),
  });
});

/* --------------------------------------------------------
   Graceful Shutdown
-------------------------------------------------------- */
process.on("SIGINT", async () => {
  console.log("\n🔵 Shutting down gracefully...");
  await mongoose.connection.close();
  console.log("✅ MongoDB disconnected");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🔵 SIGTERM received, shutting down...");
  await mongoose.connection.close();
  console.log("✅ MongoDB disconnected");
  process.exit(0);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise);
  console.error("❌ Reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

/* --------------------------------------------------------
   Start Server
-------------------------------------------------------- */
app.listen(PORT, () => {
  console.log("\n" + "=".repeat(50));
  console.log("🚀 ResolveIt API Server Started");
  console.log("=".repeat(50));
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base: http://localhost:${PORT}`);
  console.log("=".repeat(50) + "\n");
});