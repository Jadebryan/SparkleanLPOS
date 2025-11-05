const express = require('express');
const router = express.Router();
const StationController = require('../controllers/StationController');
const { authenticate } = require('../middleware/auth');

// All station routes require authentication
router.use(authenticate);

// Get all stations (both admin and staff can view)
router.get('/', StationController.getAllStations);

// Get single station
router.get('/:id', StationController.getStation);

// Create station (admin only)
router.post('/', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
}, StationController.createStation);

// Update station (admin only)
router.put('/:id', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
}, StationController.updateStation);

// Archive station (admin only)
router.put('/:id/archive', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
}, StationController.archiveStation);

// Unarchive station (admin only)
router.put('/:id/unarchive', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
}, StationController.unarchiveStation);

// Delete station (admin only)
router.delete('/:id', (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin only.'
    });
  }
  next();
}, StationController.deleteStation);

module.exports = router;

