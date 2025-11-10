import mongoose from 'mongoose';

const issueSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Road Infrastructure', 'Sanitation', 'Public Safety', 'Environmental', 'Public Transport', 'Other']
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  media: [{
    type: String,
    trim: true,
  }],
  votes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isUpvote: {
      type: Boolean,
      required: true
    }
  }],
  upvotes: {
    type: Number,
    default: 0
  },
  downvotes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  reposts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // ** Added this comments field **
  comments: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for faster queries by status or category if needed
issueSchema.index({ status: 1 });
issueSchema.index({ category: 1 });

export default mongoose.model('Issue', issueSchema);