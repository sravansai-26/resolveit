import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
    },

    // IMPORTANT:
    // Make password optional for Google accounts.
    password: {
      type: String,
      required: false,
      minlength: [6, 'Password must be at least 6 characters'],
    },

    phone: {
      type: String,
      required: false,
      default: 'Not provided',
    },

    address: {
      type: String,
      required: false,
      default: 'Not provided',
    },

    bio: {
      type: String,
      default: '',
    },

    avatar: {
      type: String,
      default: '',
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// =======================
// VIRTUALS
// =======================
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// =======================
// PASSWORD HASHING
// =======================
// Hash password ONLY when created or modified
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// =======================
// PASSWORD COMPARISON
// =======================
userSchema.methods.comparePassword = async function (candidatePassword) {
  // If user has no password (Google accounts) -> always reject normal login
  if (!this.password) return false;

  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
