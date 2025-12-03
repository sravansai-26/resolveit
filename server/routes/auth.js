// routes/auth.js

import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth.js'; 
// NOTE: Assuming your firebaseAdmin.js file uses 'export default admin', 
// the correct import syntax should be: import admin from '../config/firebaseAdmin.js';
// However, since you provided 'import * as admin from...' which worked initially, 
// we'll stick to that style to avoid breaking the module system again.
import * as admin from '../config/firebaseAdmin.js'; 

const router = express.Router();

// Get the JWT secret and expiration from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h'; // Matches your current setting

// Helper to calculate expiry time in seconds (as expected by client)
const getExpiryTimestamp = () => {
    return Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour in seconds
};

// Helper to pick allowed fields from req.body for user creation
const pickUserFields = (body) => ({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: body.password,
    phone: body.phone,
    address: body.address,
    bio: body.bio, 
    avatar: body.avatar
});

// Middleware for validating registration input
const validateRegister = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'), 
    body('address').trim().notEmpty().withMessage('Address is required'),
    body('bio').optional().trim(),
    body('avatar').optional().trim()
];

// Middleware for validating login input
const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Helper to generate JWT token and expiry timestamp
const generateToken = (userId) => {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.");
    
    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });

    const expiryTimestamp = getExpiryTimestamp();

    return { token, expiryTimestamp };
};

// ======================================================================
// 1. REGISTER (/api/auth/register)
// ======================================================================
router.post('/register', validateRegister, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ 
                success: false,
                message: 'User already exists with this email'
            });
        }

        const userData = pickUserFields(req.body); 
        const user = new User(userData);
        await user.save();

        const { token, expiryTimestamp } = generateToken(user._id);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                token,
                expiresAt: expiryTimestamp,
                user: user.toJSON() 
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during registration'
        });
    }
});

// ======================================================================
// 2. LOGIN (/api/auth/login)
// ======================================================================
// ⚠️ PRODUCTION WARNING: Implement a rate limiting middleware here (e.g., express-rate-limit)
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const { token, expiryTimestamp } = generateToken(user._id);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                expiresAt: expiryTimestamp,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error during login'
        });
    }
});


// ======================================================================
// 3. GET CURRENT USER PROFILE (/api/auth/me)
// 🟢 FIX: Uses the correctly imported 'auth' middleware
// ======================================================================
router.get('/me', auth, async (req, res) => {
    try {
        // req.user is set by auth middleware
        const user = await User.findById(req.user.userId); 

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        // Return only the token-verified user data
        res.json({
            success: true,
            user: user.toJSON() // Use toJSON() for consistency
        });

    } catch (error) {
        console.error('Me route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ======================================================================
// 4. GOOGLE AUTHENTICATION (/api/auth/google) 🚀 NEW ROUTE
// Handles both Google Sign-Up and Sign-In using Firebase Token Verification
// ======================================================================
router.post('/google', async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Missing Firebase ID token.' });
    }

    // Check if Firebase Admin SDK is initialized based on the imported 'admin' object
    // If you used 'import * as admin', you must access the core object inside the namespace
    const fbAdmin = admin.default || admin;

    if (!fbAdmin.apps.length) { 
        console.error("Firebase Admin SDK not initialized. Check FIREBASE_SERVICE_ACCOUNT variable.");
        return res.status(500).json({ 
            success: false, 
            message: 'Server Error: Google Auth service is unavailable.' 
        });
    }

    try {
        // 1. Verify the ID Token with Firebase Admin SDK 
        const decodedToken = await fbAdmin.auth().verifyIdToken(idToken);
        const { email, name, picture } = decodedToken;

        // 2. Check if user exists in MongoDB
        let user = await User.findOne({ email });

        if (!user) {
            // 🛑 CRASH FIX: Ensure 'name' is not null/undefined before manipulating it.
            const userName = name || 'Google User';
            const nameParts = userName.split(' ');
            
            // 3. NEW USER (Sign-Up): Create a new user record using Google data
            user = new User({
                email,
                // Safely assign first name or default to 'Google'
                firstName: nameParts[0] || 'Google', 
                // Safely assign last name or default to 'User'
                lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User',
                avatar: picture, 
            });
            await user.save();
        }
        // If user exists, they are signed in.

        // 4. Issue your existing application JWT
        const { token, expiryTimestamp } = generateToken(user._id);

        // 5. Send your custom JWT back to the client
        res.status(200).json({ 
            success: true, 
            message: 'Google Sign-In successful!', 
            data: {
                token,
                expiresAt: expiryTimestamp,
                user: user.toJSON() // Include user data in response
            }
        });

    } catch (error) {
        // Catches errors like invalid, expired, or revoked tokens
        console.error("Firebase Token Verification Error:", error.message);
        res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token.' });
    }
});

// ======================================================================
// 5. LOGOUT (/api/auth/logout) 🚀 NEW ROUTE
// Clears server-side session cookies (if used)
// ======================================================================
router.post('/logout', (req, res) => {
    // If you are using HTTP-only cookies to store the JWT:
    // res.clearCookie('token'); 
    
    // This endpoint primarily signals success back to the client.
    res.status(200).json({ success: true, message: 'Logout successful' });
});


export default router;