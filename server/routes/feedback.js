// routes/feedback.js (MUST BE UPDATED)
import express from 'express';
import { submitFeedback } from '../controllers/feedbackController.js';
import { auth } from '../middleware/auth.js'; // Import the auth middleware

const router = express.Router();

// POST /api/feedback - CRITICAL: ADD AUTH MIDDLEWARE
router.post('/', auth, submitFeedback);

export default router;