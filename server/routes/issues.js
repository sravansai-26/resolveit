// routes/issues.js

import express from 'express';
import multer from 'multer';
import Issue from '../models/Issue.js';
import { auth } from '../middleware/auth.js'; // Assuming middleware path is correct
import cloudinary from '../config/cloudinary.js';
import streamifier from 'streamifier';
import { body, validationResult } from 'express-validator';
import { sendEmailToAuthority } from '../utils/email.js'; // Assuming this utility is ready

const router = express.Router();

// -----------------------------------------------------------------------
// ✅ STEP 1: Multer Memory Storage Configuration (Required for Cloudinary Streaming)
// -----------------------------------------------------------------------
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 300 * 1024 * 1024 }, // 300MB limit
  fileFilter(req, file, cb) {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type, only images and videos allowed'));
    }
  },
});

// -----------------------------------------------------------------------
// ✅ STEP 2: Cloudinary Uploader (Stream-based)
// -----------------------------------------------------------------------
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

// Helper function to populate issues (Used in multiple GET routes)
const populateIssue = (query) => {
  // 🟢 CRITICAL FIX IMPLEMENTED: Ensure the query object is the one returned from the chain
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

// Helper to convert an Issue document into the shape frontend expects
const toIssueResponse = (issueDoc) => {
  // Use issueDoc.toObject({ virtuals: true }) to get a plain object including repostCount
  const issueObj = issueDoc.toObject({ virtuals: true }); 

  // Ensure repostedBy reflects the array of User IDs
  issueObj.repostedBy = (issueObj.reposts || []).map(u => u?._id?.toString() || u.toString());
  
  // Clean up references that the frontend doesn't need
  delete issueObj.reposts;

  return issueObj;
};

// =======================================================================
// API ENDPOINTS
// =======================================================================


// -----------------------------------------------------------------------
// ✅ 1. GET all issues (PUBLIC) — Home.tsx (Paginated)
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

    issuesQuery = populateIssue(issuesQuery);
    const issues = await issuesQuery; // Execute the query

    const issuesWithFlags = issues.map((issue) => toIssueResponse(issue));

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
// ✅ 2. GET my issues (AUTH) — ProfileContext.fetchIssues()
// -----------------------------------------------------------------------
router.get('/my', auth, async (req, res) => {
  try {
    let issuesQuery = Issue.find({ user: req.user._id }).sort({ createdAt: -1 });
    issuesQuery = populateIssue(issuesQuery);
    const issues = await issuesQuery;

    const issuesWithFlags = issues.map((issue) => toIssueResponse(issue));
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch user issues:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch user issues' });
  }
});

// -----------------------------------------------------------------------
// ✅ 3. GET issues I reposted (AUTH) — ProfileContext.fetchReposts()
// -----------------------------------------------------------------------
router.get('/reposts/me', auth, async (req, res) => {
  try {
    let issuesQuery = Issue.find({ reposts: req.user._id }).sort({
      createdAt: -1,
    });
    issuesQuery = populateIssue(issuesQuery);
    const issues = await issuesQuery;

    const issuesWithFlags = issues.map((issue) => toIssueResponse(issue));
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch reposted issues:', error);
    res
      .status(500)
      .json({ success: false, message: 'Failed to fetch reposted issues' });
  }
});

// -----------------------------------------------------------------------
// ✅ 4. GET issue by ID (PUBLIC)
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
// ✅ 5. POST create new issue (Upload to Cloudinary) — AUTH
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
        // Other fields (reposts, comments, votes) default to empty arrays/0
      };

      const issue = new Issue(issueData);
      await issue.save();
      
      // ⚠️ CRITICAL STEP 5.1: Check if the issue qualifies to send an email report
      // You should add logic here to determine if the report should be sent immediately.
      // E.g., if (issue.category !== 'Other' && issue.category) { await sendEmailToAuthority(issue); }

      // Repopulate for the response object
      const populatedIssue = await populateIssue(Issue.findById(issue._id));

      const issueObj = toIssueResponse(populatedIssue);
      res.status(201).json({ success: true, data: issueObj });
    } catch (error) {
      console.error('Create issue error:', error);
      res.status(500).json({ success: false, message: 'Error creating issue' });
    }
  }
);

// -----------------------------------------------------------------------
// ✅ 6. PUT update issue (Handle Cloudinary Media) — AUTH
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
      let issue = await Issue.findById(id);

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
          console.warn('Could not parse existingMedia array from request body.', e);
        }
      }

      // 2. Cloudinary Deletion Check: files in DB not in the retained list
      const mediaToDelete = issue.media.filter((filePath) => {
        return (
          filePath.startsWith('http') && !existingMedia.includes(filePath)
        );
      });

      const deletePromises = mediaToDelete.map(async (url) => {
        const urlParts = url.split('/');
        const folderAndPublicId = urlParts.slice(urlParts.length - 2).join('/');
        const publicId = folderAndPublicId.split('.')[0]; 
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
      issue = await issue.save(); // save and update reference

      // Repopulate for the response object
      const populatedIssue = await populateIssue(Issue.findById(issue._id));

      const issueObj = toIssueResponse(populatedIssue);
      res.json({ success: true, data: issueObj });
    } catch (error) {
      console.error('Update issue error:', error);
      res.status(500).json({ success: false, message: 'Error updating issue' });
    }
  }
);

// -----------------------------------------------------------------------
// ✅ 7. DELETE issue (Delete Media from Cloudinary) — AUTH
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
// ✅ 8. POST vote on an issue — AUTH (CRITICAL FIX: Added unvote logic)
// -----------------------------------------------------------------------
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isUpvote } = req.body; // isUpvote: true or false

    if (typeof isUpvote !== 'boolean') {
      return res
        .status(400)
        .json({ success: false, message: 'isUpvote must be boolean' });
    }

    let issue = await Issue.findById(id);
    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }

    const userIdString = req.user._id.toString();
    issue.votes = issue.votes || [];
    issue.upvotes = issue.upvotes || 0;
    issue.downvotes = issue.downvotes || 0;

    const existingIndex = issue.votes.findIndex(
      (v) => v.user.toString() === userIdString
    );

    if (existingIndex !== -1) {
      // User has an existing vote
      const existingVote = issue.votes[existingIndex];

      if (existingVote.isUpvote === isUpvote) {
        // ❌ User is trying to vote the same way again (unvote)
        
        if (existingVote.isUpvote) {
          issue.upvotes -= 1;
        } else {
          issue.downvotes -= 1;
        }
        
        issue.votes.splice(existingIndex, 1);
      } else {
        // Switch vote (e.g., upvote -> downvote)
        if (existingVote.isUpvote) {
          issue.upvotes -= 1;
          issue.downvotes += 1;
        } else {
          issue.downvotes -= 1;
          issue.upvotes += 1;
        }
        existingVote.isUpvote = isUpvote; // Update the vote type
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

    issue = await issue.save();
    // 🟢 FIX: Call populateIssue on the Mongoose Query object
    const populatedIssue = await populateIssue(Issue.findById(issue._id)); 

    const issueObj = toIssueResponse(populatedIssue);
    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Vote issue error:', error);
    res.status(500).json({ success: false, message: 'Error voting on issue' });
  }
});

// -----------------------------------------------------------------------
// ✅ 9. POST repost / toggle repost — AUTH
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
    const userId = req.user._id;

    // Check if user has already reposted
    const alreadyReposted = issue.reposts.some(
      (u) => u.toString() === userId.toString()
    );

    if (alreadyReposted) {
      // Remove repost
      issue.reposts.pull(userId); // Mongoose pull method is cleaner than filter/splice
    } else {
      // Add repost
      issue.reposts.push(userId);
    }

    await issue.save();

    // Build response fields required by frontend
    const repostIds = issue.reposts.map((u) => u.toString());
    const repostCount = repostIds.length;
    const repostedByUser = repostIds.includes(userId.toString());

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
// ✅ 10. POST comment on an issue — AUTH
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

    let issue = await Issue.findById(id);
    if (!issue) {
      return res
        .status(404)
        .json({ success: false, message: 'Issue not found' });
    }

    const newComment = {
      user: req.user._id,
      text: text.trim(),
      createdAt: new Date(),
    };
    
    // Push the comment object to the array
    issue.comments.push(newComment);

    issue = await issue.save(); // save and update reference

    // Populate the user field of the *last added comment* for the immediate response
    const savedCommentIndex = issue.comments.length - 1;
    await issue.populate({
      path: `comments.${savedCommentIndex}.user`,
      select: 'firstName lastName _id',
    });

    // Extract the populated comment
    const populatedComment = issue.comments[savedCommentIndex];

    res.json({
      success: true,
      data: {
          comment: populatedComment, // Return under a standard 'data' envelope
      },
    });
  } catch (error) {
    console.error('Comment issue error:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});

export default router;