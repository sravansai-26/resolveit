// routes/issues.js - FULLY FIXED VERSION

import express from 'express';
import multer from 'multer';
import Issue from '../models/Issue.js';
import { auth } from '../middleware/auth.js';
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import { body, validationResult } from 'express-validator';
import { sendEmailToAuthority } from '../utils/email.js';

const router = express.Router();

// Multer Memory Storage (300MB limit)
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
  },
});

// Cloudinary uploader
const uploadToCloudinary = (file) => {
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

// ✅ FIXED: populateIssue now works with proper query chaining
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

// ✅ FIXED: Proper repost handling for frontend
const toIssueResponse = (issueDoc) => {
  const issueObj = issueDoc.toObject({ virtuals: true });
  issueObj.repostedBy = (issueObj.reposts || []).map(u => u?._id?.toString() || u.toString());
  delete issueObj.reposts;
  return issueObj;
};

// 1. GET all issues (PUBLIC)
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '5', 10);
    const skip = (page - 1) * limit;
    const category = req.query.category || '';
    const location = req.query.location || '';

    const filter = {};
    if (category) filter.category = category;
    if (location) filter.location = { $regex: location, $options: 'i' };

    const total = await Issue.countDocuments(filter);
    let issuesQuery = Issue.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    issuesQuery = populateIssue(issuesQuery);
    const issues = await issuesQuery;

    const issuesWithFlags = issues.map(toIssueResponse);

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

// 2. GET my issues (AUTH)
router.get('/my', auth, async (req, res) => {
  try {
    let issuesQuery = Issue.find({ user: req.user._id }).sort({ createdAt: -1 });
    issuesQuery = populateIssue(issuesQuery);
    const issues = await issuesQuery;

    const issuesWithFlags = issues.map(toIssueResponse);
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch user issues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user issues' });
  }
});

// 3. GET my reposts (AUTH)
router.get('/reposts/me', auth, async (req, res) => {
  try {
    let issuesQuery = Issue.find({ reposts: req.user._id }).sort({ createdAt: -1 });
    issuesQuery = populateIssue(issuesQuery);
    const issues = await issuesQuery;

    const issuesWithFlags = issues.map(toIssueResponse);
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch reposted issues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reposted issues' });
  }
});

// 4. GET issue by ID
router.get('/:id', async (req, res) => {
  try {
    const issueQuery = Issue.findById(req.params.id);
    const issue = await populateIssue(issueQuery);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const issueObj = toIssueResponse(issue);
    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Fetch issue by ID error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issue' });
  }
});

// ✅ 5. POST create issue (FIXED: user field + media handling)
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
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      // Upload files
      const mediaUploadPromises = (req.files || []).map(uploadToCloudinary);
      const mediaLinks = await Promise.all(mediaUploadPromises).catch(() => []);

      // ✅ FIXED: Proper user field + all required fields
      const issueData = {
        ...pickIssueFields(req.body),
        user: req.user._id,  // ← CRITICAL: This was missing!
        media: mediaLinks,
      };

      const issue = new Issue(issueData);
      await issue.save();

      const populatedIssue = await populateIssue(Issue.findById(issue._id));
      const issueObj = toIssueResponse(populatedIssue);
      
      res.status(201).json({ success: true, data: issueObj });
    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({ success: false, message: 'Error creating issue' });
    }
  }
);

// 6. PUT update issue
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
      let issue = await Issue.findById(id);

      if (!issue) {
        return res.status(404).json({ success: false, message: 'Issue not found' });
      }
      if (issue.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized' });
      }

      const updatedFields = pickIssueFields(req.body);

      // Handle media updates
      let existingMedia = [];
      if (req.body.existingMedia) {
        try {
          existingMedia = JSON.parse(req.body.existingMedia);
        } catch (e) {
          console.warn('Could not parse existingMedia:', e);
        }
      }

      const mediaToDelete = issue.media.filter(filePath => 
        filePath.startsWith('http') && !existingMedia.includes(filePath)
      );

      const deletePromises = mediaToDelete.map(async (url) => {
        const urlParts = url.split('/');
        const publicId = urlParts.slice(-2).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicId);
      });

      await Promise.all(deletePromises).catch(console.warn);

      const newMediaPromises = (req.files || []).map(uploadToCloudinary);
      const newMediaLinks = await Promise.all(newMediaPromises).catch(() => []);

      updatedFields.media = [...existingMedia, ...newMediaLinks];

      Object.assign(issue, updatedFields);
      await issue.save();

      const populatedIssue = await populateIssue(Issue.findById(issue._id));
      const issueObj = toIssueResponse(populatedIssue);
      
      res.json({ success: true, data: issueObj });
    } catch (error) {
      console.error('Update issue error:', error);
      res.status(500).json({ success: false, message: 'Error updating issue' });
    }
  }
);

// 7. DELETE issue
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }
    if (issue.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Delete media
    const deletePromises = issue.media.map(async (url) => {
      const urlParts = url.split('/');
      const publicId = urlParts.slice(-2).join('/').split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    });

    await Promise.all(deletePromises).catch(console.warn);
    await Issue.findByIdAndDelete(id);
    
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ success: false, message: 'Error deleting issue' });
  }
});

// 8. POST vote
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isUpvote } = req.body;

    if (typeof isUpvote !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isUpvote must be boolean' });
    }

    let issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const userIdString = req.user._id.toString();
    issue.votes = issue.votes || [];
    issue.upvotes = issue.upvotes || 0;
    issue.downvotes = issue.downvotes || 0;

    const existingIndex = issue.votes.findIndex(v => v.user.toString() === userIdString);

    if (existingIndex !== -1) {
      const existingVote = issue.votes[existingIndex];
      
      if (existingVote.isUpvote === isUpvote) {
        // Unvote
        if (existingVote.isUpvote) issue.upvotes -= 1;
        else issue.downvotes -= 1;
        issue.votes.splice(existingIndex, 1);
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
      }
    } else {
      // New vote
      issue.votes.push({ user: req.user._id, isUpvote });
      if (isUpvote) issue.upvotes += 1;
      else issue.downvotes += 1;
    }

    await issue.save();
    const populatedIssue = await populateIssue(Issue.findById(issue._id));
    const issueObj = toIssueResponse(populatedIssue);
    
    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Vote issue error:', error);
    res.status(500).json({ success: false, message: 'Error voting on issue' });
  }
});

// 9. POST repost toggle
router.post('/:id/repost', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    issue.reposts = issue.reposts || [];
    const userId = req.user._id;
    const alreadyReposted = issue.reposts.some(u => u.toString() === userId.toString());

    if (alreadyReposted) {
      issue.reposts.pull(userId);
    } else {
      issue.reposts.push(userId);
    }

    await issue.save();

    const repostIds = issue.reposts.map(u => u.toString());
    res.json({
      success: true,
      data: {
        repostCount: repostIds.length,
        repostedByUser: repostIds.includes(userId.toString()),
      },
    });
  } catch (error) {
    console.error('Repost issue error:', error);
    res.status(500).json({ success: false, message: 'Error toggling repost status' });
  }
});

// 10. POST comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }

    let issue = await Issue.findById(id);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    issue.comments.push({
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    });

    await issue.save();
    
    // Populate last comment's user
    const savedCommentIndex = issue.comments.length - 1;
    await issue.populate({
      path: `comments.${savedCommentIndex}.user`,
      select: 'firstName lastName _id',
    });

    const populatedComment = issue.comments[savedCommentIndex];
    
    res.json({
      success: true,
      data: { comment: populatedComment },
    });
  } catch (error) {
    console.error('Comment issue error:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});

export default router;
