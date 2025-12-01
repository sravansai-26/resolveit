// routes/issues.js

import express from 'express';
import multer from 'multer';
import Issue from '../models/Issue.js';
import { auth } from '../middleware/auth.js';
// Removed: fs, join, dirname, fileURLToPath as local storage is gone
// import { sendEmailToAuthority } from '../utils/email.js'; // Keep if you use this later
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier'; // NEW: Required for stream-based upload (more robust)
import { body, validationResult } from 'express-validator'; // Added for basic body validation

const router = express.Router();

// -----------------------------------------------------------------------
// ✅ STEP 1: Multer Memory Storage Configuration
// Multer stores the file buffer in memory, ready for Cloudinary.
// -----------------------------------------------------------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      // Error handling for file type
      cb(new Error('Invalid file type, only images and videos allowed'));
    }
  },
});

// -----------------------------------------------------------------------
// ✅ STEP 2: Cloudinary Uploader (Refined to use stream for better memory management)
// -----------------------------------------------------------------------
const uploadToCloudinary = (file) => {
  // Using streamifier for more efficient upload from memory buffer:
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'resolveit_issues',
        resource_type: file.mimetype.startsWith('video') ? 'video' : 'auto',
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

const pickIssueFields = (body) => ({
  title: body.title,
  description: body.description,
  category: body.category,
  location: body.location,
  status: body.status,
});

// Helper function to populate issues
const populateIssue = (query) => {
  return query
    .populate('user', '-password')
    .populate({
      path: 'reposts',
      select: 'firstName lastName _id',
    })
    .populate({
      path: 'comments.user',
      select: 'firstName lastName _id',
    });
};

// Helper to convert an Issue document into the shape frontend expects
const toIssueResponse = (issueDoc) => {
  const issueObj = issueDoc.toObject();

  // Ensure votes array exists
  issueObj.votes = issueObj.votes || [];

  // Convert reposts (Mongo refs) into repostedBy (array of user IDs) and repostCount
  const repostIds = (issueObj.reposts || []).map((u) =>
    typeof u === 'string' ? u : u?._id?.toString()
  );
  issueObj.repostedBy = repostIds;
  issueObj.repostCount = repostIds.length;

  return issueObj;
};

// -----------------------------------------------------------------------
// ✅ GET all issues (PUBLIC) — used by Home.tsx
// -----------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '5', 10);
    const skip = (page - 1) * limit;
    const category = req.query.category || '';
    const location = req.query.location || '';

    const filter = {};
    if (category) filter.category = category;
    if (location)
      filter.location = {
        $regex: location,
        $options: 'i',
      };

    const total = await Issue.countDocuments(filter);
    let issuesQuery = Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    issuesQuery = await populateIssue(issuesQuery);

    const issuesWithFlags = issuesQuery.map((issue) => toIssueResponse(issue));

    res.json({
      success: true,
      data: issuesWithFlags,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issues' });
  }
});

// -----------------------------------------------------------------------
// ✅ GET my issues (AUTH) — used by ProfileContext.fetchIssues()
// -----------------------------------------------------------------------
router.get('/my', auth, async (req, res) => {
  try {
    let issuesQuery = Issue.find({ user: req.user._id }).sort({ createdAt: -1 });
    issuesQuery = await populateIssue(issuesQuery);

    const issuesWithFlags = issuesQuery.map((issue) => toIssueResponse(issue));
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch user issues:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch user issues' });
  }
});

// -----------------------------------------------------------------------
// ✅ GET issues I reposted (AUTH) — used by ProfileContext.fetchReposts()
// -----------------------------------------------------------------------
router.get('/reposts/me', auth, async (req, res) => {
  try {
    let issuesQuery = Issue.find({ reposts: req.user._id }).sort({
      createdAt: -1,
    });
    issuesQuery = await populateIssue(issuesQuery);

    const issuesWithFlags = issuesQuery.map((issue) => toIssueResponse(issue));
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch reposted issues:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch reposted issues' });
  }
});

// -----------------------------------------------------------------------
// ✅ GET issue by ID (PUBLIC) — used by detail/edit view
// -----------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const issueQuery = Issue.findById(req.params.id);
    const issue = await populateIssue(issueQuery);

    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }

    const issueObj = toIssueResponse(issue);
    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Fetch issue by ID error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 3: POST create new issue (Upload to Cloudinary) — AUTH
// -----------------------------------------------------------------------
router.post(
  '/',
  auth,
  upload.array('media', 5),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        // Note: Since we use memory storage, cleanup is automatic via GC.
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      // Upload files to Cloudinary and collect the secure URLs
      const mediaUploadPromises = (req.files || []).map(uploadToCloudinary);
      const mediaLinks = await Promise.all(mediaUploadPromises);

      const issueData = {
        ...pickIssueFields(req.body),
        user: req.user._id,
        media: mediaLinks, // Store the permanent Cloudinary URLs
        reposts: [],
        comments: [],
        votes: [],
        upvotes: 0,
        downvotes: 0,
        emailSent: false,
      };

      const issue = new Issue(issueData);
      await issue.save();

      await issue.populate('user', '-password');

      const issueObj = toIssueResponse(issue);
      res.status(201).json({ success: true, data: issueObj });
    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({ success: false, message: 'Error creating issue' });
    }
  }
);

// -----------------------------------------------------------------------
// ✅ STEP 4: PUT update issue (Handle Cloudinary Media) — AUTH
// -----------------------------------------------------------------------
router.put(
  '/:id',
  auth,
  upload.array('media', 5),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').trim().notEmpty().withMessage('Description is required'),
    body('category').trim().notEmpty().withMessage('Category is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const updatedFields = pickIssueFields(req.body);
      const issue = await Issue.findById(id);

      if (!issue) {
        return res
          .status(404)
          .json({ success: false, message: 'Issue not found' });
      }
      if (issue.user.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: 'Unauthorized' });
      }

      // 1. Handle Existing Media (from frontend: JSON string of URLs to KEEP)
      let existingMedia = [];
      if (req.body.existingMedia) {
        try {
          existingMedia = JSON.parse(req.body.existingMedia);
        } catch (e) {
          console.warn(
            'Could not parse existingMedia array from request body.',
            e
          );
        }
      }

      // 2. Cloudinary Deletion Check: files in DB not in the retained list
      const mediaToDelete = issue.media.filter((filePath) => {
        // Only delete media if it's a Cloudinary URL and not in the retained list
        return (
          filePath.startsWith('http') && !existingMedia.includes(filePath)
        );
      });

      const deletePromises = mediaToDelete.map(async (url) => {
        const urlParts = url.split('/');
        const folderAndPublicId = urlParts
          .slice(urlParts.length - 2)
          .join('/');
        const publicId = folderAndPublicId.split('.')[0]; // e.g., 'resolveit_issues/public_id_123'
        await cloudinary.uploader.destroy(publicId);
      });

      await Promise.all(deletePromises).catch((err) =>
        console.warn('Failed to delete all media from Cloudinary.', err)
      );

      // 3. Upload New Files to Cloudinary
      const newMediaUploadPromises = (req.files || []).map(uploadToCloudinary);
      const newMediaLinks = await Promise.all(newMediaUploadPromises);

      // 4. Combine retained existing links with new uploaded links
      updatedFields.media = [...existingMedia, ...newMediaLinks];

      // 5. Save changes
      Object.assign(issue, updatedFields);
      await issue.save();

      await populateIssue(issue);
      const issueObj = toIssueResponse(issue);
      res.json({ success: true, data: issueObj });
    } catch (error) {
      console.error('Update issue error:', error);
      res.status(500).json({ success: false, message: 'Error updating issue' });
    }
  }
);

// -----------------------------------------------------------------------
// ✅ STEP 5: DELETE issue (Delete Media from Cloudinary) — AUTH
// -----------------------------------------------------------------------
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }
    if (issue.user.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: 'Unauthorized' });
    }

    // Delete associated media files from Cloudinary
    const deletePromises = issue.media.map(async (url) => {
      const urlParts = url.split('/');
      const folderAndPublicId = urlParts.slice(urlParts.length - 2).join('/');
      const publicId = folderAndPublicId.split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    });

    await Promise.all(deletePromises).catch((err) =>
      console.warn('Failed to delete all media from Cloudinary.', err)
    );

    await Issue.findByIdAndDelete(id);
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ success: false, message: 'Error deleting issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 6: POST vote on an issue — AUTH
//    Frontend: POST /api/issues/:id/vote { isUpvote: boolean }
// -----------------------------------------------------------------------
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isUpvote } = req.body;

    if (typeof isUpvote !== 'boolean') {
      return res
        .status(400)
        .json({ success: false, message: 'isUpvote must be boolean' });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }

    issue.votes = issue.votes || [];
    issue.upvotes = issue.upvotes || 0;
    issue.downvotes = issue.downvotes || 0;

    const existingIndex = issue.votes.findIndex(
      (v) => v.user.toString() === req.user._id.toString()
    );

    if (existingIndex !== -1) {
      // User already voted before
      const existingVote = issue.votes[existingIndex];

      if (existingVote.isUpvote === isUpvote) {
        // Same vote again — do nothing
      } else {
        // Switch vote
        if (existingVote.isUpvote) {
          issue.upvotes -= 1;
          issue.downvotes += 1;
        } else {
          issue.downvotes -= 1;
          issue.upvotes += 1;
        }
        existingVote.isUpvote = isUpvote;
        issue.votes[existingIndex] = existingVote;
      }
    } else {
      // New vote
      issue.votes.push({
        user: req.user._id,
        isUpvote,
      });
      if (isUpvote) {
        issue.upvotes += 1;
      } else {
        issue.downvotes += 1;
      }
    }

    await issue.save();
    await populateIssue(issue);

    const issueObj = toIssueResponse(issue);
    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Vote issue error:', error);
    res.status(500).json({ success: false, message: 'Error voting on issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 7: POST repost / toggle repost — AUTH
//    Frontend:
//      - Home.tsx: POST /api/issues/:id/repost → expects data.repostCount, data.repostedByUser
//      - ProfileContext.toggleRepost: same endpoint used to remove repost
// -----------------------------------------------------------------------
router.post('/:id/repost', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }

    issue.reposts = issue.reposts || [];

    const alreadyReposted = issue.reposts.some(
      (u) => u.toString() === req.user._id.toString()
    );

    if (alreadyReposted) {
      // Remove repost
      issue.reposts = issue.reposts.filter(
        (u) => u.toString() !== req.user._id.toString()
      );
    } else {
      // Add repost
      issue.reposts.push(req.user._id);
    }

    await issue.save();

    // Build response fields required by frontend
    const repostIds = issue.reposts.map((u) => u.toString());
    const repostCount = repostIds.length;
    const repostedByUser = repostIds.includes(req.user._id.toString());

    res.json({
      success: true,
      data: {
        repostCount,
        repostedByUser,
      },
    });
  } catch (error) {
    console.error('Repost issue error:', error);
    res
      .status(500)
      .json({ success: false, message: 'Error toggling repost status' });
  }
});

// -----------------------------------------------------------------------
// ✅ STEP 8: POST comment on an issue — AUTH
//    Frontend: POST /api/issues/:id/comment { text }
//    Expects: { success: true, comment: savedComment }
// -----------------------------------------------------------------------
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Comment text is required' });
    }

    const issue = await Issue.findById(id);
    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }

    issue.comments = issue.comments || [];
    issue.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await issue.save();
    await issue.populate({
      path: 'comments.user',
      select: 'firstName lastName _id',
    });

    const savedComment =
      issue.comments[issue.comments.length - 1];

    res.json({
      success: true,
      comment: savedComment,
    });
  } catch (error) {
    console.error('Comment issue error:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});

// -----------------------------------------------------------------------
// Note: You may need to install streamifier (npm install streamifier)
// -----------------------------------------------------------------------

export default router;
