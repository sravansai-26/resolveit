// server/utils/email.js

import nodemailer from 'nodemailer';
import { GOVERNMENT_EMAILS } from '../config/governmentEmails.js';
// Removed: fileURLToPath, dirname, __filename, __dirname as they are not used inside the function

const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const sendEmailToAuthority = async (issue) => {
  try {
    // --- DEBUG LOGS (KEEP until deployment is fully confirmed) ---
    console.log('DEBUG (email.js): SMTP_USER being used:', process.env.SMTP_USER);
    console.log('DEBUG (email.js): BASE_URL being used:', process.env.BASE_URL || 'http://localhost:5000');
    // --- END DEBUG LOGS ---

    const authorityEmail = GOVERNMENT_EMAILS[issue.category];

    if (!authorityEmail) {
      console.error(`Attempted to send email for invalid category: ${issue.category}. No authority email found.`);
      throw new Error(`Invalid category for email: ${issue.category}`);
    }

    // --- TRANSPORTER CREATION ---
    const transporter = nodemailer.createTransport({
      service: 'gmail', 
      auth: {
        user: process.env.SMTP_USER, 
        pass: process.env.SMTP_PASS 
      }
    });
    
    const escapedTitle = escapeHtml(issue.title);
    const escapedCategory = escapeHtml(issue.category);
    const escapedLocation = escapeHtml(issue.location);
    const escapedDescription = escapeHtml(issue.description);

    // ----------------------------------------------------------------------
    // ✅ CLOUDINARY FIX: Use URL directly as it's absolute (https://...)
    // ----------------------------------------------------------------------
    const mediaLinks = Array.isArray(issue.media) && issue.media.length
      ? issue.media.map(url => `<a href="${url}" target="_blank">View Media</a>`).join(', ')
      : 'No media attached';
    
    const mediaTextLinks = Array.isArray(issue.media) && issue.media.length
      ? issue.media.join(', ') 
      : 'No media attached';
    // ----------------------------------------------------------------------

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: authorityEmail,
      subject: `Community Issue Report: ${escapedTitle}`,
      html: `
        <h2>Community Issue Report</h2>
        <p><strong>Issue:</strong> ${escapedTitle}</p>
        <p><strong>Category:</strong> ${escapedCategory}</p>
        <p><strong>Location:</strong> ${escapedLocation}</p>
        <p><strong>Description:</strong> ${escapedDescription}</p>
        <p><strong>Upvotes:</strong> ${issue.upvotes}</p>
        <p><strong>Media:</strong> ${mediaLinks}</p>
        <p>This issue has received significant community attention and requires your review.</p>
      `,
      text: `
        Community Issue Report

        Issue: ${issue.title}
        Category: ${issue.category}
        Location: ${issue.location}
        Description: ${issue.description}
        Upvotes: ${issue.upvotes}
        Media: ${mediaTextLinks}

        This issue has received significant community attention and requires your review.
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully for issue: ${issue.title} to ${authorityEmail}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error; 
  }
};