// routes/auth.js - COMPLETE FIXED VERSION WITH DEBUG LOGS

import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
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
  if (!JWT_SECRET) {
    console.error("❌ JWT_SECRET is not defined in environment variables");
    throw new Error("JWT_SECRET is not defined");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  console.log("✅ JWT token generated for user:", userId);

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
  console.log("\n🔵 POST /api/auth/register - Registration attempt");
  console.log("📧 Email:", req.body.email);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("⚠️ Validation failed:", errors.array());
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
      console.warn("⚠️ User already exists:", email);
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const userData = pickUserFields(req.body);

    console.log("🔵 Creating new user...");
    const user = new User(userData);
    await user.save();

    console.log("✅ User saved to database:", user._id);

    const { token, expiresAt } = generateToken(user._id);

    console.log("✅ Registration successful for:", user.email);
    console.log("🎫 Token generated, expires at:", new Date(expiresAt * 1000).toISOString());

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
    console.error("❌ Registration error:", err);
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
  console.log("\n🔵 POST /api/auth/login - Login attempt");
  console.log("📧 Email:", req.body.email);

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("⚠️ Validation failed:", errors.array());
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    console.log("🔵 Searching for user in database...");
    const user = await User.findOne({ email });

    if (!user) {
      console.warn("⚠️ User not found:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ User found:", user._id);

    // Google accounts have NO password
    if (!user.password) {
      console.warn("⚠️ User has no password (Google account):", email);
      return res.status(403).json({
        success: false,
        message: "This account was created with Google Sign-In. Use Google login instead.",
      });
    }

    console.log("🔵 Verifying password...");
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn("⚠️ Password mismatch for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    console.log("✅ Password verified");

    const { token, expiresAt } = generateToken(user._id);

    console.log("✅ Login successful for:", user.email);
    console.log("🎫 Token generated, expires at:", new Date(expiresAt * 1000).toISOString());

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
    console.error("❌ Login error:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
});

// =========================
// GOOGLE LOGIN / SIGNUP
// =========================
router.post("/google", async (req, res) => {
  console.log("\n🔵 POST /api/auth/google - Google authentication attempt");

  const { idToken } = req.body;

  if (!idToken) {
    console.warn("⚠️ Missing Firebase ID token");
    return res.status(400).json({
      success: false,
      message: "Missing Firebase ID token",
    });
  }

  console.log("🔵 Firebase ID token received (length:", idToken.length, ")");

  // Get Firebase Admin instance
  const fbAdmin = admin.default || admin;

  // Check if Admin SDK is initialized
  if (!fbAdmin.apps || !fbAdmin.apps.length) {
    console.error("❌ Firebase Admin SDK NOT initialized");
    console.error("❌ Check FIREBASE_SERVICE_ACCOUNT_KEY environment variable");
    return res.status(500).json({
      success: false,
      message: "Server Error: Google Auth service unavailable",
    });
  }

  console.log("✅ Firebase Admin SDK is initialized");

  try {
    console.log("🔵 Verifying Firebase ID token...");

    // Verify the Firebase ID token
    const decoded = await fbAdmin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decoded;

    console.log("✅ Firebase token verified successfully");
    console.log("📧 Email:", email);
    console.log("👤 Name:", name);

    console.log("🔵 Checking if user exists in database...");
    let user = await User.findOne({ email });

    // Create new user if doesn't exist
    if (!user) {
      console.log("🔵 User not found, creating new user...");

      const fullName = name || "Google User";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "User";

      console.log("👤 First Name:", firstName);
      console.log("👤 Last Name:", lastName);

      user = new User({
        email,
        firstName,
        lastName,
        avatar: picture || '',
        phone: "Not provided",
        address: "Not provided",
        bio: "Signed up via Google",
        password: undefined, // No password for Google accounts
      });

      await user.save();
      console.log("✅ New Google user created and saved:", user._id);
    } else {
      console.log("✅ Existing user found:", user._id);
    }

    // Generate JWT token
    const { token, expiresAt } = generateToken(user._id);

    console.log("✅ Google authentication successful for:", user.email);
    console.log("🎫 Token generated, expires at:", new Date(expiresAt * 1000).toISOString());

    return res.json({
      success: true,
      message: "Google Sign-In successful",
      data: {
        token,
        expiresAt,
        user: user.toJSON(),
      },
    });

  } catch (err) {
    console.error("❌ Google token verification error:", err.message);
    console.error("❌ Full error:", err);
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
  console.log("🔵 POST /api/auth/logout - Logout request");
  console.log("✅ Logout acknowledged (client will clear token)");

  return res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;