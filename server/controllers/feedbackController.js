import Feedback from '../models/Feedback.js';

export const submitFeedback = async (req, res) => {
  try {
    const { type, subject, message } = req.body;

    if (!type || !subject || !message) {
      return res.status(400).json({ message: 'Type, subject, and message are required.' });
    }

    if (typeof subject !== 'string' || subject.length > 100) {
      return res.status(400).json({ message: 'Subject must be a string with max 100 characters.' });
    }

    if (typeof message !== 'string' || message.length > 1000) {
      return res.status(400).json({ message: 'Message must be a string with max 1000 characters.' });
    }

    const newFeedback = new Feedback({ type, subject, message });
    await newFeedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error('Feedback submission failed:', error);
    res.status(500).json({ message: 'Failed to submit feedback.' });
  }
};
