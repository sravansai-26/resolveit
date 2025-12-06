import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import { auth } from '../middleware/auth.js';
// Assuming this imports the Firebase Admin SDK initialized instance
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
    // req.user is populated by the 'auth' middleware
    const user = req.user; 

    if (!user) {
      // Fallback error if auth middleware passed but req.user is null/undefined
      return res.status(401).json({ 
        success: false,
        message: "Authentication failed to retrieve user data.",
      });
    }

    // Prevent Render caching
    res.set("Cache-Control", "no-store");

    // Send the user object directly from the middleware (which already excludes password)
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
// GOOGLE LOGIN / SIGNUP - 🚀 THE FIX IS HERE 🚀
// =========================
router.post("/google", async (req, res) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Missing Firebase ID token",
    });
  }

  // --- 🚨 Server-side Firebase Admin Check (CRITICAL FOR DEPLOYMENT) 🚨 ---
  const fbAdmin = admin.default || admin;

  // Check if the Admin SDK was successfully initialized (often fails due to ENV vars)
  if (!fbAdmin.apps || !fbAdmin.apps.length) {
    console.error("Firebase Admin SDK NOT initialized. Check FIREBASE_SERVICE_ACCOUNT_KEY ENV.");
    return res.status(500).json({
      success: false,
      message: "Server Error: Google Auth service unavailable. Service account configuration failed.",
    });
  }
  // --- ----------------------------------------------------------------- ---

  try {
    const decoded = await fbAdmin.auth().verifyIdToken(idToken);
    // decoded will contain 'email', 'name', 'picture' etc.
    const { email, name, picture } = decoded;

    let user = await User.findOne({ email });

    // --- User Creation Logic (Hardened) ---
    if (!user) {
      // Use the full name if available, otherwise default
      const fullName = name || "Google User"; 
        
      // Split the name: first word is firstName, rest is lastName
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0];
        
      // Join the rest of the array, default to 'User' if only one name exists
      const lastName = nameParts.slice(1).join(" ") || "User"; 

      user = new User({
        email,
        firstName,
        lastName, // Use the extracted/defaulted value
        avatar: picture, // Use the profile picture URL
        phone: "Not provided",
        address: "Not provided",
        bio: "Signed up via Google.",
        password: undefined, 
      });

      await user.save();
    }

    // --- Success Response ---
    const { token, expiresAt } = generateToken(user._id);

    return res.json({
      success: true,
      message: "Google Sign-In successful!",
      data: { // This structure is necessary for the client to parse correctly
        token,
        expiresAt,
        user: user.toJSON(),
      },
    });

  } catch (err) {
    console.error("Google token verification or database error:", err);
    // If verification fails (common on deploy) or any other DB error
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Google token invalid or expired. Check server logs.",
    });
  }
});

// =========================
// LOGOUT
// =========================
router.post("/logout", (req, res) => {
  // Client handles clearing the JWT, server simply confirms.
  return res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;