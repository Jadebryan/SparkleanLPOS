const express = require("express");
const AuthController = require("../controllers/AuthController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Public routes (no authentication required)
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.post("/forgot-password", AuthController.forgotPassword);
router.post("/verify-reset-code", AuthController.verifyResetCode);
router.post("/reset-password", AuthController.resetPassword);

// Protected routes (authentication required)
// Logout
router.post("/logout", authenticate, AuthController.logout);
// Get current user profile
router.get("/me", authenticate, AuthController.getCurrentUser);
router.put("/me", authenticate, AuthController.updateProfile);
router.put("/change-password", authenticate, AuthController.changePassword);

// Email verification routes
router.post("/send-verification-code", authenticate, AuthController.sendVerificationCode);
router.post("/verify-email-code", authenticate, AuthController.verifyEmailCode);

// User profile routes (by ID - for viewing other users)
router.get("/profile/:userId", authenticate, AuthController.getProfile);

// Admin only routes
router.get("/users", authenticate, authorize('admin'), AuthController.getAllUsers);
router.put("/deactivate/:userId", authenticate, authorize('admin'), AuthController.deactivateUser);
router.put("/activate/:userId", authenticate, authorize('admin'), AuthController.activateUser);

module.exports = router;
