// server/middleware/auth.js - FIXED VERSION

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => { 
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token' });
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const user = await User.findById(decoded.userId).select('-password'); 
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // ✅ FIXED: req.user._id instead of req.user.userId
    req.user = user;  // Full user object with _id directly accessible

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, message: 'Auth failed' });
  }
};

export const auth = protect;
