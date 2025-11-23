# 🚀 Production Deployment Guide

Complete step-by-step guide to deploy LaundryPOS to production.

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Setup](#environment-setup)
3. [Security Hardening](#security-hardening)
4. [Database Setup](#database-setup)
5. [Build & Deploy Applications](#build--deploy-applications)
6. [Server Configuration](#server-configuration)
7. [SSL/HTTPS Setup](#sslhttps-setup)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup Strategy](#backup-strategy)
10. [Post-Deployment](#post-deployment)
11. [Maintenance & Updates](#maintenance--updates)

---

## ✅ Pre-Deployment Checklist

### Code Quality
- [ ] Remove all `console.log` statements (use logger instead)
- [ ] Remove debug code and TODOs
- [ ] Review and fix all TypeScript/ESLint errors
- [ ] Test all critical user flows
- [ ] Code review completed
- [ ] Update version numbers in `package.json`

### Testing
- [ ] Unit tests pass (if implemented)
- [ ] Integration tests pass
- [ ] Manual testing of all features
- [ ] Load testing (if applicable)
- [ ] Security testing
- [ ] Cross-browser testing (Admin app)
- [ ] Mobile/tablet testing (Staff app)

### Documentation
- [ ] API documentation updated
- [ ] User guides ready
- [ ] Deployment documentation complete
- [ ] Environment variables documented

---

## 🔧 Environment Setup

### 1. Create Production Environment Files

**Server - `.env` (DO NOT COMMIT THIS FILE)**

```env
# Environment
NODE_ENV=production
PORT=5000

# MongoDB Connection
MONGODB_URI=mongodb://username:password@your-mongodb-host:27017/LaundryPOS?authSource=admin
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/LaundryPOS?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-change-this
JWT_EXPIRE=7d

# HTTPS Configuration
ENABLE_HTTPS=true
HTTPS_PORT=5443
SSL_CERT_PATH=/etc/ssl/certs/your-domain.crt
SSL_KEY_PATH=/etc/ssl/private/your-domain.key

# Email Configuration (Optional but Recommended)
GMAIL_USER=your-production-email@gmail.com
GMAIL_APP_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@yourdomain.com

# SMS Configuration (Optional - Twilio)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Cloudinary Configuration (Optional - for image uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# reCAPTCHA (Required for login)
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# CORS Configuration
ALLOWED_ORIGINS=https://admin.yourdomain.com,https://staff.yourdomain.com

# Logging
LOG_LEVEL=info
LOG_DIR=/var/log/laundrypos
```

**Admin App - `.env.production`**

```env
VITE_API_URL=https://api.yourdomain.com/api
VITE_ENV=production
VITE_ENABLE_ANALYTICS=true
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key
```

**Staff App - `.env.production`**

```env
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api
EXPO_PUBLIC_ENV=production
```

### 2. Generate Secure Secrets

```bash
# Generate JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate MongoDB password
openssl rand -base64 32
```

---

## 🔒 Security Hardening

### 1. Server Security

**Update `server/index.js` to enforce security:**

```javascript
// Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  next()
})

// Rate limiting (install express-rate-limit)
const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
app.use('/api/', limiter)
```

**Install security packages:**
```bash
cd server
npm install express-rate-limit helmet
```

### 2. Database Security

- [ ] Use strong MongoDB credentials
- [ ] Enable MongoDB authentication
- [ ] Use MongoDB Atlas or secure VPS
- [ ] Enable MongoDB SSL/TLS
- [ ] Restrict database access to server IP only
- [ ] Regular database backups

### 3. API Security

- [ ] Enable HTTPS only
- [ ] Implement rate limiting
- [ ] Validate all inputs server-side
- [ ] Sanitize user inputs
- [ ] Use parameterized queries (Mongoose handles this)
- [ ] Enable CORS only for production domains

### 4. Application Security

- [ ] Remove development dependencies from production
- [ ] Disable debug mode
- [ ] Set secure cookie flags
- [ ] Implement CSRF protection (if needed)
- [ ] Regular security updates

---

## 🗄️ Database Setup

### Option 1: MongoDB Atlas (Recommended)

1. **Create MongoDB Atlas Account**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create free cluster (M0) or paid cluster

2. **Configure Database**
   ```bash
   # Create database user
   # Set network access (whitelist your server IP)
   # Get connection string
   ```

3. **Update `.env`**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/LaundryPOS?retryWrites=true&w=majority
   ```

### Option 2: Self-Hosted MongoDB

1. **Install MongoDB on Server**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install mongodb-org

   # Create admin user
   use admin
   db.createUser({
     user: "admin",
     pwd: "secure-password",
     roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
   })
   ```

2. **Enable Authentication**
   ```bash
   # Edit /etc/mongod.conf
   security:
     authorization: enabled
   ```

3. **Update `.env`**
   ```env
   MONGODB_URI=mongodb://admin:password@localhost:27017/LaundryPOS?authSource=admin
   ```

### Initial Database Setup

```bash
cd server
npm install
npm run seed  # Seed initial data
```

---

## 🏗️ Build & Deploy Applications

### 1. Build Admin App (React)

```bash
cd "LaundryPos(ADMIN)"

# Install dependencies
npm install

# Build for production
npm run build

# The build output will be in the 'dist' folder
# Deploy the 'dist' folder contents to your web server
```

**Deployment Options:**

**Option A: Static Hosting (Netlify, Vercel, Cloudflare Pages)**
```bash
# Build locally
npm run build

# Deploy dist folder to hosting service
# Configure environment variables in hosting dashboard
```

**Option B: Nginx/Apache Server**
```bash
# Copy dist folder to server
scp -r dist/* user@server:/var/www/admin.yourdomain.com/

# Configure Nginx (see Server Configuration section)
```

### 2. Build Staff App (React Native/Expo)

```bash
cd "LaundryPOS(STAFF)"

# Install dependencies
npm install

# For production build
npx expo build:android  # Android APK/AAB
npx expo build:ios      # iOS IPA

# OR use EAS Build (recommended)
npm install -g eas-cli
eas login
eas build --platform android
eas build --platform ios
```

**Distribution:**
- Android: Upload APK/AAB to Google Play Store
- iOS: Upload IPA to App Store Connect

### 3. Deploy Server (Node.js/Express)

**Option A: VPS (DigitalOcean, AWS EC2, Linode)**

```bash
# SSH into server
ssh user@your-server-ip

# Install Node.js (if not installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Clone repository
git clone https://github.com/your-repo/LaundryPos.git
cd LaundryPos/server

# Install dependencies
npm install --production

# Create .env file
nano .env
# Paste production environment variables

# Start with PM2
pm2 start index.js --name laundrypos-api
pm2 save
pm2 startup  # Setup PM2 to start on boot
```

**Option B: Platform as a Service (Heroku, Railway, Render)**

```bash
# Install Heroku CLI
heroku login
heroku create your-app-name

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri
heroku config:set JWT_SECRET=your-jwt-secret
# ... set all other variables

# Deploy
git push heroku main
```

---

## 🖥️ Server Configuration

### Nginx Configuration (for Admin App)

**File: `/etc/nginx/sites-available/admin.yourdomain.com`**

```nginx
server {
    listen 80;
    server_name admin.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;
    
    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    root /var/www/admin.yourdomain.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

**Enable site:**
```bash
sudo ln -s /etc/nginx/sites-available/admin.yourdomain.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Nginx Reverse Proxy (for API)

**File: `/etc/nginx/sites-available/api.yourdomain.com`**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/ssl/certs/your-domain.crt;
    ssl_certificate_key /etc/ssl/private/your-domain.key;

    # Proxy to Node.js server
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

---

## 🔐 SSL/HTTPS Setup

### Option 1: Let's Encrypt (Free, Recommended)

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d admin.yourdomain.com -d api.yourdomain.com

# Auto-renewal (already configured by certbot)
sudo certbot renew --dry-run
```

### Option 2: Commercial SSL Certificate

1. Purchase SSL certificate from provider
2. Upload certificate files to server
3. Update Nginx configuration with certificate paths

### Option 3: Self-Signed (Development Only)

```bash
cd server
npm run generate-cert
# Follow prompts
```

---

## 📊 Monitoring & Logging

### 1. PM2 Monitoring (if using PM2)

```bash
# Monitor application
pm2 monit

# View logs
pm2 logs laundrypos-api

# Setup PM2 monitoring dashboard
pm2 install pm2-server-monit
```

### 2. Application Logs

Logs are automatically saved to:
- `/var/log/laundrypos/` (or path specified in LOG_DIR)
- Daily rotation
- Separate files for error, info, warn

**View logs:**
```bash
tail -f /var/log/laundrypos/info-$(date +%Y-%m-%d).log
tail -f /var/log/laundrypos/error-$(date +%Y-%m-%d).log
```

### 3. Database Monitoring

**MongoDB Atlas:**
- Built-in monitoring dashboard
- Performance metrics
- Alert configuration

**Self-Hosted:**
```bash
# Install MongoDB monitoring tools
mongostat  # Real-time statistics
mongotop   # Database activity
```

### 4. Uptime Monitoring

Set up external monitoring:
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://www.pingdom.com
- **StatusCake**: https://www.statuscake.com

Monitor endpoints:
- `https://api.yourdomain.com/api/health`
- `https://admin.yourdomain.com`

---

## 💾 Backup Strategy

### 1. Database Backups

**Automated Backup Script (already implemented):**

```bash
# Manual backup
cd server
npm run backup

# List backups
npm run backup:list

# View backup stats
npm run backup:stats

# Cleanup old backups
npm run backup:cleanup
```

**Setup Automated Backups (Cron):**

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/server && npm run backup

# Add weekly backup cleanup
0 3 * * 0 cd /path/to/server && npm run backup:cleanup
```

**Backup Storage:**
- Local: `/server/backups/`
- Cloud: Configure Google Drive or AWS S3 in backup script

### 2. Application Backups

```bash
# Backup application files
tar -czf laundrypos-backup-$(date +%Y%m%d).tar.gz \
  server/ \
  LaundryPos\(ADMIN\)/dist/ \
  --exclude=node_modules \
  --exclude=backups
```

### 3. Restore Procedure

```bash
# Restore database
cd server
npm run restore

# Follow prompts to select backup
```

---

## ✅ Post-Deployment

### 1. Health Checks

```bash
# Check API health
curl https://api.yourdomain.com/api/health

# Check admin app
curl -I https://admin.yourdomain.com

# Check server status (if using PM2)
pm2 status
```

### 2. Test Critical Flows

- [ ] User login
- [ ] Create order
- [ ] Process payment
- [ ] Generate reports
- [ ] Staff app connectivity
- [ ] Email notifications (if configured)
- [ ] SMS notifications (if configured)

### 3. Performance Testing

```bash
# Test API response times
curl -w "@-" -o /dev/null -s https://api.yourdomain.com/api/orders
# Add timing format file

# Load testing (install Apache Bench)
ab -n 1000 -c 10 https://api.yourdomain.com/api/orders
```

### 4. Security Audit

- [ ] Run security scan (OWASP ZAP, Snyk)
- [ ] Check SSL rating (SSL Labs: https://www.ssllabs.com/ssltest/)
- [ ] Verify security headers
- [ ] Test rate limiting
- [ ] Verify HTTPS redirects

---

## 🔄 Maintenance & Updates

### Regular Maintenance Tasks

**Daily:**
- [ ] Check error logs
- [ ] Monitor server resources (CPU, memory, disk)
- [ ] Verify backups completed

**Weekly:**
- [ ] Review audit logs
- [ ] Check for security updates
- [ ] Review performance metrics
- [ ] Cleanup old logs

**Monthly:**
- [ ] Update dependencies
- [ ] Review and optimize database
- [ ] Test backup restore procedure
- [ ] Security audit

### Update Procedure

```bash
# 1. Backup current version
npm run backup

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
npm install --production

# 4. Run migrations (if any)
# npm run migrate

# 5. Restart application
pm2 restart laundrypos-api

# 6. Verify deployment
pm2 logs laundrypos-api --lines 50
```

### Rollback Procedure

```bash
# 1. Stop current version
pm2 stop laundrypos-api

# 2. Restore previous version
git checkout <previous-commit-hash>

# 3. Restore database (if needed)
npm run restore

# 4. Restart
pm2 restart laundrypos-api
```

---

## 📝 Production Checklist Summary

### Before Deployment
- [ ] All environment variables configured
- [ ] Database setup and secured
- [ ] SSL certificates obtained
- [ ] Domain names configured
- [ ] DNS records updated
- [ ] Security hardening completed
- [ ] Backups configured

### During Deployment
- [ ] Applications built
- [ ] Server deployed
- [ ] Nginx configured
- [ ] SSL certificates installed
- [ ] PM2/process manager configured
- [ ] Monitoring setup

### After Deployment
- [ ] Health checks passed
- [ ] Critical flows tested
- [ ] Performance verified
- [ ] Security audit completed
- [ ] Team notified
- [ ] Documentation updated

---

## 🆘 Troubleshooting

### Common Issues

**1. Application won't start**
```bash
# Check logs
pm2 logs laundrypos-api

# Check environment variables
pm2 env laundrypos-api

# Verify Node.js version
node --version
```

**2. Database connection issues**
```bash
# Test MongoDB connection
mongosh "your-connection-string"

# Check MongoDB status
sudo systemctl status mongod
```

**3. SSL certificate issues**
```bash
# Test SSL
openssl s_client -connect yourdomain.com:443

# Renew Let's Encrypt
sudo certbot renew
```

**4. High memory usage**
```bash
# Check PM2 memory
pm2 monit

# Restart application
pm2 restart laundrypos-api
```

---

## 📞 Support & Resources

- **Server Logs**: `/var/log/laundrypos/`
- **PM2 Logs**: `~/.pm2/logs/`
- **Nginx Logs**: `/var/log/nginx/`
- **MongoDB Logs**: `/var/log/mongodb/`

---

## 🎯 Quick Start Commands

```bash
# Deploy server
cd server
npm install --production
pm2 start index.js --name laundrypos-api
pm2 save

# Deploy admin app
cd LaundryPos\(ADMIN\)
npm install
npm run build
# Copy dist/ to web server

# Backup database
cd server
npm run backup

# View logs
pm2 logs laundrypos-api
tail -f /var/log/laundrypos/info-$(date +%Y-%m-%d).log

# Restart application
pm2 restart laundrypos-api
```

---

**Last Updated**: 2025-01-16
**Version**: 1.0

**Remember**: Always test in staging environment first before deploying to production!

