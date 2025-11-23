const express = require('express');
const AuditLogController = require('../controllers/AuditLogController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All audit log routes require authentication
router.use(authenticate);

// Get audit logs
router.get('/', requirePermission('auditLogs', 'read'), AuditLogController.getAuditLogs);

// Get audit log statistics
router.get('/stats', requirePermission('auditLogs', 'read'), AuditLogController.getAuditLogStats);

// Get audit log by ID
router.get('/:id', requirePermission('auditLogs', 'read'), AuditLogController.getAuditLogById);

module.exports = router;

