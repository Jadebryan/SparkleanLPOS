Update frontend to integrate voucher UI# Environment Variables Configuration Guide

This document describes all environment variables used in the Laundry POS system, including new toggles for features.

## Required Variables

### Database
- `MONGODB_URI` - MongoDB connection string (required)

### Authentication
- `JWT_SECRET` - Secret key for JWT token generation (required)
- `JWT_EXPIRE` - JWT token expiration time (default: '7d')

## Optional Feature Toggles

### Points System
- `ENABLE_POINTS_SYSTEM` - Enable/disable the points system (default: 'true')
  - Set to 'false' to disable points earning and redemption
  - Example: `ENABLE_POINTS_SYSTEM=false`

- `POINTS_MULTIPLIER` - Points earned per ₱1 spent (default: 0.01)
  - Example: `POINTS_MULTIPLIER=0.01` means 0.01 points per ₱1
  - Can be overridden in system settings by admin

### Voucher System
- `ENABLE_VOUCHER_SYSTEM` - Enable/disable the voucher system (default: 'true')
  - Set to 'false' to disable voucher creation and usage
  - Example: `ENABLE_VOUCHER_SYSTEM=false`

### Customer Data Encryption
- `ENABLE_CUSTOMER_ENCRYPTION` - Enable encryption for sensitive customer data (default: 'false')
  - Set to 'true' to encrypt customer name, email, and phone
  - Example: `ENABLE_CUSTOMER_ENCRYPTION=true`

- `ENCRYPTION_KEY` - Encryption key for customer data (required if encryption is enabled)
  - Should be a 64-character hex string or any string (will be derived)
  - Generate a secure key: `openssl rand -hex 32`
  - Example: `ENCRYPTION_KEY=your-64-character-hex-key-here`
  - **WARNING**: If you change this key, existing encrypted data cannot be decrypted!

## Server Configuration

### Ports
- `PORT` - HTTP server port (default: 5000)
- `HTTPS_PORT` - HTTPS server port (default: 5443)

### Environment
- `NODE_ENV` - Environment mode: 'development' or 'production' (default: 'development')

### CORS
- `ALLOWED_ORIGINS` - Comma-separated list of allowed origins for CORS
  - Example: `ALLOWED_ORIGINS=http://localhost:5173,https://example.com`

### HTTPS/SSL
- `ENABLE_HTTPS` - Enable HTTPS server (default: 'false' in development)
- `SSL_CERT_PATH` - Path to SSL certificate file (default: './certs/server.crt')
- `SSL_KEY_PATH` - Path to SSL private key file (default: './certs/server.key')

## Email Configuration

### Gmail (Option 1)
- `GMAIL_USER` - Gmail address
- `GMAIL_APP_PASSWORD` - Gmail app password (not regular password)
- `EMAIL_FROM` - From email address (optional, defaults to GMAIL_USER)

### SMTP (Option 2)
- `SMTP_HOST` - SMTP server hostname
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_USER` - SMTP username
- `SMTP_PASS` - SMTP password
- `EMAIL_FROM` - From email address (optional, defaults to SMTP_USER)

## SMS Configuration

### Twilio
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_PHONE_NUMBER` - Twilio phone number

## File Upload

### Cloudinary
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Backup Configuration
- `BACKUP_DIR` - Directory for database backups (default: './backups')
- `BACKUP_RETENTION_DAYS` - Number of days to keep backups (default: 30)
- `ENABLE_AUTO_BACKUP` - Enable automatic daily backups (default: 'true')

## Logging
- `LOG_DIR` - Directory for log files (default: './logs')
- `LOG_LEVEL` - Logging level: 'error', 'warn', 'info', 'debug' (default: 'info')
- `LOG_CONSOLE` - Enable console logging (default: 'true')
- `LOG_FILE` - Enable file logging (default: 'true')

## Security
- `EMERGENCY_RECOVERY_KEY` - Key for emergency admin recovery (default: 'EMERGENCY_ADMIN_RECOVERY_2024')
- `RECAPTCHA_SECRET_KEY` - Google reCAPTCHA secret key (optional)
- `RECAPTCHA_ENFORCE` - Enforce reCAPTCHA validation (default: 'false')

## Example .env File

```env
# Database
MONGODB_URI=mongodb://localhost:27017/LaundryPos

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# Feature Toggles
ENABLE_POINTS_SYSTEM=true
POINTS_MULTIPLIER=0.01
ENABLE_VOUCHER_SYSTEM=true
ENABLE_CUSTOMER_ENCRYPTION=false
ENCRYPTION_KEY=

# Server
PORT=5000
HTTPS_PORT=5443
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Email (Gmail)
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Backup
ENABLE_AUTO_BACKUP=true
BACKUP_RETENTION_DAYS=30
```

## Notes

1. **Feature Toggles**: The system checks environment variables first, then database settings, then defaults. This allows admins to override env settings through the UI.

2. **Encryption**: Once encryption is enabled and data is encrypted, you cannot disable it without losing access to encrypted data. Always backup your database before enabling encryption.

3. **Points System**: Branch-specific point rules can be configured in the admin panel, overriding global settings.

4. **Voucher System**: Monthly vouchers are tracked per customer per month, and can be integrated with the points system.

5. **API Versioning**: The API supports versioning (`/api/v1/...`) while maintaining backward compatibility with `/api/...` routes.

