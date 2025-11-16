const express = require('express');
const BackupController = require('../controllers/BackupController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All backup routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Create backup
router.post('/', BackupController.createBackup);

// List all backups
router.get('/', BackupController.listBackups);

// Get backup statistics
router.get('/stats', BackupController.getBackupStats);

// Restore from backup
router.post('/:backupName/restore', BackupController.restoreBackup);

// Delete backup
router.delete('/:backupName', BackupController.deleteBackup);

// Cleanup old backups
router.post('/cleanup', BackupController.cleanupBackups);

module.exports = router;

