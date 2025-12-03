// server/controllers/feedbackController.js

import Feedback from '../models/Feedback.js';
import { sendFeedbackNotification } from '../utils/email.js'; 

// The 'auth' middleware MUST be applied to the /api/feedback route 
// in your routes/feedback.js file to ensure req.user is available.

export const submitFeedback = async (req, res) => {
    try {
        const { type, subject, message } = req.body;
        
        // CRITICAL FIX: Check if the user is logged in
        if (!req.user || !req.user.email) {
            return res.status(401).json({ 
                success: false, 
                message: 'Feedback submission requires a logged-in user to identify the sender.' 
            });
        }
        
        const senderEmail = req.user.email;
        
        // --- Validation ---
        if (!type || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Type, subject, and message are required.' });
        }
        // ... (other validation checks omitted for brevity)

        // 1. Save to Database
        const newFeedback = new Feedback({ 
            type, 
            subject, 
            message,
            user: req.user._id // Save the ID of the logged-in user
        });
        await newFeedback.save();

        // 2. Send Notification Email (Objective 5)
        // CRITICAL: Passing the actual user's email for the Reply-To header
        sendFeedbackNotification(
            { type, subject, message },
            senderEmail // <--- User's actual email
        ); 

        // 3. Send Success Response
        res.status(201).json({ 
            success: true,
            message: 'Feedback submitted successfully.' 
        });
        
    } catch (error) {
        console.error('Feedback submission failed:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit feedback. Internal server error.' 
        });
    }
};