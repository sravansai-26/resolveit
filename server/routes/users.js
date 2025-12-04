// routes/users.js – FINAL FIXED VERSION (GET + PUT profile working)

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

// Allow only specific fields to be updated
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
  const match = url.match(/\/v\d+\/resolveit_users\/(.+?)\.\w+$/);
  return match ? `resolveit_users/${match[1]}` : null;
};

// Delete previous avatar from Cloudinary
const deleteOldAvatar = async (avatarUrl) => {
  if (!avatarUrl || !avatarUrl.includes("cloudinary")) return;

  const publicId = getPublicIdFromUrl(avatarUrl);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn("⚠️ Failed to delete old avatar:", publicId, err);
  }
};

// Upload an image file to Cloudinary
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "resolveit_users",
        resource_type: "image"
      },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};


/* ---------------------------------------------------------
   🟢 GET /api/users/profile  (CRITICAL — frontend calls this!)
--------------------------------------------------------- */
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: user.toJSON()
    });

  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching profile"
    });
  }
});


/* ---------------------------------------------------------
   🟢 PUT /api/users/profile  (Update profile + avatar)
--------------------------------------------------------- */
router.put(
  "/profile",
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
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      const updates = pickUserFields(req.body);
      let avatarUrl = user.avatar;

      // CASE 1: Uploading new avatar file
      if (req.file) {
        if (avatarUrl) await deleteOldAvatar(avatarUrl);
        avatarUrl = await uploadToCloudinary(req.file);
      }

      // CASE 2: Clearing avatar (sending empty string)
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
