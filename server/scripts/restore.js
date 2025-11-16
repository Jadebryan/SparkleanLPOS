#!/usr/bin/env node

/**
 * MongoDB Restore Script
 * 
 * Usage:
 *   node scripts/restore.js <backup-name>           # Restore backup (keeps existing data)
 *   node scripts/restore.js <backup-name> --drop  # Restore backup (drops existing collections)
 */

require('dotenv').config();
const backupService = require('../utils/backupService');

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\n❌ Error: Backup name is required\n');
    console.log('Usage:');
    console.log('  node scripts/restore.js <backup-name>           # Restore (keeps existing)');
    console.log('  node scripts/restore.js <backup-name> --drop     # Restore (drops existing)\n');
    process.exit(1);
  }

  const backupName = args[0];
  const dropExisting = args.includes('--drop') || args.includes('-d');

  // List available backups if backup not found
  const backups = backupService.listBackups();
  const backupExists = backups.some(b => b.name === backupName);

  if (!backupExists) {
    console.log(`\n❌ Backup not found: ${backupName}\n`);
    console.log('Available backups:');
    backups.forEach((backup, index) => {
      console.log(`  ${index + 1}. ${backup.name} (${new Date(backup.timestamp).toLocaleString()})`);
    });
    console.log('');
    process.exit(1);
  }

  // Confirm restore
  if (dropExisting) {
    console.log('\n⚠️  WARNING: This will DROP all existing collections before restoring!');
    console.log('   All current data will be lost!\n');
  } else {
    console.log('\n⚠️  WARNING: This will restore data and may overwrite existing records!');
    console.log('   Use --drop flag to drop existing collections first.\n');
  }

  console.log(`Backup: ${backupName}`);
  console.log(`Database: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/PracLaundry'}\n`);

  // In a real scenario, you might want to add a confirmation prompt here
  // For now, proceed with restore

  console.log('🔄 Starting restore...\n');
  const result = await backupService.restoreBackup(backupName, dropExisting);

  if (result.success) {
    console.log('\n✅ Restore completed successfully!\n');
    process.exit(0);
  } else {
    console.log(`\n❌ Restore failed: ${result.error}\n`);
    process.exit(1);
  }
}

// Run script
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

