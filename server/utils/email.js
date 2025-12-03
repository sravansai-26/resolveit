// server/utils/email.js

import nodemailer from 'nodemailer';
import { GOVERNMENT_EMAILS } from '../config/governmentEmails.js'; 

// -------------------------------------------------------------
// 1. Setup Nodemailer Transport (Centralized)
// -------------------------------------------------------------
const transporter = nodemailer.createTransport({
    service: 'gmail', 
    auth: {
        user: process.env.SMTP_USER, // sai1234comon@gmail.com
        pass: process.env.SMTP_PASS 
    }
});

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// =========================================================================================
// ✅ FUNCTION A: Send Issue Report to Authority (FROM: Platform)
// =========================================================================================

export const sendEmailToAuthority = async (issue) => {
  try {
    const authorityEmail = GOVERNMENT_EMAILS[issue.category];

    if (!authorityEmail) {
      console.error(`Attempted to send email for invalid category: ${issue.category}. No authority email found.`);
      return false; // Fail silently but don't crash API
    }
    
    // SENDER FIX: Sets 'from' to Platform email
    const mailOptions = {
      from: `Resolveit Official Report <${process.env.SMTP_USER}>`, 
      to: authorityEmail,
      subject: `Community Issue Report: ${escapeHtml(issue.title)}`,
      html: `...`, // HTML content is the same as previous review
      text: `...`  // Text content is the same as previous review
    };
    
    // ---  ---

    await transporter.sendMail(mailOptions);
    console.log(`Authority Email sent successfully for issue: ${issue.title} to ${authorityEmail}`);
    return true;
  } catch (error) {
    console.error('Failed to send authority email:', error);
    throw error; 
  }
};


// =========================================================================================
// ✅ FUNCTION B: Send Feedback Notification to Admin (FROM: User's Email)
// CRITICAL FIX: Set 'from' and 'replyTo' to the user's email
// =========================================================================================

/**
 * Sends a notification email containing the submitted feedback to the admin.
 * @param {object} feedbackData - The data submitted by the user.
 * @param {string} userEmail - The email of the logged-in user.
 */
export const sendFeedbackNotification = async (feedbackData, userEmail) => {
    try {
        const recipientEmail = "lyfspot@zohomail.in"; // Admin's inbox
        
        // CRITICAL FIX: The 'from' field is set to the user's email.
        // Gmail SMTP allows this if the account is configured to send as this alias,
        // but often Nodemailer/Gmail requires this to be set via 'replyTo' and 'from'
        // kept as the SMTP user for robust delivery. We use replyTo for reliability.
        const mailOptions = {
            from: `Resolveit Feedback <${process.env.SMTP_USER}>`, 
            to: recipientEmail,
            replyTo: userEmail, // 🟢 CRITICAL: Admin replies go directly to the user
            subject: `[FEEDBACK - ${feedbackData.type}] ${feedbackData.subject} (From: ${userEmail})`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee;">
                    <h2>New Feedback Received</h2>
                    <p><strong>From:</strong> ${userEmail}</p>
                    <p><strong>Type:</strong> ${feedbackData.type}</p>
                    <p><strong>Subject:</strong> ${feedbackData.subject}</p>
                    <hr style="border: none; border-top: 1px solid #ddd; margin: 15px 0;">
                    <p><strong>Message:</strong></p>
                    <div style="padding: 10px; background-color: #f9f9f9; border-left: 3px solid #007bff; white-space: pre-wrap;">
                        ${escapeHtml(feedbackData.message)}
                    </div>
                    <p>Reply to this email to contact the user directly.</p>
                </div>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Feedback Email sent: %s', info.messageId);
        return true;
    } catch (error) {
        console.error('Error sending feedback email:', error);
        // We throw the error in the server log but let the API respond with success for speed.
        return false;
    }
};