const express = require('express');
const ServiceController = require('../controllers/ServiceController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All service routes require authentication
router.use(authenticate);

// Get all services
router.get('/', requirePermission('services', 'read'), ServiceController.getAllServices);

// Get single service
router.get('/:id', requirePermission('services', 'read'), ServiceController.getService);

// Create service
router.post('/', requirePermission('services', 'create'), ServiceController.createService);

// Update service
router.put('/:id', requirePermission('services', 'update'), ServiceController.updateService);

// Archive service
router.put('/:id/archive', requirePermission('services', 'archive'), ServiceController.archiveService);

// Unarchive service
router.put('/:id/unarchive', requirePermission('services', 'unarchive'), ServiceController.unarchiveService);

module.exports = router;

