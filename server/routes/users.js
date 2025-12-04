// routes/users.js - FIXED VERSION

import express from 'express';
import multer from 'multer';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js'; 
import streamifier from 'streamifier'; 

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and GIF images allowed'));
    }
  }
});

const pickUserFields = (body) => {
  const allowed = ['firstName', 'lastName', 'phone', 'address', 'bio'];
  const updates = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      updates[key] = body[key];
    }
  }
  return updates;
};

const getPublicIdFromUrl = (url) => {
  const regex = /\/v\d+\/resolveit_users\/(.+)\.\w+$/;
  const match = url.match(regex);
  return match ? `resolveit_users/${match[1]}` : null;
};

const deleteOldAvatar = async (avatarUrl) => {
  if (avatarUrl && avatarUrl.includes('cloudinary')) {
    const publicId = getPublicIdFromUrl(avatarUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId).catch(err => {
        console.warn("Failed to delete old avatar:", publicId, err);
      });
    }
  }
};

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

const uploadAvatar = upload.single('avatar');

router.put(
  '/profile',
  auth,
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const updates = pickUserFields(req.body);
      // ✅ FIXED: req.user.userId → req.user._id
      let user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      let newAvatarUrl = user.avatar; 

      if (req.file) {
        if (user.avatar) {
          await deleteOldAvatar(user.avatar);
        }
        newAvatarUrl = await uploadToCloudinary(req.file);
      } else if (updates.avatar === '') {
        if (user.avatar) {
          await deleteOldAvatar(user.avatar);
        }
        newAvatarUrl = '';
      }

      Object.assign(user, updates);
      user.avatar = newAvatarUrl;
      await user.save();

      res.json({ success: true, data: user.toJSON() });
      
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Error updating profile' });
    }
  }
);

export default router;
