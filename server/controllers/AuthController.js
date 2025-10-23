const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");

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

      // reCAPTCHA validation (optional - implement based on your needs)
      if (recaptchaToken) {
        // Here you would verify the reCAPTCHA token with Google's API
        // For now, we'll just log it
        console.log("reCAPTCHA token received:", recaptchaToken);
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

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          id: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
          lastLogin: user.lastLogin
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

  // Get User Profile
  static async getProfile(req, res) {
    try {
      const { userId } = req.params;

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

  // Update User Profile
  static async updateProfile(req, res) {
    try {
      const { userId } = req.params;
      const { email, username, role } = req.body;

      const user = await User.findById(userId);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }

      // Check if email/username is already taken by another user
      if (email && email !== user.email) {
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
        user.email = email.toLowerCase();
      }

      if (username && username !== user.username) {
        const existingUser = await User.findOne({
          username: username,
          _id: { $ne: userId }
        });
        
        if (existingUser) {
          return res.status(409).json({
            success: false,
            message: "Username already taken by another user"
          });
        }
        user.username = username;
      }

      if (role && ['admin', 'staff'].includes(role)) {
        user.role = role;
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

  // Change Password
  static async changePassword(req, res) {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required"
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
}

module.exports = AuthController;
