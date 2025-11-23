# ✅ Production Deployment Checklist

Quick reference checklist for deploying LaundryPOS to production.

---

## 🔴 Pre-Deployment (Do First!)

### Code Preparation
- [ ] Remove all `console.log` statements
- [ ] Remove debug code and TODOs
- [ ] Fix all TypeScript/ESLint errors
- [ ] Update version numbers in `package.json`
- [ ] Code review completed

### Testing
- [ ] Test all critical user flows
- [ ] Test login/logout
- [ ] Test order creation
- [ ] Test payment processing
- [ ] Test reports generation
- [ ] Test staff app connectivity

---

## 🟡 Environment Setup

### Server Environment Variables
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` configured (Atlas or self-hosted)
- [ ] `JWT_SECRET` set (32+ characters, random)
- [ ] `ENABLE_HTTPS=true`
- [ ] `SSL_CERT_PATH` and `SSL_KEY_PATH` configured
- [ ] `GMAIL_USER` and `GMAIL_APP_PASSWORD` (if using email)
- [ ] `TWILIO_*` credentials (if using SMS)
- [ ] `CLOUDINARY_*` credentials (if using image uploads)
- [ ] `RECAPTCHA_SECRET_KEY` configured
- [ ] `ALLOWED_ORIGINS` set to production domains

### Admin App Environment Variables
- [ ] `VITE_API_URL` set to production API URL
- [ ] `VITE_ENV=production`
- [ ] `VITE_RECAPTCHA_SITE_KEY` configured

### Staff App Environment Variables
- [ ] `EXPO_PUBLIC_API_URL` set to production API URL
- [ ] `EXPO_PUBLIC_ENV=production`

---

## 🟢 Infrastructure Setup

### Domain & DNS
- [ ] Domain name purchased
- [ ] DNS A record for `admin.yourdomain.com` → Server IP
- [ ] DNS A record for `api.yourdomain.com` → Server IP
- [ ] DNS propagation verified (use `nslookup` or `dig`)

### Server Setup
- [ ] VPS/Cloud server provisioned
- [ ] SSH access configured
- [ ] Firewall configured (ports 22, 80, 443 open)
- [ ] Node.js installed (v18+)
- [ ] PM2 installed globally
- [ ] Nginx installed (for reverse proxy)

### Database Setup
- [ ] MongoDB Atlas cluster created OR
- [ ] MongoDB installed on server
- [ ] Database user created with strong password
- [ ] Network access configured (IP whitelist)
- [ ] Connection string tested

### SSL Certificates
- [ ] Let's Encrypt certificate obtained OR
- [ ] Commercial SSL certificate purchased
- [ ] Certificates installed on server
- [ ] SSL certificate paths configured in `.env`

---

## 🔵 Application Deployment

### Server Deployment
- [ ] Code cloned/pushed to server
- [ ] `npm install --production` completed
- [ ] `.env` file created with all variables
- [ ] Database seeded (`npm run seed`)
- [ ] PM2 started: `pm2 start index.js --name laundrypos-api`
- [ ] PM2 saved: `pm2 save`
- [ ] PM2 startup configured: `pm2 startup`

### Admin App Deployment
- [ ] `npm install` completed
- [ ] `.env.production` configured
- [ ] `npm run build` completed successfully
- [ ] `dist/` folder deployed to web server
- [ ] Nginx configured for admin app
- [ ] Static files served correctly

### Staff App Deployment
- [ ] `npm install` completed
- [ ] `.env.production` configured
- [ ] Production build created (`eas build` or `expo build`)
- [ ] Android APK/AAB uploaded to Play Store OR
- [ ] iOS IPA uploaded to App Store Connect

### Nginx Configuration
- [ ] Admin app Nginx config created
- [ ] API reverse proxy Nginx config created
- [ ] SSL certificates configured in Nginx
- [ ] HTTP → HTTPS redirect working
- [ ] Nginx config tested: `nginx -t`
- [ ] Nginx reloaded: `systemctl reload nginx`

---

## 🟣 Security Hardening

### Server Security
- [ ] Security headers configured (X-Frame-Options, CSP, etc.)
- [ ] Rate limiting enabled
- [ ] CORS configured for production domains only
- [ ] Firewall rules configured
- [ ] SSH key-based authentication enabled
- [ ] Root login disabled

### Application Security
- [ ] HTTPS enforced (no HTTP access)
- [ ] Strong JWT secret (32+ characters)
- [ ] Strong database passwords
- [ ] Input validation enabled
- [ ] Error messages don't expose sensitive info
- [ ] Audit logging enabled

### Database Security
- [ ] MongoDB authentication enabled
- [ ] Database user has minimal required permissions
- [ ] Network access restricted to server IP
- [ ] SSL/TLS enabled for MongoDB connections

---

## 🟠 Monitoring & Logging

### Logging Setup
- [ ] Log directory created: `/var/log/laundrypos`
- [ ] Log rotation configured
- [ ] Log permissions set correctly
- [ ] Logs accessible and readable

### Monitoring Setup
- [ ] PM2 monitoring enabled (`pm2 monit`)
- [ ] Uptime monitoring configured (UptimeRobot, etc.)
- [ ] Health check endpoint tested: `/api/health`
- [ ] Error alerting configured (if applicable)

### Backup Setup
- [ ] Backup script tested: `npm run backup`
- [ ] Backup storage configured (local or cloud)
- [ ] Automated backup cron job configured
- [ ] Backup restore tested: `npm run restore`

---

## 🟤 Post-Deployment Testing

### Health Checks
- [ ] API health endpoint: `curl https://api.yourdomain.com/api/health`
- [ ] Admin app loads: `https://admin.yourdomain.com`
- [ ] SSL certificate valid (check SSL Labs)
- [ ] PM2 status: `pm2 status` shows running

### Functional Testing
- [ ] Admin login works
- [ ] Staff login works (via app)
- [ ] Create order works
- [ ] View orders works
- [ ] Process payment works
- [ ] Generate reports works
- [ ] Email notifications work (if configured)
- [ ] SMS notifications work (if configured)

### Performance Testing
- [ ] Page load times acceptable (< 3 seconds)
- [ ] API response times acceptable (< 500ms)
- [ ] No memory leaks (check PM2 memory)
- [ ] Database queries optimized

### Security Testing
- [ ] HTTPS redirects working
- [ ] Security headers present (check browser dev tools)
- [ ] Rate limiting working
- [ ] CORS blocking unauthorized domains
- [ ] No sensitive data in error messages

---

## ⚪ Documentation

- [ ] API documentation updated
- [ ] User guides ready
- [ ] Deployment documentation complete
- [ ] Environment variables documented
- [ ] Team notified of deployment

---

## 🎯 Quick Deployment Commands

```bash
# Server
cd server
npm install --production
pm2 start index.js --name laundrypos-api
pm2 save
pm2 startup

# Admin App
cd LaundryPos\(ADMIN\)
npm install
npm run build
# Deploy dist/ folder

# Backup
cd server
npm run backup

# View Logs
pm2 logs laundrypos-api
tail -f /var/log/laundrypos/info-$(date +%Y-%m-%d).log

# Restart
pm2 restart laundrypos-api
```

---

## 🆘 Rollback Plan

If something goes wrong:

1. **Stop application:**
   ```bash
   pm2 stop laundrypos-api
   ```

2. **Restore previous version:**
   ```bash
   git checkout <previous-commit>
   npm install --production
   ```

3. **Restore database (if needed):**
   ```bash
   npm run restore
   ```

4. **Restart:**
   ```bash
   pm2 restart laundrypos-api
   ```

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete

**Deployment Date**: _______________

**Deployed By**: _______________

**Notes**: 
_________________________________________________
_________________________________________________
_________________________________________________

