// routes/users.js - COMPLETE FIXED VERSION WITH DEBUG LOGS

import express from "express";
import multer from "multer";
import User from "../models/User.js";
import { auth } from "../middleware/auth.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

const router = express.Router();

/* ---------------------------------------------------------
   MULTER (Memory Storage)
--------------------------------------------------------- */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    const allowed = ["image/jpeg", "image/png", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      console.log("✅ File type accepted:", file.mimetype);
      cb(null, true);
    } else {
      console.warn("⚠️ File type rejected:", file.mimetype);
      cb(new Error("Only JPG, PNG, and GIF allowed"));
    }
  },
});

const uploadAvatar = upload.single("avatar");

/* ---------------------------------------------------------
   UTIL HELPERS
--------------------------------------------------------- */
const pickUserFields = (body) => {
  const allowed = ["firstName", "lastName", "phone", "address", "bio"];
  const update = {};

  allowed.forEach((k) => {
    if (body[k] !== undefined) {
      update[k] = body[k];
      console.log(`🔵 Update field: ${k} =`, body[k]);
    }
  });

  return update;
};

const getPublicIdFromUrl = (url) => {
  const match = url.match(/\/v\d+\/resolveit_users\/(.+?)\.\w+$/);
  return match ? `resolveit_users/${match[1]}` : null;
};

const deleteOldAvatar = async (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.includes("cloudinary")) {
    console.log("🔵 No Cloudinary avatar to delete");
    return;
  }

  const publicId = getPublicIdFromUrl(avatarUrl);
  if (!publicId) {
    console.warn("⚠️ Could not extract public ID from:", avatarUrl);
    return;
  }

  try {
    console.log("🔵 Deleting old avatar from Cloudinary:", publicId);
    await cloudinary.uploader.destroy(publicId);
    console.log("✅ Old avatar deleted successfully");
  } catch (err) {
    console.error("❌ Failed to delete old avatar:", err.message);
  }
};

const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    console.log("🔵 Uploading avatar to Cloudinary...");

    const stream = cloudinary.uploader.upload_stream(
      { folder: "resolveit_users", resource_type: "image" },
      (error, result) => {
        if (result) {
          console.log("✅ Avatar uploaded to Cloudinary:", result.secure_url);
          resolve(result.secure_url);
        } else {
          console.error("❌ Cloudinary upload failed:", error);
          reject(error);
        }
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });

/* =========================================================
   PRIMARY ROUTES: /api/users/me
========================================================= */

// GET /api/users/me - Get current user profile
router.get("/me", auth, async (req, res) => {
  console.log("\n🔵 GET /api/users/me - Profile fetch request");
  console.log("🔵 Authenticated user ID:", req.user?._id);
  console.log("🔵 Authenticated user email:", req.user?.email);

  try {
    // 🛡️ Added -resetPasswordToken -resetPasswordExpires for security
    const user = await User.findById(req.user._id).select("-password -resetPasswordToken -resetPasswordExpires");

    if (!user) {
      console.error("❌ User not found in database for ID:", req.user._id);
      return res.status(404).json({ 
        success: false, 
        message: "User not found" 
      });
    }

    console.log("✅ User profile found:", user.email);
    console.log("✅ Profile data:", {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      address: user.address
    });

    res.json({ 
      success: true, 
      user: user.toJSON() 
    });
  } catch (err) {
    console.error("❌ GET /me error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to load profile" 
    });
  }
});

// PUT /api/users/me - Update current user profile
router.put(
  "/me",
  auth,
  (req, res, next) => {
    console.log("\n🔵 PUT /api/users/me - Profile update request");
    console.log("🔵 Authenticated user ID:", req.user?._id);

    uploadAvatar(req, res, (err) => {
      if (err) {
        console.error("❌ Multer error:", err.message);
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      console.log("🔵 Update request body:", req.body);
      console.log("🔵 File uploaded:", req.file ? "Yes" : "No");

      const user = await User.findById(req.user._id);
      
      if (!user) {
        console.error("❌ User not found in database for ID:", req.user._id);
        return res.status(404).json({ 
          success: false, 
          message: "User not found" 
        });
      }

      console.log("✅ User found, proceeding with update");

      const updates = pickUserFields(req.body);
      let avatarUrl = user.avatar;

      // Uploading new avatar
      if (req.file) {
        console.log("🔵 Processing new avatar upload...");
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = await uploadToCloudinary(req.file);
      }

      // Clearing avatar
      if (req.body.avatar === "") {
        console.log("🔵 Clearing avatar...");
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = "";
      }

      Object.assign(user, updates);
      user.avatar = avatarUrl;

      console.log("🔵 Saving updated user to database...");
      await user.save();

      console.log("✅ Profile updated successfully:", user.email);
      console.log("✅ Updated fields:", Object.keys(updates));

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.toJSON(),
      });
    } catch (err) {
      console.error("❌ PUT /me error:", err);
      res.status(500).json({ 
        success: false, 
        message: "Failed to update profile" 
      });
    }
  }
);

export default router;