# Logging and Monitoring Setup Guide

This guide explains the logging and monitoring system implemented to meet security requirement #4 (Logging and Monitoring).

## Overview

The system provides:
- ✅ Structured logging with multiple log levels
- ✅ File-based logging with daily rotation
- ✅ Console logging with color coding
- ✅ Request/response logging middleware
- ✅ Audit trail for user activities
- ✅ Security event logging
- ✅ System event logging
- ✅ API endpoints for viewing audit logs (admin only)

## Logging System

### Log Levels

The system supports five log levels (in order of priority):

1. **ERROR** (0) - Error events that might still allow the application to continue
2. **WARN** (1) - Warning messages for potentially harmful situations
3. **INFO** (2) - Informational messages about general application flow
4. **HTTP** (3) - HTTP request/response logging
5. **DEBUG** (4) - Detailed information for debugging

### Log Storage

Logs are stored in two locations:

1. **File Logs** (`server/logs/`):
   - Separate files per log level and date
   - Format: `{level}-{YYYY-MM-DD}.log`
   - Example: `error-2024-01-01.log`, `info-2024-01-01.log`

2. **Database** (Audit Logs):
   - Stored in `auditlogs` collection
   - Includes user actions, system events, security events
   - Auto-deleted after 90 days (TTL index)

### Configuration

Add these to your `server/.env` file:

```env
# Logging Configuration
LOG_DIR=./logs                    # Log file directory (default: ./logs)
LOG_LEVEL=info                    # Minimum log level (error, warn, info, http, debug)
LOG_CONSOLE=true                  # Enable console logging (default: true)
LOG_FILE=true                     # Enable file logging (default: true)
```

### Log Format

**File Logs:**
```
[2024-01-01T10:30:00.000Z] [INFO] User logged in successfully {"userId":"123","email":"user@example.com"}
```

**Console Logs:**
- Color-coded by log level
- Includes timestamp and log level
- Metadata displayed as JSON

## Usage

### Basic Logging

```javascript
const logger = require('./utils/logger');

// Log info message
logger.info('User created successfully', { userId: '123', email: 'user@example.com' });

// Log warning
logger.warn('High memory usage detected', { memoryUsage: '85%' });

// Log error
logger.error('Database connection failed', { error: error.message });

// Log debug (only in debug mode)
logger.debug('Processing request', { requestId: 'abc123' });

// Log HTTP request
logger.http('API request received', { method: 'POST', endpoint: '/api/orders' });
```

### Audit Logging

```javascript
const auditLogger = require('./utils/auditLogger');

// Log user action
await auditLogger.logUserAction('create_order', userId, {
  resource: 'order',
  resourceId: orderId,
  method: 'POST',
  endpoint: '/api/orders',
  ipAddress: req.ip,
  userAgent: req.get('user-agent')
});

// Log login
await auditLogger.logLogin(userId, email, true, {
  role: 'admin',
  ipAddress: req.ip
});

// Log security event
await auditLogger.logSecurityEvent('failed_login', {
  userEmail: email,
  ipAddress: req.ip,
  details: { attempts: 5 }
});
```

### Request Logging

Request logging is automatic via middleware. All HTTP requests are logged with:
- Method and URL
- IP address
- User agent
- User ID (if authenticated)
- Response status code
- Request duration

## Audit Trail

### What Gets Logged

#### User Actions
- Login/logout events
- Data creation (orders, customers, etc.)
- Data updates
- Data deletions
- Access attempts (granted/denied)

#### System Events
- Server startup/shutdown
- Database connections
- Scheduled tasks
- Backup operations
- System errors

#### Security Events
- Failed login attempts
- Account lockouts
- Unauthorized access attempts
- Permission violations
- Suspicious activities

### Audit Log Model

Each audit log entry contains:

```javascript
{
  type: 'user_action' | 'system_event' | 'security_event',
  action: String,              // e.g., 'login_success', 'create_order'
  userId: ObjectId,           // User who performed action (if applicable)
  userEmail: String,          // User email
  userRole: String,          // 'admin' or 'staff'
  resource: String,           // Resource type (e.g., 'order', 'customer')
  resourceId: String,         // ID of affected resource
  method: String,             // HTTP method
  endpoint: String,           // API endpoint
  ipAddress: String,         // Client IP address
  userAgent: String,         // Browser/client user agent
  details: Object,           // Additional details
  status: 'success' | 'failure' | 'error',
  errorMessage: String,      // Error message (if failed)
  createdAt: Date,           // Timestamp
  updatedAt: Date            // Last update timestamp
}
```

## API Endpoints (Admin Only)

### Get Audit Logs

```http
GET /api/audit-logs?type=user_action&page=1&limit=50
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `type` - Filter by type (`user_action`, `system_event`, `security_event`)
- `action` - Filter by action (partial match)
- `userId` - Filter by user ID
- `resource` - Filter by resource type
- `resourceId` - Filter by resource ID
- `startDate` - Start date (ISO format)
- `endDate` - End date (ISO format)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "type": "user_action",
      "action": "login_success",
      "userId": "...",
      "userEmail": "admin@example.com",
      "userRole": "admin",
      "ipAddress": "192.168.1.1",
      "status": "success",
      "createdAt": "2024-01-01T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

### Get Audit Log Statistics

```http
GET /api/audit-logs/stats?startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 1500,
    "byType": {
      "userActions": 1200,
      "systemEvents": 200,
      "securityEvents": 100
    },
    "topActions": [
      { "_id": "login_success", "count": 500 },
      { "_id": "create_order", "count": 300 }
    ],
    "topUsers": [
      {
        "userId": "...",
        "email": "admin@example.com",
        "count": 200
      }
    ]
  }
}
```

### Get Audit Log by ID

```http
GET /api/audit-logs/:id
Authorization: Bearer <admin-token>
```

## Log File Management

### Log Rotation

Logs are automatically rotated daily:
- New log file created each day
- Format: `{level}-{YYYY-MM-DD}.log`
- Old logs remain for manual cleanup

### Log Cleanup

**Manual Cleanup:**
```bash
# Delete logs older than 30 days
find ./logs -name "*.log" -mtime +30 -delete

# Or use a script
node scripts/cleanupLogs.js
```

**Automatic Cleanup (Recommended):**
Set up a cron job or scheduled task:

```bash
# Add to crontab (runs daily at 2 AM)
0 2 * * * find /path/to/server/logs -name "*.log" -mtime +30 -delete
```

### Log Retention

- **File Logs**: Recommended 30-90 days
- **Database Audit Logs**: Auto-deleted after 90 days (TTL index)

## Monitoring

### Viewing Logs

#### Real-time Log Monitoring

```bash
# Watch error logs
tail -f logs/error-$(date +%Y-%m-%d).log

# Watch all logs
tail -f logs/*.log

# Search logs
grep "ERROR" logs/error-*.log
grep "login" logs/info-*.log
```

#### View Audit Logs via API

```bash
# Get recent audit logs
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/audit-logs?limit=10

# Get security events
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/audit-logs?type=security_event

# Get user activity
curl -H "Authorization: Bearer <token>" \
  http://localhost:5000/api/audit-logs?type=user_action&userId=123
```

### Log Analysis

#### Common Queries

**Failed Login Attempts:**
```bash
grep "login_failed" logs/info-*.log
```

**Security Events:**
```bash
grep "Security Event" logs/warn-*.log
```

**Error Patterns:**
```bash
grep "ERROR" logs/error-*.log | grep -i "database"
```

#### Using MongoDB Queries

```javascript
// Find all failed logins in last 24 hours
db.auditlogs.find({
  action: 'login_failed',
  createdAt: { $gte: new Date(Date.now() - 24*60*60*1000) }
});

// Find all actions by a specific user
db.auditlogs.find({ userId: ObjectId('...') });

// Find security events
db.auditlogs.find({ type: 'security_event' });
```

## Best Practices

### 1. Log Levels
- ✅ Use appropriate log levels
- ✅ Don't log sensitive information (passwords, tokens)
- ✅ Include context in log messages
- ✅ Use structured logging (JSON metadata)

### 2. Performance
- ✅ Logging is asynchronous (doesn't block requests)
- ✅ File writes are buffered
- ✅ Database audit logs use TTL indexes

### 3. Security
- ✅ Audit logs are admin-only
- ✅ Sensitive data is excluded from logs
- ✅ Log files are excluded from git
- ✅ Log access should be restricted

### 4. Monitoring
- ✅ Monitor log file sizes
- ✅ Set up alerts for error rates
- ✅ Review security events regularly
- ✅ Monitor audit log growth

## Troubleshooting

### Issue: Logs not being written

**Solutions:**
- Check log directory permissions: `chmod 755 ./logs`
- Verify `LOG_FILE=true` in `.env`
- Check disk space: `df -h`

### Issue: Too many log files

**Solutions:**
- Reduce log retention period
- Set up automatic log cleanup
- Increase log level to reduce verbosity: `LOG_LEVEL=warn`

### Issue: Audit logs not appearing

**Solutions:**
- Verify MongoDB connection
- Check audit log model is registered
- Verify user has admin role
- Check database indexes are created

### Issue: Performance impact

**Solutions:**
- Increase log level (reduce verbosity)
- Disable file logging in development: `LOG_FILE=false`
- Use log rotation
- Monitor log file sizes

## Security Considerations

1. ✅ **Log Access**: Only admins can view audit logs via API
2. ✅ **Sensitive Data**: Passwords and tokens are never logged
3. ✅ **Log Storage**: Log files excluded from version control
4. ✅ **Log Retention**: Old logs automatically cleaned up
5. ✅ **Audit Trail**: All user actions are logged
6. ✅ **Security Events**: Failed logins and security events are tracked

## Verification Checklist

- [ ] Logging configured in `.env`
- [ ] Log directory created and writable
- [ ] Request logging middleware active
- [ ] Audit logging working (check database)
- [ ] Log files being created daily
- [ ] API endpoints accessible (admin only)
- [ ] Log cleanup scheduled
- [ ] Monitoring setup complete
- [ ] Security events being logged
- [ ] User actions being tracked

## Additional Resources

- [Winston Logger (Alternative)](https://github.com/winstonjs/winston)
- [MongoDB TTL Indexes](https://docs.mongodb.com/manual/core/index-ttl/)
- [Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)

---

**Status:** ✅ Logging and Monitoring implementation complete
**Requirement:** #4 - Logging and Monitoring to Track User Activity and System Events

