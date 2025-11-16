# Database Backup and Recovery Setup Guide

This guide explains how to set up and use the database backup and recovery system to meet security requirement #5 (Backup and Recovery Mechanisms).

## Overview

The backup system provides:
- ✅ Automated daily database backups
- ✅ Manual backup creation
- ✅ Backup restoration
- ✅ Backup management (list, delete, cleanup)
- ✅ Automatic cleanup of old backups (retention policy)
- ✅ API endpoints for backup management (admin only)

## Prerequisites

### MongoDB Database Tools

The backup system uses `mongodump` and `mongorestore` from MongoDB Database Tools.

**Installation:**

```bash
# Ubuntu/Debian
wget https://fastdl.mongodb.org/tools/db/mongodb-database-tools-ubuntu2004-x86_64-100.9.4.tgz
tar -xzf mongodb-database-tools-ubuntu2004-x86_64-100.9.4.tgz
sudo cp mongodb-database-tools-ubuntu2004-x86_64-100.9.4/bin/* /usr/local/bin/

# Mac (using Homebrew)
brew install mongodb-database-tools

# Windows
# Download from: https://www.mongodb.com/try/download/database-tools
# Extract and add to PATH

# Verify installation
mongodump --version
mongorestore --version
```

## Configuration

### Environment Variables

Add these to your `server/.env` file:

```env
# Backup Configuration
BACKUP_DIR=./backups                    # Backup storage directory (default: ./backups)
BACKUP_RETENTION_DAYS=30                # Days to keep backups (default: 30)
ENABLE_AUTO_BACKUP=true                 # Enable automated daily backups (default: true)

# MongoDB Connection (already configured)
MONGODB_URI=mongodb://localhost:27017/PracLaundry
```

### Backup Directory

Backups are stored in `server/backups/` by default. Each backup is stored in its own directory with:
- Database dump files
- `backup-metadata.json` - Backup information (timestamp, size, etc.)

## Usage

### Command Line Interface

#### Create a Backup

```bash
# Create backup with auto-generated name
cd server
npm run backup

# Create backup with custom name
node scripts/backup.js --name my-backup-2024-01-01
```

#### List All Backups

```bash
npm run backup:list
# or
node scripts/backup.js --list
```

**Output:**
```
📦 Available Backups:

1. backup-2024-01-01T10-30-00-000Z
   Date: 1/1/2024, 10:30:00 AM
   Size: 15.2 MB
   Database: PracLaundry

2. backup-2024-01-02T10-30-00-000Z
   Date: 1/2/2024, 10:30:00 AM
   Size: 15.5 MB
   Database: PracLaundry
```

#### View Backup Statistics

```bash
npm run backup:stats
# or
node scripts/backup.js --stats
```

#### Cleanup Old Backups

```bash
npm run backup:cleanup
# or
node scripts/backup.js --cleanup
```

This deletes backups older than the retention period (default: 30 days).

#### Restore from Backup

```bash
# Restore backup (keeps existing data, may overwrite)
npm run restore backup-2024-01-01T10-30-00-000Z

# Restore backup (drops existing collections first)
npm run restore backup-2024-01-01T10-30-00-000Z --drop
```

**⚠️ Warning:** Restoring will overwrite existing data. Always backup before restoring!

### API Endpoints (Admin Only)

All backup endpoints require admin authentication.

#### Create Backup

```http
POST /api/backups
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "name": "manual-backup-2024-01-01"  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup created successfully",
  "data": {
    "name": "manual-backup-2024-01-01",
    "path": "./backups/manual-backup-2024-01-01",
    "timestamp": "2024-01-01T10:30:00.000Z",
    "database": "PracLaundry",
    "size": 15925248,
    "sizeFormatted": "15.2 MB"
  }
}
```

#### List All Backups

```http
GET /api/backups
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "name": "backup-2024-01-02T10-30-00-000Z",
      "timestamp": "2024-01-02T10:30:00.000Z",
      "size": 16252928,
      "sizeFormatted": "15.5 MB"
    },
    {
      "name": "backup-2024-01-01T10-30-00-000Z",
      "timestamp": "2024-01-01T10:30:00.000Z",
      "size": 15925248,
      "sizeFormatted": "15.2 MB"
    }
  ]
}
```

#### Get Backup Statistics

```http
GET /api/backups/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalBackups": 5,
    "totalSize": "75.8 MB",
    "oldestBackup": "2023-12-01T10:30:00.000Z",
    "newestBackup": "2024-01-01T10:30:00.000Z",
    "retentionDays": 30,
    "backupDir": "./backups"
  }
}
```

#### Restore from Backup

```http
POST /api/backups/:backupName/restore
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "confirm": true,           // Required: confirmation flag
  "dropExisting": false      // Optional: drop collections before restore
}
```

**Response:**
```json
{
  "success": true,
  "message": "Backup restored successfully",
  "data": {
    "backupName": "backup-2024-01-01T10-30-00-000Z",
    "restoredAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Delete Backup

```http
DELETE /api/backups/:backupName
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Backup deleted successfully",
  "data": {
    "backupName": "backup-2024-01-01T10-30-00-000Z",
    "deletedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### Cleanup Old Backups

```http
POST /api/backups/cleanup
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "data": {
    "deletedCount": 3,
    "freedSpace": "45.6 MB",
    "retentionDays": 30
  }
}
```

## Automated Backups

### Daily Automated Backups

The system automatically creates backups daily at 2 AM (server time) if `ENABLE_AUTO_BACKUP=true`.

**Features:**
- Runs automatically in the background
- Creates timestamped backups
- Logs backup status to console
- Continues even if one backup fails

**Disable Auto-Backup:**
```env
ENABLE_AUTO_BACKUP=false
```

### Automated Cleanup

Old backups are automatically deleted daily at 3 AM based on the retention policy.

**Retention Policy:**
- Default: 30 days
- Configurable via `BACKUP_RETENTION_DAYS` environment variable
- Only backups older than retention period are deleted

## Backup Structure

Each backup directory contains:

```
backups/
└── backup-2024-01-01T10-30-00-000Z/
    ├── PracLaundry/              # Database dump
    │   ├── users.bson
    │   ├── users.metadata.json
    │   ├── orders.bson
    │   ├── orders.metadata.json
    │   └── ... (other collections)
    └── backup-metadata.json      # Backup metadata
```

## Recovery Procedures

### Full Database Recovery

1. **List available backups:**
   ```bash
   npm run backup:list
   ```

2. **Choose a backup to restore:**
   ```bash
   npm run restore backup-2024-01-01T10-30-00-000Z --drop
   ```

3. **Verify restoration:**
   - Check database collections
   - Verify data integrity
   - Test application functionality

### Partial Recovery (Specific Collection)

For partial recovery, you can manually restore specific collections:

```bash
# Restore only users collection
mongorestore --uri="mongodb://localhost:27017/PracLaundry" \
  --collection=users \
  ./backups/backup-2024-01-01T10-30-00-000Z/PracLaundry/users.bson
```

### Point-in-Time Recovery

To restore to a specific point in time:

1. Find the backup closest to your desired restore point
2. Restore that backup
3. Apply any necessary data corrections manually

## Best Practices

### 1. Regular Backups
- ✅ Automated daily backups are enabled by default
- ✅ Create manual backups before major changes
- ✅ Test restore procedures regularly

### 2. Backup Storage
- ✅ Store backups in secure location
- ✅ Consider off-site backups for disaster recovery
- ✅ Encrypt backups if containing sensitive data
- ✅ Use cloud storage (AWS S3, Google Cloud Storage) for production

### 3. Backup Verification
- ✅ Regularly verify backup integrity
- ✅ Test restore procedures monthly
- ✅ Monitor backup sizes (unusual changes may indicate issues)

### 4. Retention Policy
- ✅ Keep at least 30 days of backups
- ✅ Keep weekly backups for 3 months
- ✅ Keep monthly backups for 1 year
- ✅ Adjust retention based on storage capacity

### 5. Disaster Recovery Plan
- ✅ Document recovery procedures
- ✅ Keep backup location information secure
- ✅ Test full system recovery annually
- ✅ Maintain off-site backups

## Cloud Storage Integration

### AWS S3 Backup (Example)

To store backups in AWS S3:

```bash
# After creating backup locally
aws s3 sync ./backups/ s3://your-bucket/backups/ --delete

# Or use a script
#!/bin/bash
npm run backup
aws s3 sync ./backups/ s3://your-bucket/backups/
```

### Google Cloud Storage

```bash
# After creating backup locally
gsutil -m rsync -r ./backups/ gs://your-bucket/backups/
```

## Troubleshooting

### Issue: "mongodump is not installed"

**Solution:**
```bash
# Install MongoDB Database Tools (see Prerequisites section)
# Verify installation:
mongodump --version
```

### Issue: "Permission denied" errors

**Solutions:**
```bash
# Ensure backup directory is writable
chmod 755 ./backups

# Or run with appropriate permissions
sudo npm run backup
```

### Issue: "Backup failed: Connection refused"

**Solutions:**
- Verify MongoDB is running: `mongosh` or `mongo`
- Check MongoDB URI in `.env` file
- Verify network connectivity to MongoDB server
- Check MongoDB authentication credentials

### Issue: "Backup directory not found"

**Solution:**
```bash
# Create backup directory
mkdir -p ./backups
chmod 755 ./backups
```

### Issue: "Out of disk space"

**Solutions:**
- Cleanup old backups: `npm run backup:cleanup`
- Reduce retention period: `BACKUP_RETENTION_DAYS=14`
- Move backups to external storage
- Compress backups (add compression to backup script)

## Monitoring

### Check Backup Status

```bash
# View backup statistics
npm run backup:stats

# List recent backups
npm run backup:list
```

### Monitor Backup Logs

Check server logs for backup status:
- ✅ Successful backups: `✅ Scheduled backup completed`
- ❌ Failed backups: `❌ Scheduled backup failed`

### Set Up Alerts

Consider setting up alerts for:
- Failed backups
- Backup size anomalies
- Disk space warnings
- Backup age (if no recent backups)

## Security Considerations

1. ✅ **Backup Access**: Only admins can manage backups via API
2. ✅ **Backup Storage**: Store backups securely (encrypted if sensitive)
3. ✅ **Backup Retention**: Don't keep backups longer than necessary
4. ✅ **Backup Testing**: Regularly test restore procedures
5. ✅ **Off-Site Backups**: Maintain backups in separate location

## Verification Checklist

- [ ] MongoDB Database Tools installed
- [ ] Backup directory created and writable
- [ ] Environment variables configured
- [ ] Manual backup test successful
- [ ] Automated backups running (check logs)
- [ ] Backup restoration tested
- [ ] Old backup cleanup working
- [ ] API endpoints accessible (admin only)
- [ ] Backup storage location secure
- [ ] Recovery procedures documented

## Additional Resources

- [MongoDB Backup Methods](https://docs.mongodb.com/manual/core/backups/)
- [MongoDB Database Tools](https://docs.mongodb.com/database-tools/)
- [Disaster Recovery Planning](https://docs.mongodb.com/manual/administration/production-notes/)

---

**Status:** ✅ Backup and Recovery implementation complete
**Requirement:** #5 - Backup and Recovery Mechanisms

