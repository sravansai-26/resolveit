// routes/users.js - FINAL FIXED VERSION

import express from 'express';
import multer from 'multer';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';

const router = express.Router();

/* ---------------------------------------------------------
   MULTER (Memory Storage for Cloudinary Only)
--------------------------------------------------------- */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    const allowed = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPG, PNG, and GIF images allowed'));
  }
});

const uploadAvatar = upload.single('avatar');

/* ---------------------------------------------------------
   UTIL HELPERS
--------------------------------------------------------- */

// Only allow updating certain fields
const pickUserFields = (body) => {
  const allowed = ['firstName', 'lastName', 'phone', 'address', 'bio'];
  const updates = {};
  allowed.forEach((key) => {
    if (body[key] !== undefined) updates[key] = body[key];
  });
  return updates;
};

// Extract Cloudinary public_id from URL
const getPublicIdFromUrl = (url) => {
  // Supports e.g.:
  // https://res.cloudinary.com/demo/image/upload/v123456789/resolveit_users/abcd1234.jpg
  const match = url.match(/\/v\d+\/resolveit_users\/(.+?)\.\w+$/);
  return match ? `resolveit_users/${match[1]}` : null;
};

// Delete old avatar if exists
const deleteOldAvatar = async (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.includes('cloudinary')) return;

  const publicId = getPublicIdFromUrl(avatarUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("⚠ Could not delete old avatar:", publicId, err);
  }
};

// Upload new avatar to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "resolveit_users", resource_type: "image" },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

/* ---------------------------------------------------------
   ROUTE: UPDATE PROFILE
--------------------------------------------------------- */
router.put(
  '/profile',
  auth,
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || "Invalid file upload"
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      // Auth middleware now ensures req.user contains the FULL user object
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Collect updates for fields like name, phone, etc.
      const updates = pickUserFields(req.body);

      // Avatar logic
      let avatarUrl = user.avatar;

      // 🟢 CASE 1: Uploading a new avatar file
      if (req.file) {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = await uploadToCloudinary(req.file);
      }

      // 🟢 CASE 2: Request explicitly sets avatar to empty string → Remove avatar
      if (req.body.avatar === "") {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = "";
      }

      // Apply field updates
      Object.assign(user, updates);
      user.avatar = avatarUrl;

      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        data: user.toJSON()
      });

    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Error updating profile"
      });
    }
  }
);

export default router;
