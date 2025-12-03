// index.js

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 🟢 CRITICAL FIX: Use the simple, direct 'dotenv/config' import 
//    This ensures all variables are loaded into process.env before other imports or execution.
import 'dotenv/config'; 

// --- CONFIGURATION LOADING ---
// NOTE: We keep these for other file path operations (like media uploads), but they are no longer used for dotenv.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- ROUTE IMPORTS ---
import authRoutes from './routes/auth.js';
import issueRoutes from './routes/issues.js';
import userRoutes from './routes/users.js';
import feedbackRoutes from './routes/feedback.js';

const app = express();
// NOTE: The process.env.PORT is now guaranteed to be loaded here.
const PORT = process.env.PORT || 5000; 

// ------------------------------------------------------------------
// CORS Configuration for Deployment Stability
// ------------------------------------------------------------------

const corsOptions = {
    // Universal wildcard is suitable for decoupled API access (Vercel, mobile, etc.)
    origin: '*', 
    credentials: true, 
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204
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