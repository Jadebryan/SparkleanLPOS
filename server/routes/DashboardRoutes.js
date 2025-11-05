const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticate } = require('../middleware/auth');

// All dashboard routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', DashboardController.getDashboardStats);

module.exports = router;

