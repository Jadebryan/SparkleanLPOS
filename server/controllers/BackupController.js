const backupService = require('../utils/backupService');

/**
 * Backup Controller
 * Provides API endpoints for backup management (Admin only)
 */
class BackupController {
  /**
   * Create a new backup
   * POST /api/backups
   */
  static async createBackup(req, res) {
    try {
      const { name } = req.body;
      
      const result = await backupService.createBackup(name);

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Backup created successfully',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Backup failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Create backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * List all backups
   * GET /api/backups
   */
  static async listBackups(req, res) {
    try {
      const backups = backupService.listBackups();

      res.status(200).json({
        success: true,
        count: backups.length,
        data: backups
      });
    } catch (error) {
      console.error('List backups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Get backup statistics
   * GET /api/backups/stats
   */
  static async getBackupStats(req, res) {
    try {
      const stats = backupService.getBackupStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Get backup stats error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Restore from backup
   * POST /api/backups/:backupName/restore
   */
  static async restoreBackup(req, res) {
    try {
      const { backupName } = req.params;
      const { dropExisting = false } = req.body;

      // Additional confirmation check
      if (!req.body.confirm) {
        return res.status(400).json({
          success: false,
          message: 'Restore confirmation required. Set "confirm: true" in request body.'
        });
      }

      const result = await backupService.restoreBackup(backupName, dropExisting);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Backup restored successfully',
          data: result
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Restore failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Restore backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Delete a backup
   * DELETE /api/backups/:backupName
   */
  static async deleteBackup(req, res) {
    try {
      const { backupName } = req.params;

      const result = backupService.deleteBackup(backupName);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: 'Backup deleted successfully',
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'Backup not found or deletion failed',
          error: result.error
        });
      }
    } catch (error) {
      console.error('Delete backup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }

  /**
   * Cleanup old backups
   * POST /api/backups/cleanup
   */
  static async cleanupBackups(req, res) {
    try {
      const result = backupService.cleanupOldBackups();

      res.status(200).json({
        success: true,
        message: 'Cleanup completed',
        data: result
      });
    } catch (error) {
      console.error('Cleanup backups error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error.message
      });
    }
  }
}

module.exports = BackupController;

