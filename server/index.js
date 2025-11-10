import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path'; // Ensure 'join' is imported from 'path'

// ----------------------------------------------------
// DEBUGGING ADDITIONS: START
// These lines help us diagnose environment variable loading issues
// ----------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Log current working directory and script directory
console.log('DEBUG: Current Working Directory (process.cwd()):', process.cwd());
console.log('DEBUG: Script Directory (__dirname):', __dirname);

// Explicitly load .env from the same directory as this script
dotenv.config({ path: join(__dirname, '.env') });

// Log SMTP variables AFTER dotenv.config() has run
console.log('DEBUG: SMTP_USER from .env (After dotenv.config()):', process.env.SMTP_USER);
console.log('DEBUG: SMTP_PASS from .env (After dotenv.config()):', process.env.SMTP_PASS ? '********' : 'NOT SET');
// ----------------------------------------------------
// DEBUGGING ADDITIONS: END
// ----------------------------------------------------


import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import userRoutes from './routes/users.js';
import feedbackRoutes from './routes/feedback.js';

import { auth } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ CORS setup for localhost origins
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        // Or requests from localhost on any port
        if (!origin || /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
};
app.use(cors(corsOptions));

// ✅ Middleware setup
app.use(helmet());
app.use(express.json());

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}

// ✨ NEW: Middleware to add Cross-Origin-Resource-Policy header for static files
// This must come BEFORE the express.static middleware for /uploads
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

// ✅ Validate required environment variables
// These checks should happen after dotenv.config()
if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    console.error('Missing required environment variables (MONGODB_URI or JWT_SECRET)');
    process.exit(1);
}

// ✅ MongoDB connection
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