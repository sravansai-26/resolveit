// middleware/auth.js - COMPLETE FIXED VERSION WITH DEBUG LOGS

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
  console.log("\n🔒 AUTH MIDDLEWARE - Validating request");
  console.log("🔵 Request URL:", req.originalUrl);
  console.log("🔵 Request Method:", req.method);

  try {
    // Get authorization header
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      console.warn("⚠️ No Authorization header present");
      return res.status(401).json({ 
        success: false, 
        message: 'No token provided' 
      });
    }

    console.log("✅ Authorization header found");

    if (!authHeader.startsWith('Bearer ')) {
      console.warn("⚠️ Invalid Authorization header format (missing 'Bearer ')");
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }

    // Extract token
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      console.warn("⚠️ Empty token after Bearer prefix");
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format' 
      });
    }

    console.log("✅ Token extracted (length:", token.length, ")");

    // Verify JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error("❌ JWT_SECRET not found in environment variables");
      return res.status(500).json({
        success: false,
        message: 'Server configuration error'
      });
    }

    // Verify token
    let decoded;
    try {
      console.log("🔵 Verifying JWT token...");
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("✅ Token verified successfully");
      console.log("🔵 Decoded user ID:", decoded.userId);
    } catch (err) {
      console.error("❌ Token verification failed:", err.message);
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token expired - please login again' 
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Invalid token' 
        });
      }

      return res.status(401).json({ 
        success: false, 
        message: 'Token validation failed' 
      });
    }

    // Find user
    console.log("🔵 Fetching user from database...");
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      console.error("❌ User not found in database for ID:", decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: 'User not found - account may have been deleted' 
      });
    }

    console.log("✅ User found in database:", user.email);
    console.log("✅ User ID:", user._id);

    // Attach user to request
    req.user = user;
    
    console.log("✅ Authentication successful - proceeding to route handler");

    next();
  } catch (error) {
    console.error('❌ Auth middleware unexpected error:', error);
    res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Alternative export for compatibility
export const protect = auth;

export default auth;