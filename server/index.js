import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// --- CONFIGURATION LOADING ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Explicitly load .env from the same directory as this script
dotenv.config({ path: join(__dirname, '.env') });

// --- ROUTE IMPORTS ---
import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import userRoutes from './routes/users.js';
import feedbackRoutes from './routes/feedback.js';
import { auth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------------------------------------------------------
// ✅ PRODUCTION CORS SETUP (CRITICAL CHANGE)
// Allowed origins for both development and production (pulled from ENV)
// ------------------------------------------------------------------
const allowedOrigins = [
    'http://localhost:5173',           // For local React development
    process.env.CORS_ORIGIN,           // Live production domain (e.g., https://resolveit.netlify.app)
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl requests)
        if (!origin) {
            return callback(null, true);
        }

        // Check if the requesting origin is in the allowed list
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Check if the origin matches the deployed environment variable
            const isAllowed = origin === process.env.CORS_ORIGIN;
            if (isAllowed) {
                callback(null, true);
            } else {
                callback(new Error(`Not allowed by CORS: ${origin}`));
            }
        }
    },
    credentials: true,
};
app.use(cors(corsOptions));

// ✅ Middleware setup
app.use(helmet());
app.use(express.json());

// Logging middleware for development only
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ✨ NEW: Middleware to add Cross-Origin-Resource-Policy header for static files (fix for browser display)
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    next(); // Pass control to the next middleware (express.static)
});

// ✅ Serve static files for uploaded images/videos
app.use('/uploads', express.static(join(__dirname, 'uploads')));


// ✅ Health check route
app.get('/', (req, res) => {
    res.send('ResolveIt API is running');
});

// ------------------------------------------------------------------
// ✅ MONGODB CONNECTION AND VALIDATION
// ------------------------------------------------------------------

// Validate required environment variables
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET || !process.env.CORS_ORIGIN) {
    console.error('Missing required environment variables (MONGODB_URI, JWT_SECRET, or CORS_ORIGIN)');
    process.exit(1);
}

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// ✅ Optional: Add /api/auth/me to check token and return user
app.get('/api/auth/me', auth, async (req, res) => {
    try {
        res.json(req.user);
    } catch (err) {
        res.status(500).json({ message: 'Failed to fetch user profile' });
    }
});

// ✅ API Routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);

// ✅ 404 route handler
app.use((req, res) => {
    res.status(404).json({ message: 'Not Found' });
});

// ✅ Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        message: 'Something went wrong!',
        // Only include the detailed error message in development mode
        ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
});

// ✅ Graceful shutdown handlers
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
});

// ✅ Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});