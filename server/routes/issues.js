import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import Issue from '../models/Issue.js';
import { auth } from '../middleware/auth.js';
import { sendEmailToAuthority } from '../utils/email.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Multer setup
const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, join(__dirname, '../uploads'));
  },
  filename(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

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

const pickIssueFields = (body) => ({
  title: body.title,
  description: body.description,
  category: body.category,
  location: body.location,
  status: body.status
});

// Helper function to populate issues with user and comment details
const populateIssue = (query) => {
  return query
    .populate('user', '-password') // Populate original issue user
    .populate({
      path: 'reposts', // Populate reposting users (assuming 'reposts' refers to users)
      select: 'firstName lastName _id' // Select minimal user info
    })
    .populate({
      path: 'comments.user', // Populate user for each comment
      select: 'firstName lastName _id' // Select minimal user info for comments
    });
};

// GET all issues (with pagination, filters, and user-specific flags)
router.get('/', auth, async (req, res) => { // Added auth middleware
  try {
    const { page = 1, limit = 5, category, location } = req.query;
    const query = {};
    if (category) query.category = category;
    if (location) query.location = new RegExp(location, 'i'); // Case-insensitive search

    const issues = await populateIssue(Issue.find(query))
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Issue.countDocuments(query);

    const issuesWithFlags = issues.map(issue => {
      const obj = issue.toObject();

      // Determine user's vote
      const userVote = issue.votes.find(vote => vote.user.toString() === req.user._id.toString());
      obj.userVote = userVote ? (userVote.isUpvote ? 'upvote' : 'downvote') : null;

      // Determine if user has reposted
      obj.repostedByUser = issue.reposts.some(repostUser => repostUser._id.toString() === req.user._id.toString());
      obj.repostCount = issue.reposts.length;

      // Ensure comments and reposts are populated correctly for frontend
      obj.comments = issue.comments.map(comment => ({
        ...comment.toObject(), // Convert subdocument to object
        user: comment.user ? comment.user.toObject() : null // Ensure user is an object
      }));
      obj.repostedBy = issue.reposts.map(user => user.toObject()); // Ensure reposts is an array of user objects

      delete obj.reposts; // Clean up old field if needed
      delete obj.votes; // Remove raw votes for a cleaner frontend object, userVote is enough

      return obj;
    });

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

// GET my issues (with user-specific flags)
router.get('/my', auth, async (req, res) => {
  try {
    const issues = await populateIssue(Issue.find({ user: req.user._id }))
      .sort('-createdAt');

    const issuesWithFlags = issues.map(issue => {
      const obj = issue.toObject();
      const userVote = issue.votes.find(vote => vote.user.toString() === req.user._id.toString());
      obj.userVote = userVote ? (userVote.isUpvote ? 'upvote' : 'downvote') : null;
      obj.repostedByUser = issue.reposts.some(repostUser => repostUser._id.toString() === req.user._id.toString());
      obj.repostCount = issue.reposts.length;
      obj.comments = issue.comments.map(comment => ({
        ...comment.toObject(),
        user: comment.user ? comment.user.toObject() : null
      }));
      obj.repostedBy = issue.reposts.map(user => user.toObject());

      delete obj.reposts;
      delete obj.votes;
      return obj;
    });
    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Failed to fetch user issues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch user issues' });
  }
});

// GET issue by ID (with user-specific flags)
router.get('/:id', auth, async (req, res) => { // Added auth middleware
  try {
    const issue = await populateIssue(Issue.findById(req.params.id));

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const issueObj = issue.toObject();
    const userVote = issue.votes.find(vote => vote.user.toString() === req.user._id.toString());
    issueObj.userVote = userVote ? (userVote.isUpvote ? 'upvote' : 'downvote') : null;
    issueObj.repostedByUser = issue.reposts.some(repostUser => repostUser._id.toString() === req.user._id.toString());
    issueObj.repostCount = issue.reposts.length;
    issueObj.comments = issue.comments.map(comment => ({
        ...comment.toObject(),
        user: comment.user ? comment.user.toObject() : null
      }));
    issueObj.repostedBy = issue.reposts.map(user => user.toObject());

    delete issueObj.reposts;
    delete issueObj.votes;

    res.json({ success: true, data: issueObj });
  } catch (error) {
    console.error('Fetch issue by ID error:', error);
    res.status(500).json({ success: false, message: 'Error fetching issue' });
  }
});

// POST create new issue
router.post('/', auth, upload.array('media', 5), async (req, res) => {
  try {
    const mediaFiles = req.files?.map(file => `/uploads/${file.filename}`) || [];
    const issueData = {
      ...pickIssueFields(req.body),
      user: req.user._id,
      media: mediaFiles,
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

// PUT update issue
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

    if (req.files?.length > 0) {
      // Delete old media files that are no longer present
      issue.media.forEach(filePath => {
        if (!existingMedia.includes(filePath)) {
          const fullPath = join(__dirname, '..', filePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      });
      updatedFields.media = [...existingMedia, ...req.files.map(file => `/uploads/${file.filename}`)];
    } else {
      // If no new files, handle deletions of old ones
      issue.media.forEach(filePath => {
        if (!existingMedia.includes(filePath)) {
          const fullPath = join(__dirname, '..', filePath);
          if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
        }
      });
      updatedFields.media = existingMedia;
    }

    Object.assign(issue, updatedFields);
    await issue.save();
    await populateIssue(issue); // Use the helper to populate all necessary fields
    res.json({ success: true, data: issue });
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ success: false, message: 'Error updating issue' });
  }
});

// DELETE issue
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const issue = await Issue.findById(id);

    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    if (issue.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Delete associated media files
    issue.media.forEach(filePath => {
      const fullPath = join(__dirname, '..', filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    });

    await Issue.findByIdAndDelete(id);
    res.json({ success: true, message: 'Issue deleted successfully' });
  } catch (error) {
    console.error('Delete issue error:', error);
    res.status(500).json({ success: false, message: 'Error deleting issue' });
  }
});

// POST vote
router.post('/:id/vote', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { isUpvote } = req.body;
    const userId = req.user._id;

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const existingVoteIndex = issue.votes.findIndex(v => v.user.toString() === userId.toString());

    if (existingVoteIndex !== -1) {
      if (issue.votes[existingVoteIndex].isUpvote === isUpvote) {
        // User is trying to vote the same way again, no change
        // Removed populateIssue call here; it's redundant if no change occurs
        // and the response should still be the current state of the issue.
        // The issue object already has the latest vote counts at this point.
        return res.json({ success: true, data: issue });
      }
      // Change existing vote
      issue.votes[existingVoteIndex].isUpvote = isUpvote; // FIX: Corrected typo here
    } else {
      // Add new vote
      issue.votes.push({ user: userId, isUpvote });
    }

    issue.upvotes = issue.votes.filter(v => v.isUpvote).length;
    issue.downvotes = issue.votes.length - issue.upvotes;

    if (issue.upvotes >= 3 && !issue.emailSent) {
      sendEmailToAuthority(issue).catch(err => console.error('Email send error:', err));
      issue.emailSent = true;
    }

    await issue.save();
    // Populate the issue after saving to ensure all fields are up-to-date and populated
    const populatedIssue = await populateIssue(Issue.findById(issue._id));
    res.json({ success: true, data: populatedIssue });
  } catch (error) {
    console.error('Vote issue error:', error);
    res.status(500).json({ success: false, message: 'Error voting on issue' });
  }
});

// POST add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user._id;

    if (!text || text.trim() === '') {
      return res.status(400).json({ success: false, message: 'Comment text cannot be empty.' });
    }

    const issue = await Issue.findById(id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const newComment = {
      text,
      user: userId,
      createdAt: new Date()
    };

    issue.comments.push(newComment);
    await issue.save();

    // Find the newly added comment and populate its user for the response
    const addedComment = issue.comments[issue.comments.length - 1];
    const populatedComment = await Issue.populate(addedComment, { path: 'user', select: 'firstName lastName _id' });

    res.status(201).json({ success: true, comment: populatedComment });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ success: false, message: 'Error adding comment' });
  }
});


// GET vote history (no changes needed)
router.get('/votes/me', auth, async (req, res) => {
  try {
    const issues = await Issue.find({ 'votes.user': req.user._id }, 'votes').lean();
    const votes = issues.flatMap(issue => {
      const vote = issue.votes.find(v => v.user.toString() === req.user._id.toString());
      return vote ? [{ issueId: issue._id, isUpvote: vote.isUpvote }] : [];
    });
    res.json({ success: true, data: votes });
  } catch (error) {
    console.error('Error fetching user votes:', error);
    res.status(500).json({ success: false, message: 'Error fetching votes' });
  }
});

// REPOST toggle
router.post('/:id/repost', auth, async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.id);
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    const userId = req.user._id.toString();
    const index = issue.reposts.findIndex(id => id.toString() === userId);

    let message = '';
    if (index === -1) {
      issue.reposts.push(userId);
      message = 'Issue reposted successfully';
    } else {
      issue.reposts.splice(index, 1);
      message = 'Issue un-reposted successfully';
    }

    await issue.save();

    // Re-fetch and populate the issue to send back updated counts and flags
    const updatedIssue = await populateIssue(Issue.findById(issue._id));
    const issueObj = updatedIssue.toObject();

    // Add frontend specific flags
    issueObj.repostedByUser = issueObj.reposts.some(repostUser => repostUser._id.toString() === userId);
    issueObj.repostCount = issueObj.reposts.length;

    // Clean up if necessary
    delete issueObj.reposts; // Remove raw reposts array to avoid confusion

    res.json({ success: true, message, data: issueObj }); // Send back the full updated issue object
  } catch (error) {
    console.error('Toggle repost error:', error);
    res.status(500).json({ success: false, message: 'Error toggling repost' });
  }
});

// GET reposted issues (no changes needed)
router.get('/reposts/me', auth, async (req, res) => {
  try {
    const repostedIssues = await populateIssue(Issue.find({ reposts: req.user._id }))
      .sort('-createdAt');

    const issuesWithFlags = repostedIssues.map(issue => {
      const obj = issue.toObject();
      const userVote = issue.votes.find(vote => vote.user.toString() === req.user._id.toString());
      obj.userVote = userVote ? (userVote.isUpvote ? 'upvote' : 'downvote') : null;
      obj.repostedByUser = true; // If it's in this list, the user has definitely reposted it
      obj.repostCount = issue.reposts.length;
      obj.comments = issue.comments.map(comment => ({
        ...comment.toObject(),
        user: comment.user ? comment.user.toObject() : null
      }));
      obj.repostedBy = issue.reposts.map(user => user.toObject());

      delete obj.reposts;
      delete obj.votes;
      return obj;
    });

    res.json({ success: true, data: issuesWithFlags });
  } catch (error) {
    console.error('Fetch reposted issues error:', error);
    res.status(500).json({ success: false, message: 'Error fetching reposted issues' });
  }
});

export default router;