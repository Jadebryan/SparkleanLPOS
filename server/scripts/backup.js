#!/usr/bin/env node

/**
 * MongoDB Backup Script
 * 
 * Usage:
 *   node scripts/backup.js                    # Create backup with auto-generated name
 *   node scripts/backup.js --name my-backup  # Create backup with custom name
 *   node scripts/backup.js --list            # List all backups
 *   node scripts/backup.js --cleanup         # Delete old backups based on retention policy
 *   node scripts/backup.js --stats           # Show backup statistics
 */

require('dotenv').config();
const backupService = require('../utils/backupService');

async function main() {
  const args = process.argv.slice(2);

  // List backups
  if (args.includes('--list') || args.includes('-l')) {
    console.log('\n📦 Available Backups:\n');
    const backups = backupService.listBackups();
    
    if (backups.length === 0) {
      console.log('No backups found.\n');
      return;
    }

    backups.forEach((backup, index) => {
      console.log(`${index + 1}. ${backup.name}`);
      console.log(`   Date: ${new Date(backup.timestamp).toLocaleString()}`);
      console.log(`   Size: ${backup.sizeFormatted || backupService.formatBytes(backup.size || 0)}`);
      console.log(`   Database: ${backup.database || 'N/A'}\n`);
    });
    return;
  }

  // Show statistics
  if (args.includes('--stats') || args.includes('-s')) {
    console.log('\n📊 Backup Statistics:\n');
    const stats = backupService.getBackupStats();
    console.log(`Total Backups: ${stats.totalBackups}`);
    console.log(`Total Size: ${stats.totalSize}`);
    console.log(`Retention Policy: ${stats.retentionDays} days`);
    console.log(`Backup Directory: ${stats.backupDir}`);
    if (stats.oldestBackup) {
      console.log(`Oldest Backup: ${new Date(stats.oldestBackup).toLocaleString()}`);
    }
    if (stats.newestBackup) {
      console.log(`Newest Backup: ${new Date(stats.newestBackup).toLocaleString()}`);
    }
    console.log('');
    return;
  }

  // Cleanup old backups
  if (args.includes('--cleanup') || args.includes('-c')) {
    console.log('\n🧹 Cleaning up old backups...\n');
    const result = backupService.cleanupOldBackups();
    
    if (result.success) {
      console.log(`✅ Cleanup complete:`);
      console.log(`   Deleted: ${result.deletedCount} backup(s)`);
      console.log(`   Freed: ${result.freedSpace}`);
      console.log(`   Retention: ${result.retentionDays} days\n`);
    } else {
      console.log(`❌ Cleanup failed: ${result.error}\n`);
    }
    return;
  }

  // Create backup
  const nameIndex = args.indexOf('--name') || args.indexOf('-n');
  const backupName = nameIndex !== -1 && args[nameIndex + 1] 
    ? args[nameIndex + 1] 
    : null;

  console.log('\n🔄 Starting backup...\n');
  const result = await backupService.createBackup(backupName);

  if (result.success) {
    console.log('\n✅ Backup completed successfully!\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Backup failed: ${result.error}\n`);
    process.exit(1);
  }
}

// Run script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

