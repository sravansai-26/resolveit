// server/models/Feedback.js
import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  type: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('Feedback', feedbackSchema);