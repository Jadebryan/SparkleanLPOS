# 🚀 Deployment Resources Checklist

Complete list of hardware and software resources required for deploying the LaundryPOS system (Admin App and Staff App).

---

## 📱 Applications Overview

1. **Admin Web Application** - React + Vite (Static web app)
2. **Staff Mobile Application** - React Native + Expo (iOS & Android)
3. **Backend API Server** - Node.js + Express
4. **Database** - MongoDB
5. **Landing Page** - Static website

---

## 💻 HARDWARE RESOURCES

### 1. Production Server (Backend API)

**Minimum Requirements:**
- **CPU**: 2 cores (4+ cores recommended)
- **RAM**: 2GB (4GB+ recommended for production)
- **Storage**: 20GB SSD (50GB+ recommended for logs and backups)
- **Network**: 100Mbps+ bandwidth
- **Uptime**: 99.9% SLA (recommended)

**Recommended Cloud Providers:**
- **DigitalOcean**: Droplet ($12-24/month for 2-4GB RAM)
- **AWS EC2**: t3.small or t3.medium instance
- **Linode**: Nanode or Linode 2GB
- **Vultr**: Regular Performance ($12-24/month)
- **Google Cloud Platform**: e2-small or e2-medium
- **Azure**: B2s or B2ms VM

**Server Specifications:**
- **OS**: Ubuntu 22.04 LTS (recommended) or Debian 11+
- **Architecture**: x64 (AMD64)
- **Firewall**: UFW or iptables configured

### 2. Database Server

**Option A: MongoDB Atlas (Cloud - Recommended)**
- **Free Tier**: M0 cluster (512MB storage, shared CPU/RAM)
- **Production Tier**: M10+ cluster (2GB+ RAM, dedicated resources)
- **Storage**: 10GB+ (scales with usage)
- **Backup**: Automated daily backups included

**Option B: Self-Hosted MongoDB**
- **CPU**: 2+ cores
- **RAM**: 4GB+ (8GB recommended)
- **Storage**: 50GB+ SSD (for data + indexes)
- **Network**: Low latency connection to API server

### 3. Static File Hosting (Admin App)

**Option A: CDN/Static Hosting (Recommended)**
- **Netlify**: Free tier (100GB bandwidth/month)
- **Vercel**: Free tier (100GB bandwidth/month)
- **Cloudflare Pages**: Free tier (unlimited bandwidth)
- **AWS S3 + CloudFront**: Pay-as-you-go
- **GitHub Pages**: Free (for public repos)

**Option B: Same Server as API**
- Uses same server resources as backend
- Requires Nginx/Apache web server
- Additional 5-10GB storage for static files

### 4. Mobile App Distribution

**For Staff App (React Native/Expo):**
- **Android**: Google Play Store account ($25 one-time fee)
- **iOS**: Apple Developer Program ($99/year)
- **Build Services**:
  - **EAS Build** (Expo): Free tier available, paid plans for faster builds
  - **GitHub Actions**: Free for public repos, paid for private
  - **Local Build Machine**: Mac (required for iOS builds)

### 5. Development/CI Hardware (Optional but Recommended)

**For Building Mobile Apps:**
- **Mac**: Required for iOS builds (macOS 12+)
  - **CPU**: Apple Silicon (M1+) or Intel Core i5+
  - **RAM**: 8GB+ (16GB recommended)
  - **Storage**: 50GB+ free space
- **Windows/Linux**: For Android builds only
  - **CPU**: 4+ cores
  - **RAM**: 8GB+
  - **Storage**: 50GB+ free space

---

## 🔧 SOFTWARE RESOURCES

### 1. Server Operating System

**Required:**
- **Linux Distribution**: Ubuntu 22.04 LTS (recommended) or Debian 11+
- **Alternative**: CentOS 8+, RHEL 8+, or Amazon Linux 2

**System Packages:**
```bash
# Essential packages
- curl, wget, git
- build-essential (for native modules)
- openssl, ca-certificates
- ufw (firewall)
- certbot (for SSL)
```

### 2. Runtime & Package Managers

**Node.js:**
- **Version**: Node.js v18.x or higher (v20.x LTS recommended)
- **Package Manager**: npm (comes with Node.js) or yarn
- **Process Manager**: PM2 (recommended for production)

**Installation:**
```bash
# Using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### 3. Web Server & Reverse Proxy

**Nginx (Recommended):**
- **Version**: 1.18+ or latest stable
- **Purpose**: 
  - Serve static files (Admin app)
  - Reverse proxy for API server
  - SSL termination
  - Load balancing (if multiple API instances)

**Alternative: Apache**
- Apache 2.4+ with mod_proxy

**Installation:**
```bash
sudo apt-get update
sudo apt-get install nginx
sudo systemctl enable nginx
```

### 4. Database Software

**MongoDB:**
- **Version**: MongoDB 6.0+ (7.0+ recommended)
- **Option A**: MongoDB Atlas (cloud-hosted, no installation needed)
- **Option B**: Self-hosted MongoDB Community Edition

**If Self-Hosting:**
```bash
# MongoDB installation
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### 5. SSL/TLS Certificates

**Option A: Let's Encrypt (Free, Recommended)**
- **Tool**: Certbot
- **Auto-renewal**: Built-in
- **Validity**: 90 days (auto-renewed)

**Installation:**
```bash
sudo apt-get install certbot python3-certbot-nginx
```

**Option B: Commercial SSL Certificate**
- Purchase from: DigiCert, GlobalSign, Sectigo, etc.
- Cost: $50-500/year depending on type

### 6. Monitoring & Logging Tools

**Process Monitoring:**
- **PM2**: Built-in monitoring (`pm2 monit`)
- **PM2 Plus**: Optional cloud monitoring (free tier available)

**Uptime Monitoring (External Services):**
- **UptimeRobot**: Free tier (50 monitors)
- **Pingdom**: Paid service
- **StatusCake**: Free tier available

**Log Management:**
- **Built-in**: File-based logging (configured in app)
- **Optional**: Log aggregation services (Papertrail, Loggly, etc.)

### 7. Backup & Storage

**Local Backups:**
- Server storage space for backup files
- Automated backup scripts (included in project)

**Cloud Backup Storage (Optional but Recommended):**
- **Google Drive API**: For automated backups
- **AWS S3**: For scalable backup storage
- **Backblaze B2**: Cost-effective cloud storage
- **Dropbox API**: Alternative option

### 8. Email Service

**Option A: Gmail SMTP (Free)**
- Gmail account with App Password
- Free tier: 500 emails/day limit

**Option B: Transactional Email Services (Recommended for Production)**
- **SendGrid**: Free tier (100 emails/day)
- **Mailgun**: Free tier (5,000 emails/month)
- **AWS SES**: Pay-as-you-go ($0.10 per 1,000 emails)
- **Postmark**: Paid service (better deliverability)

### 9. SMS Service (Optional)

**Twilio:**
- **Account**: Free trial available
- **Pricing**: Pay-per-message (~$0.0075-0.01 per SMS)
- **Features**: SMS, WhatsApp, Voice calls

**Alternatives:**
- **AWS SNS**: SMS service
- **Vonage (Nexmo)**: SMS API
- **MessageBird**: SMS gateway

### 10. Image/File Storage (Optional)

**Cloudinary:**
- **Free Tier**: 25GB storage, 25GB bandwidth/month
- **Paid Plans**: Starting at $89/month
- **Features**: Image optimization, transformations, CDN

**Alternatives:**
- **AWS S3**: Object storage
- **Google Cloud Storage**: Object storage
- **DigitalOcean Spaces**: S3-compatible storage

### 11. Domain & DNS

**Domain Name:**
- Purchase from: Namecheap, GoDaddy, Google Domains, etc.
- **Cost**: $10-15/year for .com domain
- **Required**: At least one domain (can use subdomains)

**DNS Management:**
- **Provider**: Cloudflare (free), Route 53 (AWS), or domain registrar
- **Records Needed**:
  - A record: `api.yourdomain.com` → Server IP
  - A record: `admin.yourdomain.com` → Server IP or CDN
  - CNAME record: `www.yourdomain.com` → `yourdomain.com` (optional)

### 12. reCAPTCHA Service

**Google reCAPTCHA:**
- **Free Tier**: Unlimited requests
- **Types**: v2 Checkbox, v2 Invisible, v3
- **Required**: Site key and Secret key

**Setup:**
- Register at: https://www.google.com/recaptcha/admin

### 13. Mobile App Build Tools

**For Staff App (Expo/React Native):**

**Required:**
- **Expo CLI**: `npm install -g expo-cli` or `eas-cli`
- **Node.js**: v18+ (for building)
- **EAS Build Account**: Free tier available

**For iOS Builds:**
- **macOS**: Required (cannot build iOS on Windows/Linux)
- **Xcode**: Latest version (via App Store)
- **CocoaPods**: `sudo gem install cocoapods`
- **Apple Developer Account**: $99/year

**For Android Builds:**
- **Android Studio**: Latest version
- **Java Development Kit (JDK)**: 17 or 21
- **Android SDK**: Installed via Android Studio
- **Google Play Console**: $25 one-time fee

### 14. Version Control & CI/CD

**Git Repository:**
- **GitHub**: Free for public repos, paid for private
- **GitLab**: Free tier available
- **Bitbucket**: Free tier available

**CI/CD (Optional but Recommended):**
- **GitHub Actions**: Free for public repos
- **GitLab CI/CD**: Included with GitLab
- **CircleCI**: Free tier available
- **Travis CI**: Free for open source

---

## 📋 DEPLOYMENT CHECKLIST BY COMPONENT

### Backend API Server

**Hardware:**
- [ ] VPS/Cloud server provisioned (2GB+ RAM, 2+ cores)
- [ ] SSH access configured
- [ ] Firewall configured (ports 22, 80, 443)

**Software:**
- [ ] Ubuntu/Debian Linux installed
- [ ] Node.js v18+ installed
- [ ] PM2 installed globally
- [ ] Nginx installed and configured
- [ ] MongoDB Atlas account OR MongoDB installed
- [ ] Certbot installed (for SSL)

**Configuration:**
- [ ] Environment variables configured (.env file)
- [ ] SSL certificates obtained and installed
- [ ] Domain DNS records configured
- [ ] Backup scripts configured
- [ ] Logging directory created

### Admin Web Application

**Hosting Options:**
- [ ] Option A: Static hosting (Netlify/Vercel/Cloudflare Pages)
  - [ ] Account created
  - [ ] Build configured
  - [ ] Environment variables set
  - [ ] Custom domain configured
- [ ] Option B: Same server as API
  - [ ] Nginx configured for static files
  - [ ] Build files deployed to server
  - [ ] SSL certificate configured

**Build Requirements:**
- [ ] Node.js v18+ installed (for building)
- [ ] npm dependencies installed
- [ ] Production build created (`npm run build`)
- [ ] Environment variables configured

### Staff Mobile Application

**Development Environment:**
- [ ] Node.js v18+ installed
- [ ] Expo CLI or EAS CLI installed
- [ ] Android Studio installed (for Android builds)
- [ ] Xcode installed (for iOS builds, Mac only)

**Distribution:**
- [ ] Google Play Developer account ($25)
- [ ] Apple Developer Program account ($99/year)
- [ ] EAS Build account (free tier available)
- [ ] App icons and splash screens prepared
- [ ] App Store listings prepared

**Build Process:**
- [ ] Android APK/AAB built
- [ ] iOS IPA built (Mac required)
- [ ] Apps tested on physical devices
- [ ] Apps submitted to stores

### Database

**MongoDB Atlas (Recommended):**
- [ ] MongoDB Atlas account created
- [ ] Cluster created (M0 free tier or M10+ for production)
- [ ] Database user created
- [ ] Network access configured (IP whitelist)
- [ ] Connection string obtained
- [ ] Backup enabled

**OR Self-Hosted MongoDB:**
- [ ] MongoDB installed on server
- [ ] Authentication enabled
- [ ] Database user created
- [ ] Network access restricted
- [ ] Backup strategy configured

### Additional Services

**Email:**
- [ ] Gmail account with App Password OR
- [ ] Transactional email service account (SendGrid/Mailgun)

**SMS (Optional):**
- [ ] Twilio account created
- [ ] Phone number purchased
- [ ] API credentials obtained

**Image Storage (Optional):**
- [ ] Cloudinary account created
- [ ] API credentials obtained

**Monitoring:**
- [ ] Uptime monitoring service configured (UptimeRobot)
- [ ] Health check endpoints tested

**Backup Storage:**
- [ ] Local backup directory configured
- [ ] Cloud backup storage configured (optional)

---

## 💰 ESTIMATED COSTS (Monthly)

### Minimum Setup (Free/Low Cost)
- **Server**: $12/month (DigitalOcean 2GB)
- **Database**: Free (MongoDB Atlas M0)
- **Static Hosting**: Free (Netlify/Vercel)
- **Domain**: $1/month ($12/year)
- **SSL**: Free (Let's Encrypt)
- **Email**: Free (Gmail SMTP)
- **Monitoring**: Free (UptimeRobot)
- **Total**: ~$13/month

### Production Setup (Recommended)
- **Server**: $24/month (4GB RAM, 2 vCPUs)
- **Database**: $57/month (MongoDB Atlas M10)
- **Static Hosting**: Free (Cloudflare Pages)
- **Domain**: $1/month
- **SSL**: Free (Let's Encrypt)
- **Email**: $15/month (SendGrid or Mailgun)
- **SMS**: Pay-per-use (~$10-50/month)
- **Image Storage**: Free tier (Cloudinary)
- **Monitoring**: Free (UptimeRobot)
- **Backup Storage**: $5/month (Backblaze B2)
- **Total**: ~$112-152/month

### Enterprise Setup
- **Server**: $80-200/month (8GB+ RAM, load balanced)
- **Database**: $200+/month (MongoDB Atlas M30+)
- **CDN**: $20-100/month
- **Email**: $50+/month
- **SMS**: $50-200/month
- **Monitoring**: $20-50/month
- **Backup**: $20-50/month
- **Total**: $440-680+/month

---

## 🎯 QUICK START RESOURCES

### Essential (Must Have)
1. ✅ VPS/Cloud Server (2GB+ RAM)
2. ✅ Domain name
3. ✅ Node.js v18+ installed
4. ✅ MongoDB (Atlas or self-hosted)
5. ✅ Nginx web server
6. ✅ SSL certificate (Let's Encrypt)
7. ✅ PM2 process manager

### Recommended
8. ⭐ Static hosting for Admin app (Netlify/Vercel)
9. ⭐ Transactional email service
10. ⭐ Uptime monitoring
11. ⭐ Cloud backup storage

### Optional
12. 📱 SMS service (Twilio)
13. 📱 Image storage (Cloudinary)
14. 📱 Advanced monitoring
15. 📱 CI/CD pipeline

---

## 📞 Support Resources

- **Server Setup**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`
- **Database Setup**: See `docs/server/DATABASE_SETUP.md`
- **Environment Variables**: See `docs/project-wide/ENV_TEMPLATES.md`
- **Security**: See `docs/project-wide/SECURITY_IMPLEMENTATION_COMPLETE.md`
- **Troubleshooting**: See deployment guide troubleshooting section

---

**Last Updated**: 2025-01-16
**Version**: 1.0

