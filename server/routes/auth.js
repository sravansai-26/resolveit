// routes/auth.js - COMPLETE FIXED VERSION WITH DEBUG LOGS + FORGOT/RESET PASSWORD
import express from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
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
// FORGOT PASSWORD
// =========================
router.post("/forgot-password", async (req, res) => {
  console.log("\n🔵 POST /api/auth/forgot-password - Password reset request");
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      console.warn("⚠️ Forgot Password: User not found:", email);
      return res.status(404).json({
        success: false,
        message: "No account found with that email address.",
      });
    }

    // 1. Generate Reset Token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 Hour expiry
    await user.save();

    // 2. Setup Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // 3. Define Link (Uses CLIENT_URL from .env)
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    const mailOptions = {
      from: `"ResolveIt Support" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: 'ResolveIt - Password Reset Request',
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px; margin: auto;">
          <h2 style="color: #2563eb; text-align: center;">Password Reset Request</h2>
          <p>Hi ${user.firstName},</p>
          <p>You requested a password reset for your ResolveIt account. Please click the button below to set a new password. This link is valid for 1 hour.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="font-size: 0.8em; color: #666;">If you did not request this, please ignore this email. Your password will remain unchanged.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #999; text-align: center;">Developed by <b>LYFSpot</b></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("✅ Reset email sent successfully to:", email);
    res.json({ success: true, message: "A password reset link has been sent to your email." });

  } catch (err) {
    console.error("❌ Forgot Password error:", err);
    res.status(500).json({ success: false, message: "Failed to send reset email. Try again later." });
  }
});

// =========================
// RESET PASSWORD
// =========================
router.post("/reset-password/:token", async (req, res) => {
  console.log("\n🔵 POST /api/auth/reset-password - Password update attempt");
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() } 
    });

    if (!user) {
      console.warn("⚠️ Reset Password: Token invalid or expired");
      return res.status(400).json({ 
        success: false, 
        message: "The reset link is invalid or has expired." 
      });
    }

    // Update password (User model .pre('save') hook hashes this)
    user.password = password; 
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    console.log("✅ Password successfully reset for:", user.email);
    res.json({ success: true, message: "Password reset successful! You can now log in with your new password." });

  } catch (err) {
    console.error("❌ Reset Password error:", err);
    res.status(500).json({ success: false, message: "Internal server error during password reset." });
  }
});

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

  const fbAdmin = admin.default || admin;

  if (!fbAdmin.apps || !fbAdmin.apps.length) {
    console.error("❌ Firebase Admin SDK NOT initialized");
    return res.status(500).json({
      success: false,
      message: "Server Error: Google Auth service unavailable",
    });
  }

  try {
    const decoded = await fbAdmin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decoded;

    console.log("✅ Firebase token verified. Email:", email);

    let user = await User.findOne({ email });

    if (!user) {
      console.log("🔵 User not found, creating new Google user...");

      const fullName = name || "Google User";
      const nameParts = fullName.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || "User";

      user = new User({
        email,
        firstName,
        lastName,
        avatar: picture || '',
        phone: "Not provided",
        address: "Not provided",
        bio: "Signed up via Google",
        password: undefined, 
      });

      await user.save();
    }

    const { token, expiresAt } = generateToken(user._id);

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
  return res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;