const express = require('express');
const BackupController = require('../controllers/BackupController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All backup routes require authentication
router.use(authenticate);

// Create backup
router.post('/', requirePermission('backups', 'create'), BackupController.createBackup);

// List all backups
router.get('/', requirePermission('backups', 'read'), BackupController.listBackups);

// Get backup statistics
router.get('/stats', requirePermission('backups', 'read'), BackupController.getBackupStats);

// Restore from backup
router.post('/:backupName/restore', requirePermission('backups', 'restore'), BackupController.restoreBackup);

// Delete backup
router.delete('/:backupName', requirePermission('backups', 'delete'), BackupController.deleteBackup);

// Cleanup old backups
router.post('/cleanup', requirePermission('backups', 'cleanup'), BackupController.cleanupBackups);

module.exports = router;

