// server/middleware/auth.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to verify a JWT token from the Authorization header and attach the user to the request object.
 * This function protects all subsequent routes it is applied to.
 */
export const protect = async (req, res, next) => { 
    try {
        // 1. Get Authorization header (Case-insensitive check)
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Authorization token missing or malformed. Please log in.' });
        }

        // 2. Extract token
        const token = authHeader.replace(/^Bearer\s+/i, '').trim();

        // 3. Verify token
        let decoded;
        try {
            // Assumes process.env.JWT_SECRET is correctly set on Render and in .env
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
            }
            return res.status(401).json({ success: false, message: 'Invalid token. Please authenticate.' });
        }

        // 4. Fetch user by decoded user ID
        // Note: Using findById, but explicitly remove the password field from the Mongoose object.
        const user = await User.findById(decoded.userId); 
        
        if (!user) {
            return res.status(401).json({ success: false, message: 'User not found or credentials invalid.' });
        }

        // 5. Attach user object to the request for controller access
        // Use the raw Mongoose document for consistency in subsequent DB operations
        req.user = user; 

        // 6. Continue to next middleware/controller
        next();
    } catch (error) {
        console.error('Auth middleware error:', error.message || error);
        // General fallback for unexpected authentication failure
        res.status(401).json({ success: false, message: 'Authentication process failed.' }); 
    }
};

// Exporting as 'auth' for easy import consistency across your routes files
export const auth = protect;