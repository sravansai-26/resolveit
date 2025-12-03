// index.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 🟢 CRITICAL FIX: Use the simple, direct 'dotenv/config' import 
import 'dotenv/config'; 

// --- CONFIGURATION LOADING ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- ROUTE IMPORTS ---
import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import userRoutes from './routes/users.js';
import feedbackRoutes from './routes/feedback.js';

const app = express();
const PORT = process.env.PORT || 5000; 

// ------------------------------------------------------------------
// CORS Configuration for Deployment Stability (FINAL FIX)
// ------------------------------------------------------------------

const ALLOWED_ORIGINS = [
    // 🛑 Vercel Production Domain (CRITICAL for live app)
    'https://resolveit-welfare.vercel.app', 
    // Vercel Preview Domains (Highly recommended for testing branches)
    'https://*.vercel.app', 
    // Localhost for Development
    'http://localhost:5173', 
    'http://localhost:5000',
    'http://192.168.24.6:5000', // Your specific BASE_URL IP
];

const corsOptions = {
    // 🛑 FINAL CORS FIX: Use a function for dynamic origin checking 
    // This is the most reliable way to handle multiple origins AND credentials.
    origin: function (origin, callback) {
        // 1. Allow requests with no origin (like Postman or server-to-server)
        if (!origin) return callback(null, true); 
        
        // 2. Check if the requesting origin is in our allowed list
        const isAllowed = ALLOWED_ORIGINS.some(allowed => {
            if (allowed === '*') return true;
            if (allowed.startsWith('https://*.vercel.app')) {
                // Special handling for Vercel preview URLs
                const regex = new RegExp(`^https://([^\\.]+)\\.vercel\\.app$`);
                return regex.test(origin);
            }
            return origin === allowed;
        });

        if (isAllowed) {
            callback(null, true);
        } else {
            // Log the failed origin for future debugging
            console.error(`CORS BLOCKED: Origin ${origin} not allowed.`);
            callback(new Error('Not allowed by CORS'), false);
        }
    }, 
    credentials: true, // MUST BE TRUE for sending tokens/cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204 // Standard status for successful preflight
};

app.use(cors(corsOptions));

// ✅ Middleware setup
app.use(helmet());
app.use(express.json());

// Logging middleware for development only
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ------------------------------------------------------------------
// MONGODB CONNECTION AND VALIDATION
// ------------------------------------------------------------------

// Validate required environment variables (including the Firebase one, implicitly)
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('Missing required environment variables (MONGODB_URI or JWT_SECRET)');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => {
        console.error('MongoDB connection error:', err);
        process.exit(1);
    });

// ✅ Health check route
app.get('/', (req, res) => {
    res.send('ResolveIt API is running');
});

// ------------------------------------------------------------------
// ✅ API Routes (Consolidated)
// ------------------------------------------------------------------

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