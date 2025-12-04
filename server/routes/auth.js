// routes/auth.js - FULLY FIXED & STABLE VERSION

import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth.js';
import * as admin from '../config/firebaseAdmin.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

// =========================
// TOKEN HELPERS
// =========================
const getExpiryTimestamp = () =>
  Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

const generateToken = (userId) => {
  if (!JWT_SECRET) throw new Error("JWT_SECRET is not defined");

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  return { token, expiresAt: getExpiryTimestamp() };
};

const pickUserFields = (body) => ({
  firstName: body.firstName,
  lastName: body.lastName,
  email: body.email,
  password: body.password,
  phone: body.phone || 'Not provided',
  address: body.address || 'Not provided',
  bio: body.bio || '',
  avatar: body.avatar || ''
});

// =========================
// VALIDATIONS
// =========================
const validateRegister = [
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("phone").optional().trim(),
  body("address").optional().trim(),
  body("bio").optional().trim(),
  body("avatar").optional().trim()
];

const validateLogin = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required")
];

// =========================
// REGISTER
// =========================
router.post("/register", validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const userData = pickUserFields(req.body);

    const user = new User(userData);
    await user.save();

    const { token, expiresAt } = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        token,
        expiresAt,
        user: user.toJSON(),
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error during registration",
    });
  }
});

// =========================
// LOGIN
// =========================
router.post("/login", validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Google accounts have NO password
    if (!user.password) {
      return res.status(403).json({
        success: false,
        message: "This account was created with Google Sign-In. Use Google login instead.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const { token, expiresAt } = generateToken(user._id);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        expiresAt,
        user: user.toJSON(),
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
});

// =========================
// GET PROFILE (/me)
// =========================
router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Prevent Render caching
    res.set("Cache-Control", "no-store");

    return res.json({
      success: true,
      user: user.toJSON(),
    });
  } catch (err) {
    console.error("Me route error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// =========================
// GOOGLE LOGIN / SIGNUP
// =========================
router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Missing Firebase ID token",
    });
  }

  const fbAdmin = admin.default || admin;

  if (!fbAdmin.apps.length) {
    return res.status(500).json({
      success: false,
      message: "Server Error: Google Auth service unavailable",
    });
  }

  try {
    const decoded = await fbAdmin.auth().verifyIdToken(idToken);

    const { email, name, picture } = decoded;

    let user = await User.findOne({ email });

    if (!user) {
      const [firstName, ...rest] = (name || "Google User").split(" ");

      user = new User({
        email,
        firstName,
        lastName: rest.join(" ") || "User",
        avatar: picture,
        phone: "Not provided",
        address: "Not provided",
        bio: "",
        password: undefined, // IMPORTANT
      });

      await user.save();
    }

    const { token, expiresAt } = generateToken(user._id);

    return res.json({
      success: true,
      message: "Google Sign-In successful!",
      data: {
        token,
        expiresAt,
        user: user.toJSON(),
      },
    });
  } catch (err) {
    console.error("Google token error:", err);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid or expired Google token",
    });
  }
});

// =========================
// LOGOUT
// =========================
router.post("/logout", (req, res) => {
  return res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;
