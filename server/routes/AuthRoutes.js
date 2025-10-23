const express = require("express");
const AuthController = require("../controllers/AuthController");

const router = express.Router();

// Public routes (no authentication required)
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

// Protected routes (authentication required)
// Note: In a real application, you would add middleware to verify JWT tokens here
// For now, these routes are accessible but you should add authentication middleware

// User profile routes
router.get("/profile/:userId", AuthController.getProfile);
router.put("/profile/:userId", AuthController.updateProfile);
router.put("/change-password/:userId", AuthController.changePassword);

// Admin routes
router.get("/users", AuthController.getAllUsers);
router.put("/deactivate/:userId", AuthController.deactivateUser);

module.exports = router;
