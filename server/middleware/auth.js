// server/middleware/auth.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to verify a JWT token from the Authorization header and attach minimal user info.
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
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, message: 'Token expired. Please login again.' });
      }
      return res.status(401).json({ success: false, message: 'Invalid token. Please authenticate.' });
    }

    // 4. Fetch user by decoded user ID (optional, may speed up later usage)
    // Using select('-password') to exclude sensitive data
    const user = await User.findById(decoded.userId).select('-password'); 
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found or credentials invalid.' });
    }

    // 5. Attach minimal user info to request object consistent with frontend expectation
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      // add other fields you find necessary here for profile or authorization
    };

    // 6. Continue to next middleware/controller
    next();

  } catch (error) {
    console.error('Auth middleware error:', error.message || error);
    res.status(401).json({ success: false, message: 'Authentication process failed.' }); 
  }
};

// Exporting as 'auth' for easy import consistency
export const auth = protect;
