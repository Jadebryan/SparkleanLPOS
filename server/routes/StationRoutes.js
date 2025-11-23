const express = require('express');
const router = express.Router();
const StationController = require('../controllers/StationController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// Public route for landing page (no authentication required)
router.get('/public', StationController.getPublicStations);

// All other station routes require authentication
router.use(authenticate);

// Get all stations
router.get('/', requirePermission('stations', 'read'), StationController.getAllStations);

// Get single station
router.get('/:id', requirePermission('stations', 'read'), StationController.getStation);

// Create station
router.post('/', requirePermission('stations', 'create'), StationController.createStation);

// Update station
router.put('/:id', requirePermission('stations', 'update'), StationController.updateStation);

// Archive station
router.put('/:id/archive', requirePermission('stations', 'archive'), StationController.archiveStation);

// Unarchive station
router.put('/:id/unarchive', requirePermission('stations', 'unarchive'), StationController.unarchiveStation);

// Delete station
router.delete('/:id', requirePermission('stations', 'delete'), StationController.deleteStation);

module.exports = router;

