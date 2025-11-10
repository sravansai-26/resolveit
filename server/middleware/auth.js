import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const auth = async (req, res, next) => {
 try {
 // Get Authorization header
 const authHeader = req.header('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
 return res.status(401).json({ message: 'Authorization header missing or malformed' });
}

// Extract token
const token = authHeader.replace(/^Bearer\s+/i, '').trim();

// Verify token
 let decoded;
 try {
// --- ADDED CONSOLE LOG HERE ---
console.log('Auth Middleware JWT_SECRET (Verifying):', process.env.JWT_SECRET)
// --- END ADDED CONSOLE LOG ---
decoded = jwt.verify(token, process.env.JWT_SECRET);
 } catch (err) {
if (err.name === 'TokenExpiredError') {
 return res.status(401).json({ message: 'Token expired. Please login again.' });
}
return res.status(401).json({ message: 'Invalid token. Please authenticate.' });
}

// Fetch user by decoded user ID
 const user = await User.findById(decoded.userId).select('-password');
 if (!user) {
 return res.status(401).json({ message: 'User not found. Please authenticate.' });
 }

// Attach user object to the request
req.user = user;

 // Continue to next middleware/controller
 next();
 } catch (error) {
console.error('Auth middleware error:', error.message || error);
res.status(500).json({ message: 'Internal server error during authentication' });
 }
};