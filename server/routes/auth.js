import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';

const router = express.Router();
const JWT_EXPIRES_IN = '1h';

// Helper to pick allowed fields from req.body for user creation
const pickUserFields = (body) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  email: body.email,
  password: body.password,
  phone: body.phone,
  address: body.address,
  bio: body.bio || '',
  avatar: body.avatar || ''
});

// Middleware for validating registration input
const validateRegister = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('address').optional().trim(),
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
  const expiresInSeconds = 60 * 60; // 1 hour
  // --- ADDED CONSOLE LOG HERE ---
  console.log('Auth Routes JWT_SECRET (Signing):', process.env.JWT_SECRET);
  // --- END ADDED CONSOLE LOG ---
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });

  const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return { token, expiryTimestamp };
};

// Register route
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

    const { email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
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
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          bio: user.bio,
          avatar: user.avatar
        }
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

// Login route
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
        user: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          address: user.address,
          bio: user.bio,
          avatar: user.avatar
        }
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

export default router;