// routes/auth.js - FULLY FIXED VERSION

import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth.js'; 
import * as admin from '../config/firebaseAdmin.js'; 

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d'; 

const getExpiryTimestamp = () => {
    return Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
};

const pickUserFields = (body) => ({
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    password: body.password,
    phone: body.phone || 'Not provided',
    address: body.address || 'Not provided',
    bio: body.bio, 
    avatar: body.avatar
});

const validateRegister = [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional().trim(),
    body('address').optional().trim(),
    body('bio').optional().trim(),
    body('avatar').optional().trim()
];

const validateLogin = [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

const generateToken = (userId) => {
    if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined.");
    
    const token = jwt.sign({ userId }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });

    const expiryTimestamp = getExpiryTimestamp();

    return { token, expiryTimestamp };
};

// ✅ 1. REGISTER - FIXED validation for optional fields
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

// ✅ 2. LOGIN
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

// ✅ 3. PROFILE - FIXED: req.user._id (matches new middleware)
router.get('/me', auth, async (req, res) => {
    try {
        // ✅ FIXED: Now uses req.user._id from middleware
        const user = await User.findById(req.user._id).select('-password'); 

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            user: user.toJSON()
        });

    } catch (error) {
        console.error('Me route error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// ✅ 4. GOOGLE LOGIN - FIXED response structure + defaults
router.post('/google', async (req, res) => {
    const { idToken } = req.body;
    
    if (!idToken) {
        return res.status(400).json({ success: false, message: 'Missing Firebase ID token.' });
    }

    const fbAdmin = admin.default || admin;

    if (!fbAdmin.apps.length) { 
        console.error("Firebase Admin SDK not initialized.");
        return res.status(500).json({ 
            success: false, 
            message: 'Server Error: Google Auth service unavailable.' 
        });
    }

    try {
        const decodedToken = await fbAdmin.auth().verifyIdToken(idToken);
        const { email, name, picture } = decodedToken;

        let user = await User.findOne({ email });

        if (!user) {
            const userName = name || 'Google User';
            const nameParts = userName.split(' ');

            user = new User({
                email,
                firstName: nameParts[0] || 'Google',
                lastName: nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User',
                avatar: picture, 
                phone: 'Not provided',
                address: 'Not provided',
                password: 'google-auth',
                bio: ''
            });
            await user.save();
        }

        const { token, expiryTimestamp } = generateToken(user._id);

        res.status(200).json({ 
            success: true, 
            message: 'Google Sign-In successful!', 
            data: {
                token,
                expiresAt: expiryTimestamp,
                user: user.toJSON()
            }
        });

    } catch (error) {
        console.error("Firebase Token Verification Error:", error.message);
        res.status(401).json({ success: false, message: 'Unauthorized: Invalid or expired token.' });
    }
});

// ✅ 5. LOGOUT
router.post('/logout', (req, res) => {
    res.status(200).json({ success: true, message: 'Logout successful' });
});

export default router;
