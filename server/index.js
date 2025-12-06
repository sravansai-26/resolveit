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
   FIX 1: Increase body limits (image/video upload safe)
-------------------------------------------------------- */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

/* --------------------------------------------------------
   FIX 2: Serve uploads folder if needed
-------------------------------------------------------- */
app.use('/uploads', express.static(join(__dirname, 'uploads')));

/* --------------------------------------------------------
   FIX 4: CROSS-ORIGIN ISOLATION HEADERS (NEW FIX)
-------------------------------------------------------- */
app.use((req, res, next) => {
    // Allow Firebase pop-up to communicate with the parent window
    res.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups'); 
    res.set('Cross-Origin-Embedder-Policy', 'require-corp'); 
    next();
});

/* --------------------------------------------------------
   FIX 3: Final CORS System
-------------------------------------------------------- */

const ALLOWED_ORIGINS = [
  "https://resolveit-welfare.vercel.app",
  "http://localhost:5173",
  "http://localhost:5000",
  "http://192.168.24.6:5000",
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const isVercelSubdomain = origin.endsWith(".vercel.app");

    const isAllowed =
      ALLOWED_ORIGINS.includes(origin) ||
      isVercelSubdomain;

    if (isAllowed) return callback(null, true);

    console.warn("❌ CORS BLOCKED:", origin);
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* --------------------------------------------------------
   Security + Logging
-------------------------------------------------------- */
app.use(helmet());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

/* --------------------------------------------------------
   MongoDB
-------------------------------------------------------- */
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
  console.error("❌ Missing ENV variables");
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("MongoDB Error:", err);
    process.exit(1);
  });

/* --------------------------------------------------------
   Routes
-------------------------------------------------------- */
app.get("/", (req, res) => res.send("ResolveIt API running"));

app.use("/api/auth", authRoutes);
app.use("/api/issues", issueRoutes);
app.use("/api/users", userRoutes);
app.use("/api/feedback", feedbackRoutes);

/* --------------------------------------------------------
   404 Handler
-------------------------------------------------------- */
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Not Found" });
});

/* --------------------------------------------------------
   Global Error Handler
-------------------------------------------------------- */
app.use((err, req, res, next) => {
  console.error("🔥 Server Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

/* --------------------------------------------------------
   Graceful Shutdown
-------------------------------------------------------- */
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB disconnected");
  process.exit(0);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});

/* --------------------------------------------------------
   Start Server
-------------------------------------------------------- */
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));