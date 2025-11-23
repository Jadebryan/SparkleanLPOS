const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All dashboard routes require authentication
router.use(authenticate);

// Get dashboard statistics
router.get('/stats', requirePermission('dashboard', 'read'), DashboardController.getDashboardStats);

module.exports = router;

