const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * MongoDB Backup Service
 * Provides backup and restore functionality for MongoDB database
 */
class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/PracLaundry';
    this.dbName = this.extractDatabaseName(this.mongoUri);
    this.retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || '30', 10);
    
    // Ensure backup directory exists
    this.ensureBackupDir();
  }

  /**
   * Extract database name from MongoDB URI
   */
  extractDatabaseName(uri) {
    try {
      // Handle different URI formats
      if (uri.includes('/')) {
        const parts = uri.split('/');
        const dbPart = parts[parts.length - 1];
        // Remove query parameters if any
        return dbPart.split('?')[0];
      }
      return 'PracLaundry'; // Default
    } catch (error) {
      console.error('Error extracting database name:', error);
      return 'PracLaundry';
    }
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log(`Created backup directory: ${this.backupDir}`);
    }
  }

  /**
   * Check if mongodump is available
   */
  checkMongoDumpAvailable() {
    try {
      execSync('mongodump --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a backup of the database
   * @param {string} backupName - Optional custom backup name
   * @returns {Object} Backup result with path and metadata
   */
  async createBackup(backupName = null) {
    try {
      if (!this.checkMongoDumpAvailable()) {
        throw new Error('mongodump is not installed or not in PATH. Please install MongoDB Database Tools.');
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const name = backupName || `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, name);

      // Build mongodump command
      let command = `mongodump --uri="${this.mongoUri}" --out="${backupPath}"`;

      // If URI contains authentication, mongodump should handle it
      // Otherwise, we might need to parse and use --host, --port, --db, etc.

      console.log(`Creating backup: ${name}`);
      console.log(`Backup path: ${backupPath}`);

      // Execute backup
      execSync(command, { stdio: 'inherit' });

      // Get backup size
      const backupSize = this.getDirectorySize(backupPath);

      // Create backup metadata
      const metadata = {
        name,
        path: backupPath,
        timestamp: new Date().toISOString(),
        database: this.dbName,
        size: backupSize,
        sizeFormatted: this.formatBytes(backupSize)
      };

      // Save metadata
      const metadataPath = path.join(backupPath, 'backup-metadata.json');
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

      console.log(`✅ Backup created successfully: ${name}`);
      console.log(`   Size: ${metadata.sizeFormatted}`);
      console.log(`   Location: ${backupPath}`);

      return {
        success: true,
        ...metadata
      };

    } catch (error) {
      console.error('❌ Backup failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Restore database from backup
   * @param {string} backupName - Name of the backup to restore
   * @param {boolean} dropExisting - Whether to drop existing collections before restore
   * @returns {Object} Restore result
   */
  async restoreBackup(backupName, dropExisting = false) {
    try {
      if (!this.checkMongoRestoreAvailable()) {
        throw new Error('mongorestore is not installed or not in PATH. Please install MongoDB Database Tools.');
      }

      const backupPath = path.join(this.backupDir, backupName);
      const dbBackupPath = path.join(backupPath, this.dbName);

      // Check if backup exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      if (!fs.existsSync(dbBackupPath)) {
        throw new Error(`Database backup directory not found: ${dbBackupPath}`);
      }

      console.log(`Restoring backup: ${backupName}`);
      console.log(`From: ${dbBackupPath}`);
      console.log(`To: ${this.mongoUri}`);

      // Build mongorestore command
      let command = `mongorestore --uri="${this.mongoUri}" "${dbBackupPath}"`;

      if (dropExisting) {
        command += ' --drop';
        console.log('⚠️  Warning: Existing collections will be dropped!');
      }

      // Execute restore
      execSync(command, { stdio: 'inherit' });

      console.log(`✅ Backup restored successfully: ${backupName}`);

      return {
        success: true,
        backupName,
        restoredAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Restore failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if mongorestore is available
   */
  checkMongoRestoreAvailable() {
    try {
      execSync('mongorestore --version', { stdio: 'ignore' });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * List all available backups
   * @returns {Array} List of backup metadata
   */
  listBackups() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const backups = [];
      const items = fs.readdirSync(this.backupDir, { withFileTypes: true });

      for (const item of items) {
        if (item.isDirectory()) {
          const backupPath = path.join(this.backupDir, item.name);
          const metadataPath = path.join(backupPath, 'backup-metadata.json');

          if (fs.existsSync(metadataPath)) {
            try {
              const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
              backups.push(metadata);
            } catch (error) {
              // If metadata doesn't exist, create basic info
              const stats = fs.statSync(backupPath);
              backups.push({
                name: item.name,
                path: backupPath,
                timestamp: stats.birthtime.toISOString(),
                size: this.getDirectorySize(backupPath),
                sizeFormatted: this.formatBytes(this.getDirectorySize(backupPath))
              });
            }
          }
        }
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;
    } catch (error) {
      console.error('Error listing backups:', error);
      return [];
    }
  }

  /**
   * Delete old backups based on retention policy
   * @returns {Object} Cleanup result
   */
  cleanupOldBackups() {
    try {
      const backups = this.listBackups();
      const now = new Date();
      const cutoffDate = new Date(now.getTime() - (this.retentionDays * 24 * 60 * 60 * 1000));

      let deletedCount = 0;
      let freedSpace = 0;

      for (const backup of backups) {
        const backupDate = new Date(backup.timestamp);
        if (backupDate < cutoffDate) {
          const backupPath = backup.path || path.join(this.backupDir, backup.name);
          if (fs.existsSync(backupPath)) {
            const size = backup.size || this.getDirectorySize(backupPath);
            this.deleteBackup(backup.name);
            deletedCount++;
            freedSpace += size;
          }
        }
      }

      return {
        success: true,
        deletedCount,
        freedSpace: this.formatBytes(freedSpace),
        retentionDays: this.retentionDays
      };
    } catch (error) {
      console.error('Error cleaning up backups:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Delete a specific backup
   * @param {string} backupName - Name of backup to delete
   * @returns {Object} Deletion result
   */
  deleteBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      // Remove directory recursively
      fs.rmSync(backupPath, { recursive: true, force: true });

      console.log(`✅ Backup deleted: ${backupName}`);

      return {
        success: true,
        backupName,
        deletedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to delete backup ${backupName}:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get total size of a directory
   * @param {string} dirPath - Directory path
   * @returns {number} Size in bytes
   */
  getDirectorySize(dirPath) {
    let size = 0;
    try {
      const files = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        if (file.isDirectory()) {
          size += this.getDirectorySize(filePath);
        } else {
          const stats = fs.statSync(filePath);
          size += stats.size;
        }
      }
    } catch (error) {
      console.error(`Error calculating directory size for ${dirPath}:`, error);
    }
    return size;
  }

  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Get backup statistics
   * @returns {Object} Backup statistics
   */
  getBackupStats() {
    const backups = this.listBackups();
    const totalSize = backups.reduce((sum, backup) => sum + (backup.size || 0), 0);
    const oldestBackup = backups.length > 0 ? backups[backups.length - 1] : null;
    const newestBackup = backups.length > 0 ? backups[0] : null;

    return {
      totalBackups: backups.length,
      totalSize: this.formatBytes(totalSize),
      oldestBackup: oldestBackup ? oldestBackup.timestamp : null,
      newestBackup: newestBackup ? newestBackup.timestamp : null,
      retentionDays: this.retentionDays,
      backupDir: this.backupDir
    };
  }
}

module.exports = new BackupService();

