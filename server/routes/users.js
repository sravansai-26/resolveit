import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path'; // Needed only if using local file system
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
// import fs from 'fs'; // REMOVED: No longer needed for file system operations
import cloudinary from '../config/cloudinary.js'; // ✅ NEW: Import Cloudinary config

const router = express.Router();
// Remove __filename and __dirname definitions if they are only for local 'uploads' checks
// const __filename = fileURLToPath(import.meta.url); 
// const __dirname = dirname(__filename); 

// -----------------------------------------------------------------------
// ✅ STEP 1: Remove Local Storage Setup (fs and path)
// We remove the old checks for the 'uploads' directory which is now obsolete.
// -----------------------------------------------------------------------

// Multer config for avatar upload
// -----------------------------------------------------------------------
// ✅ STEP 2: Replace Multer disk storage with Memory Storage
// Multer now stores the file buffer in memory, ready for Cloudinary.
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

// Helper to pick allowed user fields for update (Unchanged)
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
// ✅ NEW HELPER: Cloudinary Deletion
// -----------------------------------------------------------------------
const deleteOldAvatar = async (avatarUrl) => {
    // Only attempt deletion if the URL is a Cloudinary URL (i.e., not a default avatar)
    if (avatarUrl && avatarUrl.includes('cloudinary')) {
        // Example: https://res.cloudinary.com/resolveit_issues/image/upload/v123456789/my_image_id.jpg
        // We need: resolveit_users/my_image_id
        const urlParts = avatarUrl.split('/');
        // The public ID is the last part before the file extension
        const publicIdWithExtension = urlParts[urlParts.length - 1]; 
        const versionIndex = urlParts.findIndex(part => part.startsWith('v'));
        const prefix = versionIndex !== -1 ? urlParts[versionIndex + 1] : ''; // Gets the folder prefix

        // If the URL is in the correct format, delete it.
        if (prefix) {
            const publicId = prefix.split('.')[0]; // my_image_id (removing .jpg)
            
            // Assuming we store avatars in a 'resolveit_users' folder
            await cloudinary.uploader.destroy(`resolveit_users/${publicId}`).catch(err => {
                console.warn("Failed to delete old avatar from Cloudinary:", err);
            });
        }
    }
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
      const user = await User.findById(req.user._id); // Fetch user to get old avatar URL

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      if (req.file) {
        // A. Delete old avatar from Cloudinary
        if (user.avatar) {
          await deleteOldAvatar(user.avatar); // Attempt to delete previous avatar
        }

        // B. Upload new file to Cloudinary
        const b64 = Buffer.from(req.file.buffer).toString("base64");
        const dataURI = "data:" + req.file.mimetype + ";base64," + b64;
        const result = await cloudinary.uploader.upload(dataURI, {
          folder: "resolveit_users", // Store avatars in a separate folder
          resource_type: "image"
        });
        
        // C. Save the permanent Cloudinary URL to the database
        updates.avatar = result.secure_url;
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