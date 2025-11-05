const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");
const { verifyRecaptchaV3 } = require('../utils/recaptcha');
require('dotenv').config();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

class AuthController {
  // User Registration
  static async register(req, res) {
    try {
      const { email, username, password, role = "staff" } = req.body;

      // Validation
      if (!email || !username || !password) {
        return res.status(400).json({
          success: false,
          message: "Email, username, and password are required"
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: email.toLowerCase() },
          { username: username }
        ]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: existingUser.email === email.toLowerCase() 
            ? "Email already registered" 
            : "Username already taken"
        });
      }

      // Create new user
      const user = new User({
        email: email.toLowerCase(),
        username,
        password,
        role
      });

      await user.save();

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt
        }
      });

    } catch (error) {
      console.error("Registration error:", error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error during registration"
      });
    }
  }

  // User Login
  static async login(req, res) {
    try {
      const { email, username, password, recaptchaToken } = req.body;

      // Validation
      if (!password) {
        return res.status(400).json({
          success: false,
          message: "Password is required"
        });
      }

      if (!email && !username) {
        return res.status(400).json({
          success: false,
          message: "Email or username is required"
        });
      }

      // reCAPTCHA v3 validation (required if secret key configured)
      if (process.env.RECAPTCHA_SECRET_KEY) {
        if (!recaptchaToken) {
          return res.status(400).json({ success: false, message: 'Missing reCAPTCHA token' });
        }
        const { ok, data, reason } = await verifyRecaptchaV3(recaptchaToken, { action: 'login', minScore: 0.7, remoteIp: req.ip });
        if (!ok) {
          return res.status(403).json({
            success: false,
            message: 'reCAPTCHA validation failed',
            details: data || { reason }
          });
        }
        // Optional: log score for observability (do not expose secrets)
        if (data && typeof data.score === 'number') {
          console.log(`reCAPTCHA v3 score for ${email || username}:`, data.score, 'action:', data.action);
        }
      }

      // Find user by email or username
      const loginIdentifier = email || username;
      const user = await User.findByCredentials(loginIdentifier, password);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Check if account is active
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: "Account is deactivated. Please contact administrator."
        });
      }

      // Update last login
      await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

      // Generate JWT token
      const token = generateToken(user._id);

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          stationId: user.stationId,
          lastLogin: user.lastLogin,
          token: token
        }
      });

    } catch (error) {
      console.error("Login error:", error);
      
      if (error.message === 'Invalid credentials' || error.message.includes('Account is temporarily locked')) {
        return res.status(401).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error during login"
      });
    }
  }

  // Get Current User Profile (authenticated user)
  static async getCurrentUser(req, res) {
    try {
      const user = await User.findById(req.user._id).select('-password -loginAttempts -lockUntil');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error("Get current user error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Get User Profile by ID
  static async getProfile(req, res) {
    try {
      const { userId } = req.params;

      // Staff can only view their own profile, admin can view any
      if (req.user.role === 'staff' && req.user._id.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied. You can only view your own profile."
        });
      }

      const user = await User.findById(userId).select('-password -loginAttempts -lockUntil');
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });

    } catch (error) {
      console.error("Get profile error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Update User Profile (updates current authenticated user)
  static async updateProfile(req, res) {
    try {
      const userId = req.user._id;
      const { email, username } = req.body;

      // Staff cannot change their role, only admin can
      const allowedFields = ['email', 'username'];
      const updates = {};
      
      Object.keys(req.body).forEach(key => {
        if (allowedFields.includes(key)) {
          updates[key] = req.body[key];
        }
      });

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if email/username is already taken by another user
      if (updates.email && updates.email !== user.email) {
        const existingUser = await User.findOne({
          email: updates.email.toLowerCase(),
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "Email already taken by another user"
          });
        }
        user.email = updates.email.toLowerCase();
      }

      if (updates.username && updates.username !== user.username) {
        const existingUser = await User.findOne({
          username: updates.username,
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "Username already taken by another user"
          });
        }
        user.username = updates.username;
      }

      await user.save();

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          updatedAt: user.updatedAt
        }
      });

    } catch (error) {
      console.error("Update profile error:", error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Change Password (changes current authenticated user's password)
  static async changePassword(req, res) {
    try {
      const userId = req.user._id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required"
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "New password must be at least 6 characters long"
        });
      }

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      
      if (!isCurrentPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Current password is incorrect"
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      res.status(200).json({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Get All Users (Admin only)
  static async getAllUsers(req, res) {
    try {
      const users = await User.find({ isActive: true })
        .select('-password -loginAttempts -lockUntil')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        data: users,
        count: users.length
      });

    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Deactivate User (Admin only)
  static async deactivateUser(req, res) {
    try {
      const { userId } = req.params;

      // Prevent admin from deactivating themselves
      if (req.user._id.toString() === userId) {
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own account"
        });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      ).select('-password -loginAttempts -lockUntil');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "User deactivated successfully",
        data: user
      });

    } catch (error) {
      console.error("Deactivate user error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Activate User (Admin only)
  static async activateUser(req, res) {
    try {
      const { userId } = req.params;

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: true },
        { new: true }
      ).select('-password -loginAttempts -lockUntil');

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      res.status(200).json({
        success: true,
        message: "User activated successfully",
        data: user
      });

    } catch (error) {
      console.error("Activate user error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Store verification codes in memory (in production, use Redis or database)
  static verificationCodes = new Map(); // email -> { code, expiresAt }
  
  // Store password reset codes in memory (in production, use Redis or database)
  static resetCodes = new Map(); // email -> { code, expiresAt, userId }

  // Send Verification Code for Email Change
  static async sendVerificationCode(req, res) {
    try {
      const { email } = req.body;
      const userId = req.user._id;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }

      // Check if email is already taken by another user
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: "Email already taken by another user"
        });
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code with expiration (10 minutes)
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      AuthController.verificationCodes.set(email.toLowerCase(), {
        code,
        expiresAt,
        userId: userId.toString()
      });

      // Send verification email
      try {
        await sendVerificationEmail(email, code);
        console.log(`✅ Verification code sent to ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send verification email:', emailError);
        // Return error so user knows email failed
        return res.status(500).json({
          success: false,
          message: `Failed to send verification email: ${emailError.message}. Please check email configuration.`
        });
      }

      res.status(200).json({
        success: true,
        message: "Verification code sent to your email"
      });

    } catch (error) {
      console.error("Send verification code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Verify Email Code
  static async verifyEmailCode(req, res) {
    try {
      const { email, code } = req.body;
      const userId = req.user._id;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email and verification code are required"
        });
      }

      const stored = AuthController.verificationCodes.get(email.toLowerCase());

      if (!stored) {
        return res.status(400).json({
          success: false,
          message: "Verification code not found or expired"
        });
      }

      // Check if code has expired
      if (Date.now() > stored.expiresAt) {
        AuthController.verificationCodes.delete(email.toLowerCase());
        return res.status(400).json({
          success: false,
          message: "Verification code has expired"
        });
      }

      // Check if code matches
      if (stored.code !== code) {
        return res.status(400).json({
          success: false,
          message: "Invalid verification code"
        });
      }

      // Check if code belongs to this user
      if (stored.userId !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Verification code does not belong to this user"
        });
      }

      // Mark as verified (store verification status)
      AuthController.verificationCodes.set(email.toLowerCase(), {
        ...stored,
        verified: true
      });

      res.status(200).json({
        success: true,
        message: "Email verified successfully"
      });

    } catch (error) {
      console.error("Verify email code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Cleanup expired codes (call this periodically)
  static cleanupExpiredCodes() {
    const now = Date.now();
    for (const [email, data] of AuthController.verificationCodes.entries()) {
      if (now > data.expiresAt) {
        AuthController.verificationCodes.delete(email);
      }
    }
  }

  // Forgot Password - Request password reset code
  static async forgotPassword(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email address is required"
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: "Invalid email format"
        });
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase(), isActive: true });

      // Always return success message (security: don't reveal if email exists)
      if (!user) {
        return res.status(200).json({
          success: true,
          message: "If an account exists with that email, a password reset code has been sent"
        });
      }

      // Generate 6-digit reset code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store code with expiration (10 minutes)
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
      AuthController.resetCodes.set(email.toLowerCase(), {
        code: resetCode,
        expiresAt: expiresAt,
        userId: user._id.toString()
      });

      // Send password reset email
      try {
        await sendPasswordResetEmail(email, resetCode);
        console.log(`✅ Password reset code sent to ${email}`);
      } catch (emailError) {
        console.error('❌ Failed to send password reset email:', emailError);
        // Remove the code if email failed
        AuthController.resetCodes.delete(email.toLowerCase());
        // Still return success to user (security: don't reveal if email failed)
        // But log the error for debugging
      }

      res.status(200).json({
        success: true,
        message: "If an account exists with that email, a password reset code has been sent"
      });

    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Verify Reset Code
  static async verifyResetCode(req, res) {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({
          success: false,
          message: "Email and reset code are required"
        });
      }

      const stored = AuthController.resetCodes.get(email.toLowerCase());

      if (!stored) {
        return res.status(400).json({
          success: false,
          message: "Reset code not found or expired"
        });
      }

      // Check if code has expired
      if (Date.now() > stored.expiresAt) {
        AuthController.resetCodes.delete(email.toLowerCase());
        return res.status(400).json({
          success: false,
          message: "Reset code has expired"
        });
      }

      // Check if code matches
      if (stored.code !== code) {
        return res.status(400).json({
          success: false,
          message: "Invalid reset code"
        });
      }

      // Mark as verified
      AuthController.resetCodes.set(email.toLowerCase(), {
        ...stored,
        verified: true
      });

      res.status(200).json({
        success: true,
        message: "Reset code verified successfully"
      });

    } catch (error) {
      console.error("Verify reset code error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }

  // Reset Password - Reset password with code
  static async resetPassword(req, res) {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Email, reset code, and new password are required"
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters long"
        });
      }

      // Verify the reset code
      const stored = AuthController.resetCodes.get(email.toLowerCase());

      if (!stored) {
        return res.status(400).json({
          success: false,
          message: "Reset code not found or expired"
        });
      }

      // Check if code has expired
      if (Date.now() > stored.expiresAt) {
        AuthController.resetCodes.delete(email.toLowerCase());
        return res.status(400).json({
          success: false,
          message: "Reset code has expired"
        });
      }

      // Check if code matches
      if (stored.code !== code) {
        return res.status(400).json({
          success: false,
          message: "Invalid reset code"
        });
      }

      // Check if code has been verified
      if (!stored.verified) {
        return res.status(400).json({
          success: false,
          message: "Reset code must be verified first"
        });
      }

      // Find user
      const user = await User.findById(stored.userId);

      if (!user || !user.isActive) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Update password
      user.password = newPassword;
      await user.save();

      // Remove the reset code after successful password change
      AuthController.resetCodes.delete(email.toLowerCase());

      res.status(200).json({
        success: true,
        message: "Password reset successfully"
      });

    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
}

module.exports = AuthController;
