// routes/users.js – FINAL WORKING VERSION

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
    allowed.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error("Only JPG, PNG, and GIF allowed"));
  },
});

const uploadAvatar = upload.single("avatar");

/* ---------------------------------------------------------
   UTIL HELPERS
--------------------------------------------------------- */

// Allow only specific updatable fields
const pickUserFields = (body) => {
  const allowed = ["firstName", "lastName", "phone", "address", "bio"];
  const update = {};

  allowed.forEach((k) => {
    if (body[k] !== undefined) update[k] = body[k];
  });

  return update;
};

// Extract Cloudinary public_id
const getPublicIdFromUrl = (url) => {
  const match = url.match(/\/v\d+\/resolveit_users\/(.+?)\.\w+$/);
  return match ? `resolveit_users/${match[1]}` : null;
};

// Delete old avatar
const deleteOldAvatar = async (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.includes("cloudinary")) return;

  const publicId = getPublicIdFromUrl(avatarUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("Failed to delete old avatar:", err);
  }
};

// Upload new avatar
const uploadToCloudinary = (file) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "resolveit_users", resource_type: "image" },
      (error, result) => (result ? resolve(result.secure_url) : reject(error))
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });

/* =========================================================
   🔥 THE ROUTES FRONTEND ACTUALLY CALLS
   GET /api/users/me
   PUT /api/users/me
========================================================= */

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    console.error("GET /me error:", err);
    res.status(500).json({ success: false, message: "Failed to load profile" });
  }
});

router.put(
  "/me",
  auth,
  (req, res, next) =>
    uploadAvatar(req, res, (err) =>
      err
        ? res.status(400).json({ success: false, message: err.message })
        : next()
    ),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);
      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const updates = pickUserFields(req.body);
      let avatarUrl = user.avatar;

      // Uploading new avatar
      if (req.file) {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = await uploadToCloudinary(req.file);
      }

      // Clearing avatar
      if (req.body.avatar === "") {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = "";
      }

      Object.assign(user, updates);
      user.avatar = avatarUrl;

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.toJSON(),
      });
    } catch (err) {
      console.error("PUT /me error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update profile" });
    }
  }
);

/* =========================================================
   LEGACY ROUTES (KEEPED FOR SAFETY)
========================================================= */

// GET /api/users/profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    console.error("GET /profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching profile" });
  }
});

// PUT /api/users/profile
router.put(
  "/profile",
  auth,
  (req, res, next) =>
    uploadAvatar(req, res, (err) =>
      err
        ? res.status(400).json({ success: false, message: err.message })
        : next()
    ),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user)
        return res
          .status(404)
          .json({ success: false, message: "User not found" });

      const updates = pickUserFields(req.body);
      let avatarUrl = user.avatar;

      if (req.file) {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = await uploadToCloudinary(req.file);
      }

      if (req.body.avatar === "") {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = "";
      }

      Object.assign(user, updates);
      user.avatar = avatarUrl;

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.toJSON(),
      });
    } catch (err) {
      console.error("PUT /profile error:", err);
      res
        .status(500)
        .json({ success: false, message: "Failed to update profile" });
    }
  }
);

export default router;
