// routes/issues.js - FINAL STABLE VERSION (NO LINES SKIPPED)

import express from 'express';
import multer from 'multer';
import Issue from '../models/Issue.js';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import { body, validationResult } from 'express-validator';

const router = express.Router();

/* -------------------------------------------------------------
   MULTER — MEMORY STORAGE (cloud upload only)
------------------------------------------------------------- */
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid media type — only images or videos allowed.'));
    }
  },
});

/* -------------------------------------------------------------
   CLOUDINARY UPLOAD HELPER
------------------------------------------------------------- */
const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'resolveit_issues',
        resource_type: file.mimetype.startsWith('video') ? 'video' : 'auto',
      },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

/* Extract issue fields from body */
const pickIssueFields = (body) => ({
  title: body.title,
  description: body.description,
  category: body.category,
  location: body.location,
  status: body.status,
});

/* -------------------------------------------------------------
   POPULATION HELPERS
------------------------------------------------------------- */
const populateIssue = (query) => {
  return query
    .populate('user', 'firstName lastName _id')
    .populate({
      path: 'reposts',
      select: 'firstName lastName _id',
    })
    .populate({
      path: 'comments.user',
      select: 'firstName lastName _id',
    });
};

// Convert DB doc -> frontend format
const toIssueResponse = (issueDoc) => {
  const obj = issueDoc.toObject({ virtuals: true });

  obj.repostedBy = obj.reposts?.map((u) =>
    u?._id?.toString() || u.toString()
  );

  delete obj.reposts;
  return obj;
};

/* -------------------------------------------------------------
   1. GET ALL ISSUES (PUBLIC)
------------------------------------------------------------- */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1');
    const limit = parseInt(req.query.limit || '5');
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.category) filter.category = req.query.category;
    if (req.query.location)
      filter.location = { $regex: req.query.location, $options: 'i' };

    const total = await Issue.countDocuments(filter);

    let query = Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    query = populateIssue(query);

    const issues = await query;
    const formatted = issues.map(toIssueResponse);

    res.json({
      success: true,
      data: formatted,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      hasMore: page * limit < total,
    });
  } catch (error) {
    console.error('Issues fetch error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issues' });
  }
});

/* -------------------------------------------------------------
   2. GET MY ISSUES (AUTH REQUIRED)
------------------------------------------------------------- */
router.get('/my', auth, async (req, res) => {
  try {
    let query = Issue.find({ user: req.user._id }).sort({ createdAt: -1 });
    query = populateIssue(query);

    const issues = await query;
    res.json({ success: true, data: issues.map(toIssueResponse) });
  } catch (error) {
    console.error('My issues error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user issues' });
  }
});

/* -------------------------------------------------------------
   3. GET MY REPOSTS (AUTH REQUIRED)
------------------------------------------------------------- */
router.get('/reposts/me', auth, async (req, res) => {
  try {
    let query = Issue.find({ reposts: req.user._id }).sort({ createdAt: -1 });
    query = populateIssue(query);

    const issues = await query;
    res.json({ success: true, data: issues.map(toIssueResponse) });
  } catch (error) {
    console.error('Reposts fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reposted issues' });
  }
});

/* -------------------------------------------------------------
   4. GET SINGLE ISSUE BY ID
------------------------------------------------------------- */
router.get('/:id', async (req, res) => {
  try {
    const query = Issue.findById(req.params.id);
    const issue = await populateIssue(query);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    res.json({ success: true, data: toIssueResponse(issue) });
  } catch (error) {
    console.error('Single issue error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issue' });
  }
});

/* -------------------------------------------------------------
   5. CREATE ISSUE (AUTH REQUIRED)
------------------------------------------------------------- */
router.post(
  '/',
  auth,
  upload.array('media', 5),
  [
    body('title').notEmpty(),
    body('description').notEmpty(),
    body('category').notEmpty(),
    body('location').notEmpty(),
  ],
  async (req, res) => {
    try {
      const validation = validationResult(req);
      if (!validation.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.array(),
        });
      }

      const uploaded = await Promise.all(
        (req.files || []).map(uploadToCloudinary)
      ).catch(() => []);

      const issue = new Issue({
        ...pickIssueFields(req.body),
        user: req.user._id,
        media: uploaded,
      });

      await issue.save();

      const populated = await populateIssue(Issue.findById(issue._id));
      res.status(201).json({ success: true, data: toIssueResponse(populated) });
    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({ success: false, message: 'Issue creation failed' });
    }
  }
);

/* -------------------------------------------------------------
   6. UPDATE ISSUE (AUTH REQUIRED)
------------------------------------------------------------- */
router.put(
  '/:id',
  auth,
  upload.array('media', 5),
  [
    body('title').notEmpty(),
    body('description').notEmpty(),
    body('category').notEmpty(),
    body('location').notEmpty(),
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const issue = await Issue.findById(id);

      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

      if (issue.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      // Parse existingMedia array sent from frontend
      let existingMedia = [];
      if (req.body.existingMedia) {
        try {
          existingMedia = JSON.parse(req.body.existingMedia);
        } catch {}
      }

      // Delete removed Cloudinary files
      const toRemove = issue.media.filter(
        (url) => url.startsWith('http') && !existingMedia.includes(url)
      );

      await Promise.all(
        toRemove.map(async (url) => {
          const parts = url.split('/');
          const publicId = parts.slice(-2).join('/').split('.')[0];
          await cloudinary.uploader.destroy(publicId);
        })
      ).catch(() => {});

      // Upload new files
      const uploaded = await Promise.all(
        (req.files || []).map(uploadToCloudinary)
      ).catch(() => []);

      const updatedFields = {
        ...pickIssueFields(req.body),
        media: [...existingMedia, ...uploaded],
      };

      Object.assign(issue, updatedFields);
      await issue.save();

      const populated = await populateIssue(Issue.findById(issue._id));
      res.json({ success: true, data: toIssueResponse(populated) });
    } catch (error) {
      console.error('Update issue error:', error);
      res.status(500).json({ success: false, message: 'Issue update failed' });
    }
  }
);

/* -------------------------------------------------------------
   7. DELETE ISSUE
------------------------------------------------------------- */
router.delete('/:id', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    if (issue.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await Promise.all(
      issue.media.map(async (url) => {
        const parts = url.split('/');
        const publicId = parts.slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      })
    ).catch(() => {});

    await Issue.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ success: false, message: 'Issue deletion failed' });
  }
});

/* -------------------------------------------------------------
   8. VOTE ISSUE
------------------------------------------------------------- */
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { isUpvote } = req.body;

    if (typeof isUpvote !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isUpvote must be boolean' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const uid = req.user._id.toString();
    const existingIndex = issue.votes.findIndex((v) => v.user.toString() === uid);

    if (existingIndex !== -1) {
      const existing = issue.votes[existingIndex];

      // Same vote → undo
      if (existing.isUpvote === isUpvote) {
        if (existing.isUpvote) issue.upvotes--;
        else issue.downvotes--;
        issue.votes.splice(existingIndex, 1);
      } else {
        // Switch vote
        if (existing.isUpvote) {
          issue.upvotes--;
          issue.downvotes++;
        } else {
          issue.downvotes--;
          issue.upvotes++;
        }
        existing.isUpvote = isUpvote;
      }
    } else {
      // New vote
      issue.votes.push({ user: req.user._id, isUpvote });
      if (isUpvote) issue.upvotes++;
      else issue.downvotes++;
    }

    await issue.save();

    const populated = await populateIssue(Issue.findById(issue._id));
    res.json({ success: true, data: toIssueResponse(populated) });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ success: false, message: 'Vote failed' });
  }
});

/* -------------------------------------------------------------
   9. REPOST ISSUE (TOGGLE)
------------------------------------------------------------- */
router.post('/:id/repost', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const uid = req.user._id.toString();
    const already = issue.reposts.some((u) => u.toString() === uid);

    if (already) {
      issue.reposts.pull(req.user._id);
    } else {
      issue.reposts.push(req.user._id);
    }

    await issue.save();

    const repostIds = issue.reposts.map((u) => u.toString());

    res.json({
      success: true,
      data: {
        repostCount: repostIds.length,
        repostedByUser: repostIds.includes(uid),
      },
    });
  } catch (error) {
    console.error('Repost error:', error);
    res.status(500).json({ success: false, message: 'Repost toggle failed' });
  }
});

/* -------------------------------------------------------------
   10. COMMENT ON ISSUE
------------------------------------------------------------- */
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    issue.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await issue.save();

    const i = issue.comments.length - 1;
    await issue.populate({
      path: `comments.${i}.user`,
      select: 'firstName lastName _id',
    });

    res.json({
      success: true,
      data: { comment: issue.comments[i] },
    });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ success: false, message: 'Comment failed' });
  }
});

export default router;
