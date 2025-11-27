// server/middleware/auth.js

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => { // Renamed export to 'protect' for common convention
 try {
 // Get Authorization header
 const authHeader = req.header('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
 return res.status(401).json({ message: 'Authorization header missing or malformed. Please log in.' });
}

// Extract token
const token = authHeader.replace(/^Bearer\s+/i, '').trim();

// Verify token
 let decoded;
 try {
decoded = jwt.verify(token, process.env.JWT_SECRET);
 } catch (err) {
if (err.name === 'TokenExpiredError') {
 return res.status(401).json({ message: 'Token expired. Please login again.' });
}
return res.status(401).json({ message: 'Invalid token. Please authenticate.' });
}

// Fetch user by decoded user ID
// Assuming the JWT payload contains { userId: '...' }
 const user = await User.findById(decoded.userId).select('-password'); 
 if (!user) {
 return res.status(401).json({ message: 'User not found or credentials invalid.' });
 }

// Attach user object to the request
req.user = user;

 // Continue to next middleware/controller
 next();
 } catch (error) {
console.error('Auth middleware error:', error.message || error);
// Changed to 401 as a general authentication failure fallback
res.status(401).json({ message: 'Authentication failed.' }); 
 }
};

// Renaming for consistency across your project
export const auth = protect;