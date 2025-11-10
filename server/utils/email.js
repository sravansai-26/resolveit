// server/utils/email.js
import nodemailer from 'nodemailer';
import { GOVERNMENT_EMAILS } from '../config/governmentEmails.js';
import { fileURLToPath } from 'url'; // Required for __dirname in ES Modules
import { dirname } from 'path';     // Required for __dirname in ES Modules

// Define __filename and __dirname for this module.
// This is good practice for ES modules if you need relative paths within this file.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// The 'transporter' and now 'BASE_URL' are created inside the function,
// so they don't need to be exported or defined at the top level.

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
    // --- DEBUG LOGS (from previous step, keep them for now to confirm values) ---
    console.log('DEBUG (email.js - inside function): SMTP_USER being used:', process.env.SMTP_USER);
    console.log('DEBUG (email.js - inside function): SMTP_PASS being used:', process.env.SMTP_PASS ? '********' : 'NOT SET');
    // --- END DEBUG LOGS ---

    const authorityEmail = GOVERNMENT_EMAILS[issue.category];

    if (!authorityEmail) {
      console.error(`Attempted to send email for invalid category: ${issue.category}. No authority email found.`);
      throw new Error(`Invalid category for email: ${issue.category}`);
    }

    // --- TRANSPORTER CREATION MOVED INSIDE THE FUNCTION ---
    // This ensures it uses the process.env values AFTER they've been fully loaded by index.js
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Keep this as 'gmail'
      auth: {
        user: process.env.SMTP_USER, // Will now read the correctly loaded value from process.env here
        pass: process.env.SMTP_PASS // Will now read the correctly loaded value from process.env here
      }
    });
    // --- END TRANSPORTER MOVE ---

    // --- CRUCIAL CHANGE: MOVE BASE_URL DEFINITION HERE ---
    // Now, BASE_URL will be read from process.env *each time the function is called*,
    // ensuring it uses the correct, loaded value (e.g., your IP address).
    const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
    console.log('DEBUG (email.js - inside function): BASE_URL being used:', BASE_URL); // Add this debug log!
    // --- END CRUCIAL CHANGE ---

    const escapedTitle = escapeHtml(issue.title);
    const escapedCategory = escapeHtml(issue.category);
    const escapedLocation = escapeHtml(issue.location);
    const escapedDescription = escapeHtml(issue.description);

    const mediaLinks = Array.isArray(issue.media) && issue.media.length
      ? issue.media.map(url => `<a href="${BASE_URL}${url}" target="_blank">View Media</a>`).join(', ')
      : 'No media attached';

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
        Media: ${Array.isArray(issue.media) && issue.media.length ? issue.media.map(url => `${BASE_URL}${url}`).join(', ') : 'No media attached'}

        This issue has received significant community attention and requires your review.
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully for issue: ${issue.title} to ${authorityEmail}`);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error; // Re-throw the error so the calling function can handle it (as seen in issues.js)
  }
};