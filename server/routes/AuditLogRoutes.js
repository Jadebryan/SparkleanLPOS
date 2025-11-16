const express = require('express');
const AuditLogController = require('../controllers/AuditLogController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All audit log routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Get audit logs
router.get('/', AuditLogController.getAuditLogs);

// Get audit log statistics
router.get('/stats', AuditLogController.getAuditLogStats);

// Get audit log by ID
router.get('/:id', AuditLogController.getAuditLogById);

module.exports = router;

