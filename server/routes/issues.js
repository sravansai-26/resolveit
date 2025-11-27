import express from 'express';
import multer from 'multer';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Issue from '../models/Issue.js';
import { auth } from '../middleware/auth.js';
import { sendEmailToAuthority } from '../utils/email.js';
import cloudinary from '../config/cloudinary.js'; // ✅ NEW: Import Cloudinary config

const router = express.Router();

// --- REMOVE: fs, join, dirname, fileURLToPath as local storage is gone ---
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// -----------------------------------------------------------------------
// ✅ STEP 3: Replace Multer disk storage with Memory Storage
// Multer now stores the file buffer in memory, ready for Cloudinary.
// -----------------------------------------------------------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only images and videos allowed'));
    }
  }
});

// -----------------------------------------------------------------------
// ✅ NEW HELPER: Cloudinary Uploader
// -----------------------------------------------------------------------
const uploadToCloudinary = async (file) => {
    // Convert buffer to data URI base64 string
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = "data:" + file.mimetype + ";base64," + b64;
    
    const isVideo = file.mimetype.startsWith('video');

    const result = await cloudinary.uploader.upload(dataURI, {
        folder: "resolveit_issues",
        resource_type: isVideo ? "video" : "image"
    });
    return result.secure_url; // Return the permanent public URL
};


const pickIssueFields = (body) => ({
  title: body.title,
  description: body.description,
  category: body.category,
  location: body.location,
  status: body.status
});

// Helper function to populate issues (Unchanged)
const populateIssue = (query) => {
  return query
    .populate('user', '-password') 
    .populate({
      path: 'reposts', 
      select: 'firstName lastName _id' 
    })
    .populate({
      path: 'comments.user', 
      select: 'firstName lastName _id' 
    });
};

// GET all issues (Unchanged)
router.get('/', auth, async (req, res) => {
  try {
    // ... (Logic remains the same) ...
    res.json({
      success: true,
      data: issuesWithFlags,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      hasMore: (page * limit) < total
    });
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issues' });
  }
});

// GET my issues (Unchanged)
router.get('/my', auth, async (req, res) => {
  try {
    // ... (Logic remains the same) ...
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch user issues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user issues' });
  }
});

// GET issue by ID (Unchanged)
router.get('/:id', auth, async (req, res) => { 
  try {
    // ... (Logic remains the same) ...
    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Fetch issue by ID error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 4: POST create new issue (Upload to Cloudinary)
// -----------------------------------------------------------------------
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    // Upload files to Cloudinary and collect the secure URLs
    const mediaUploadPromises = (req.files || []).map(uploadToCloudinary);
    const mediaLinks = await Promise.all(mediaUploadPromises); // Wait for all uploads to finish
    
    const issueData = {
      ...pickIssueFields(req.body),
      user: req.user._id,
      media: mediaLinks, // Store the permanent Cloudinary URLs
      reposts: [],
      comments: [] // Initialize comments array
    };

    const issue = new Issue(issueData);
    await issue.save();
    // Populate the user field before sending the response
    await issue.populate('user', '-password');
    res.status(201).json({ success: true, data: issue });
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ success: false, message: 'Error creating issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 4: PUT update issue (Handle Cloudinary Media)
// -----------------------------------------------------------------------
router.put('/:id', auth, upload.array('media', 5), async (req, res) => {
  try {
    const { id } = req.params;
    const updatedFields = pickIssueFields(req.body);
    const issue = await Issue.findById(id);

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (issue.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const existingMedia = req.body.existingMedia ? JSON.parse(req.body.existingMedia) : [];

    // --- Cloudinary Deletion Check ---
    const mediaToDelete = issue.media.filter(filePath => !existingMedia.includes(filePath));
    const deletePromises = mediaToDelete.map(async (url) => {
        // Extract the Public ID from the secure URL
        const parts = url.split('/');
        const publicIdWithExtension = parts[parts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        // Execute the deletion on Cloudinary
        await cloudinary.uploader.destroy(`resolveit_issues/${publicId}`);
    });
    await Promise.all(deletePromises);
    // --- End Cloudinary Deletion Check ---

    // --- Upload New Files to Cloudinary ---
    const newMediaUploadPromises = (req.files || []).map(uploadToCloudinary);
    const newMediaLinks = await Promise.all(newMediaUploadPromises);

    // Combine retained existing links with new uploaded links
    updatedFields.media = [...existingMedia, ...newMediaLinks];

    Object.assign(issue, updatedFields);
    await issue.save();
    await populateIssue(issue); 
    res.json({ success: true, data: issue });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ success: false, message: 'Error updating issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 4: DELETE issue (Delete Media from Cloudinary)
// -----------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (issue.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Delete associated media files from Cloudinary
    const deletePromises = issue.media.map(async (url) => {
        const parts = url.split('/');
        const publicIdWithExtension = parts[parts.length - 1];
        const publicId = publicIdWithExtension.split('.')[0];
        // Cloudinary destroy must include the folder prefix
        await cloudinary.uploader.destroy(`resolveit_issues/${publicId}`); 
    });
    await Promise.all(deletePromises).catch(err => console.warn("Failed to delete all media from Cloudinary.", err)); // Don't block delete if media fails

    await Issue.findByIdAndDelete(id);
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ success: false, message: 'Error deleting issue' });
  }
});

// -----------------------------------------------------------------------
// (Rest of the routes remain unchanged)
// -----------------------------------------------------------------------

// POST vote (Unchanged)
router.post('/:id/vote', auth, async (req, res) => {
  // ...
});

// POST add comment (Unchanged)
router.post('/:id/comment', auth, async (req, res) => {
  // ...
});


// GET vote history (Unchanged)
router.get('/votes/me', auth, async (req, res) => {
  // ...
});

// REPOST toggle (Unchanged)
router.post('/:id/repost', auth, async (req, res) => {
  // ...
});

// GET reposted issues (Unchanged)
router.get('/reposts/me', auth, async (req, res) => {
  // ...
});

export default router;