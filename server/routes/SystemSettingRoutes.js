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

// Branch-specific point rules
router.get('/points/branch', SystemSettingController.getBranchPointRules);
router.put('/points/branch', SystemSettingController.updateBranchPointRules);

// Voucher system configuration
router.get('/vouchers', SystemSettingController.getVoucherSettings);
router.put('/vouchers', SystemSettingController.updateVoucherSettings);

module.exports = router;

