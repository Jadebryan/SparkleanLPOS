const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, "Please enter a valid email"]
  },
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    minlength: [3, "Username must be at least 3 characters long"],
    maxlength: [30, "Username cannot exceed 30 characters"]
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"]
  },
  role: {
    type: String,
    enum: ["admin", "staff"],
    default: "staff",
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  resetPasswordToken: {
    type: String,
    default: null
  },
  resetPasswordExpires: {
    type: Date,
    default: null
  },
  stationId: {
    type: String,
    trim: true,
    default: null
  },
  location: {
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    locationUpdatedAt: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// Indexes
// Unique indexes are automatically created by unique: true in schema (email, username)
// Additional indexes for query optimization
userSchema.index({ role: 1, isActive: 1 }); // For filtering users by role and status
userSchema.index({ stationId: 1 }); // For filtering users by station
userSchema.index({ lastLogin: -1 }); // For sorting by last login

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Ensure we have a password to compare
    if (!candidatePassword || !this.password) {
      console.log('[Auth] Missing password for comparison');
      return false;
    }

    // Trim the candidate password to handle whitespace issues
    const trimmedPassword = candidatePassword.trim();
    
    // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (!this.password.startsWith('$2')) {
      console.log('[Auth] WARNING: Password is not hashed! This is a security issue.');
      // For backwards compatibility, do plain text comparison (NOT RECOMMENDED)
      return trimmedPassword === this.password;
    }

    // Use bcrypt to compare
    const isMatch = await bcrypt.compare(trimmedPassword, this.password);
    
    if (!isMatch) {
      // Also try without trimming in case password was stored with spaces
      const isMatchUntrimmed = await bcrypt.compare(candidatePassword, this.password);
      return isMatchUntrimmed;
    }
    
    return isMatch;
  } catch (error) {
    console.error('[Auth] Password comparison error:', error);
    throw error;
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function() {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }
  
  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
    $set: { lastLogin: new Date() }
  });
};

// Static method to find user by email or username
userSchema.statics.findByCredentials = async function(loginIdentifier, password) {
  // Trim and normalize the login identifier
  const identifier = loginIdentifier ? loginIdentifier.trim() : '';
  
  if (!identifier || !password) {
    throw new Error('Invalid credentials');
  }

  // Try to find user by email (case-insensitive) or username (case-sensitive but trimmed)
  const user = await this.findOne({
    $or: [
      { email: identifier.toLowerCase() },
      { username: identifier.trim() }
    ],
    isActive: true
  });

  if (!user) {
    console.log(`[Auth] User not found for identifier: ${identifier}`);
    throw new Error('Invalid credentials');
  }

  if (user.isLocked) {
    console.log(`[Auth] Account locked for user: ${user.email || user.username}`);
    throw new Error('Account is temporarily locked due to too many failed login attempts');
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  
  if (!isMatch) {
    console.log(`[Auth] Password mismatch for user: ${user.email || user.username}`);
    await user.incLoginAttempts();
    throw new Error('Invalid credentials');
  }

  // Reset login attempts on successful login
  if (user.loginAttempts > 0) {
    await user.resetLoginAttempts();
  }

  console.log(`[Auth] Successful login for user: ${user.email || user.username}`);
  return user;
};

// Transform JSON output to remove sensitive data
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.loginAttempts;
  delete userObject.lockUntil;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
