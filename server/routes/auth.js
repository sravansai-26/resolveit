// routes/auth.js

import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js'; // 🟢 ASSUMED: We need a middleware file to protect routes

const router = express.Router();

// Get the JWT secret and expiration from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '1h'; // Matches your current setting

// Helper to calculate expiry time in seconds (as expected by client)
const getExpiryTimestamp = () => {
    return Math.floor(Date.now() / 1000) + (60 * 60); // 1 hour in seconds
};

// Helper to pick allowed fields from req.body for user creation
// Uses destructuring to safely pull required fields
const pickUserFields = (body) => ({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: body.password,
    phone: body.phone,
    address: body.address,
    bio: body.bio, // Allow bio/avatar, model handles defaults if missing
    avatar: body.avatar
});

// Middleware for validating registration input
const validateRegister = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    // Note: isMobilePhone() can be restrictive globally. Consider adding local validation if needed.
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

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ // 🟢 FIX: Use 409 Conflict status for resource clash
                success: false,
                message: 'User already exists with this email'
            });
        }

        // Create user using whitelisted fields
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
                // 🟢 CRITICAL FIX: Use user.toJSON() to ensure virtuals (fullName) and cleaned fields are returned
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
// to prevent brute-force attacks on passwords.
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
        // Use 401 for both email and password mismatch to prevent user enumeration
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
                // 🟢 CRITICAL FIX: Use user.toJSON() to ensure virtuals (fullName) and cleaned fields are returned
                user: user.toJSON() 
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
// 🟢 CRITICAL FIX for AuthContext/RequireAuth to validate token on refresh (Objective 3)
// ======================================================================
// This route is used by the client's AuthContext to check if a token is still valid.
router.get('/me', authMiddleware, async (req, res) => {
    try {
        // req.user is set by authMiddleware from the JWT payload
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


export default router;