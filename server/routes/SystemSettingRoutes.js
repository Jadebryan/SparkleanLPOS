const express = require('express');
const router = express.Router();
const SystemSettingController = require('../controllers/SystemSettingController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/inactivity', SystemSettingController.getInactivitySettings);
router.put('/inactivity', SystemSettingController.updateInactivitySetting);

module.exports = router;

