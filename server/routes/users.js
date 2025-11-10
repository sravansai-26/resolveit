import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url'; // CORRECTED LINE HERE
import User from '../models/User.js';
import { auth } from '../middleware/auth.js';
import fs from 'fs';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure uploads folder exists
const uploadsDir = join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Multer config for avatar upload
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadsDir);
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

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

// GET user profile
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

// Middleware wrapper for multer error handling on avatar upload
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

      if (req.file) {
        const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
        updates.avatar = avatarUrl;
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        updates,
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.json({ success: true, data: user });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Error updating profile' });
    }
  }
);

export default router;