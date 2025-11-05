const express = require('express');
const ServiceController = require('../controllers/ServiceController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All service routes require authentication
router.use(authenticate);

// Get all services (both admin and staff can view)
router.get('/', ServiceController.getAllServices);

// Get single service
router.get('/:id', ServiceController.getService);

// Create service (admin only)
router.post('/', authorize('admin'), ServiceController.createService);

// Update service (admin only)
router.put('/:id', authorize('admin'), ServiceController.updateService);

// Archive service (admin only)
router.put('/:id/archive', authorize('admin'), ServiceController.archiveService);

// Unarchive service (admin only)
router.put('/:id/unarchive', authorize('admin'), ServiceController.unarchiveService);

module.exports = router;

