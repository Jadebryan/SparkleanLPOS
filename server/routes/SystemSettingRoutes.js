const express = require('express');
const router = express.Router();
const SystemSettingController = require('../controllers/SystemSettingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/inactivity', SystemSettingController.getInactivitySettings);
router.put('/inactivity', SystemSettingController.updateInactivitySetting);

// Loyalty points / rewards configuration
router.get('/points', SystemSettingController.getPointsSettings);
router.put('/points', SystemSettingController.updatePointsSettings);

module.exports = router;

