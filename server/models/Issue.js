// server/models/Issue.js
import mongoose from 'mongoose';

// -----------------------------------------------------------
// 1. Comment Sub-Schema (Nested Document)
// -----------------------------------------------------------
const commentSchema = new mongoose.Schema({
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
}, { _id: true }); // Ensure comments have their own _id

// -----------------------------------------------------------
// 2. Main Issue Schema
// -----------------------------------------------------------
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
  // media stores paths/URLs from Cloudinary
  media: [{
    type: String,
    trim: true,
  }],
  // Array of embedded vote documents
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
  // CRITICAL: These are the cached counts used by the client for performance
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
  // Reposts stores an array of User IDs who reposted the issue
  reposts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  // Embedded comments using the commentSchema
  comments: [commentSchema] 
}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true } // Ensure virtuals are included in JSON response
});

// -----------------------------------------------------------
// 3. Virtual Fields
// -----------------------------------------------------------

// Virtual property for repostCount (Length of the reposts array)
issueSchema.virtual('repostCount').get(function() {
  // If reposts is an array, return its length, otherwise 0
  return this.reposts ? this.reposts.length : 0;
});


// -----------------------------------------------------------
// 4. Indexing (For faster lookups on the homepage)
// -----------------------------------------------------------
issueSchema.index({ status: 1 });
issueSchema.index({ category: 1 });
issueSchema.index({ location: 1 }); // Added index for location filter

export default mongoose.model('Issue', issueSchema);