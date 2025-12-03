// routes/users.js

import express from 'express';
import multer from 'multer';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js'; 
import streamifier from 'streamifier'; 

const router = express.Router();

// -----------------------------------------------------------------------
// ✅ STEP 1: Multer Memory Storage Configuration (For Avatars)
// -----------------------------------------------------------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter(req, file, cb) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and GIF images are allowed'));
    }
  }
});

// Helper to pick allowed user fields for update
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

// -----------------------------------------------------------------------
// ✅ HELPER: Cloudinary Deletion for Avatars
// -----------------------------------------------------------------------
const getPublicIdFromUrl = (url) => {
    // Extracts "resolveit_users/my_image_id"
    const regex = /\/v\d+\/resolveit_users\/(.+)\.\w+$/;
    const match = url.match(regex);
    if (match && match[1]) {
        return `resolveit_users/${match[1]}`;
    }
    return null;
};

const deleteOldAvatar = async (avatarUrl) => {
    if (avatarUrl && avatarUrl.includes('cloudinary')) {
        const publicId = getPublicIdFromUrl(avatarUrl);
        
        if (publicId) {
            await cloudinary.uploader.destroy(publicId).catch(err => {
                console.warn("Failed to delete old avatar from Cloudinary:", publicId, err);
            });
        }
    }
};

// -----------------------------------------------------------------------
// ✅ HELPER: Cloudinary Uploader (Stream method for profile picture)
// -----------------------------------------------------------------------
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "resolveit_users",
                resource_type: "image",
            },
            (error, result) => {
                if (result) {
                    resolve(result.secure_url);
                } else {
                    reject(error);
                }
            }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
    });
};


// Middleware wrapper for multer error handling on avatar upload
const uploadAvatar = upload.single('avatar');


// -----------------------------------------------------------------------
// ✅ 1. GET user profile (FETCH) — used by AuthContext
// Endpoint: GET /api/users/profile
// -----------------------------------------------------------------------
router.get('/profile', auth, async (req, res) => {
  try {
    // Fetch user without explicitly selecting fields; the toJSON transform will remove 'password'
    const user = await User.findById(req.user._id); 
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // 🟢 CRITICAL FIX: Use user.toJSON() to include virtuals (fullName) and apply transforms
    res.json({ success: true, data: user.toJSON() }); 
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// -----------------------------------------------------------------------
// ✅ 2. PUT update profile (UPDATE) — used by EditProfile.tsx
// Endpoint: PUT /api/users/profile (Handles avatar upload)
// -----------------------------------------------------------------------
router.put(
  '/profile',
  auth,
  (req, res, next) => {
    // Handle multer upload errors here
    uploadAvatar(req, res, (err) => {
      if (err) {
        // Return clear error message for client display
        return res.status(400).json({ success: false, message: err.message });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const updates = pickUserFields(req.body);
      let user = await User.findById(req.user._id); 

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      
      let newAvatarUrl = user.avatar; 

      if (req.file) {
        // A. Delete old avatar from Cloudinary
        if (user.avatar) {
          await deleteOldAvatar(user.avatar);
        }

        // B. Upload new file to Cloudinary
        newAvatarUrl = await uploadToCloudinary(req.file);
      } else if (updates.avatar === '') {
          // Special case: Frontend intentionally cleared the avatar field (if supported)
          if (user.avatar) {
            await deleteOldAvatar(user.avatar);
          }
          newAvatarUrl = ''; // Clear the field
      }

      // 3. Apply general field updates
      Object.assign(user, updates);
      
      // 4. Update avatar field with the new URL or cleared state
      user.avatar = newAvatarUrl;
      
      await user.save(); // Use save() to apply pre-save middleware and run validators

      // 🟢 CRITICAL FIX: Use user.toJSON() for response consistency
      res.json({ success: true, data: user.toJSON() }); 
      
    } catch (error) {
      console.error('Update profile error:', error);
      // More specific error handling for validation errors should be added here
      res.status(500).json({ success: false, message: 'Error updating profile' });
    }
  }
);

export default router;