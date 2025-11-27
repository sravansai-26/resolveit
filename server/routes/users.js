// routes/users.js

import express from 'express';
import multer from 'multer';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js'; 
import streamifier from 'streamifier'; // Required for buffer-to-stream upload

const router = express.Router();

// -----------------------------------------------------------------------
// ✅ STEP 1: Multer Memory Storage Configuration
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

// Helper to pick allowed user fields for update (Cleaned up)
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
// ✅ REFINED HELPER: Cloudinary Deletion
// Extracts public ID from the URL and includes the folder prefix.
// -----------------------------------------------------------------------
const getPublicIdFromUrl = (url) => {
    // Splits URL by '/', finds the part after 'upload/', and removes file extension/version
    const regex = /\/v\d+\/resolveit_users\/(.+)\.\w+$/;
    const match = url.match(regex);
    if (match && match[1]) {
        // Returns "resolveit_users/my_image_id"
        return `resolveit_users/${match[1]}`;
    }
    return null;
};

const deleteOldAvatar = async (avatarUrl) => {
    // Only attempt deletion if the URL looks like a Cloudinary URL
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
// ✅ NEW HELPER: Cloudinary Uploader (Stream method)
// -----------------------------------------------------------------------
const uploadToCloudinary = (file) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "resolveit_users",
                resource_type: "image", // Avatar is always an image
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


// GET user profile (Unchanged)
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.json({ success: true, data: user });
  } catch (error) {
    console.error('Fetch profile error:', error);
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
});

// Middleware wrapper for multer error handling on avatar upload (Unchanged)
const uploadAvatar = upload.single('avatar');

// -----------------------------------------------------------------------
// ✅ STEP 3 & 4: PUT update issue (Cloudinary Upload Logic)
// -----------------------------------------------------------------------
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
      const user = await User.findById(req.user._id); 

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.file) {
        // A. Delete old avatar from Cloudinary
        if (user.avatar) {
          await deleteOldAvatar(user.avatar); // Attempt to delete previous avatar
        }

        // B. Upload new file to Cloudinary
        const newAvatarUrl = await uploadToCloudinary(req.file);
        
        // C. Save the permanent Cloudinary URL to the database
        updates.avatar = newAvatarUrl;
      } else if (updates.avatar === '') {
          // Special case: Frontend intentionally cleared the avatar field (optional feature)
          // If the avatar field is set to an empty string in updates and no new file was uploaded,
          // it means the user wants to remove their current avatar.
          if (user.avatar) {
              await deleteOldAvatar(user.avatar);
          }
          updates.avatar = ''; // Save an empty string in the DB
      }


      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      res.json({ success: true, data: updatedUser });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Error updating profile' });
    }
  }
);

export default router;