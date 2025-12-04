import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true, // Critical for preventing duplicate accounts
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  password: {
    type: String,
    required: false,          // Changed to optional for Google sign-in users
    minlength: [6, 'Password must be at least 6 characters']
  },
  phone: {
    type: String,
    required: false            // Changed to optional for Google sign-in users
    // Add specific regex for 10-digit phone if needed: match: [/^\d{10}$/, 'Must be a 10-digit phone number']
  },
  address: {
    type: String,
    required: false           // Changed to optional for Google sign-in users
  },
  bio: {
    type: String,
    default: ''
  },
  // avatar stores the URL/path to the image (local path or Cloudinary URL)
  avatar: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true }); // Added timestamps option for created/updated fields

// Virtual property for full name, returned to the client in JSON responses
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Make sure virtuals are included and transform response before saving
userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    delete ret.__v; // Clean up MongoDB version key
    return ret;
  }
});

// Middleware: Hash password before saving or updating
userSchema.pre('save', async function(next) {
  // Only hash if the password field has been modified and exists
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare a plain text password with the hashed password.
 * @param candidatePassword - Plain text password from the login form.
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  // Check if the current instance has a password to compare against
  if (!this.password) return false;

  // Use bcrypt to compare the two passwords
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
