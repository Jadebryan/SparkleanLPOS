# Environment Variables Templates

Copy these templates to create your production `.env` files.

---

## Server `.env` File

Create `server/.env` with:

```env
# ============================================
# ENVIRONMENT
# ============================================
NODE_ENV=production
PORT=5000

# ============================================
# DATABASE CONFIGURATION
# ============================================
# MongoDB Atlas (Recommended)
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/LaundryPOS?retryWrites=true&w=majority

# OR Self-Hosted MongoDB
MONGODB_URI=mongodb://username:password@localhost:27017/LaundryPOS?authSource=admin

# ============================================
# JWT AUTHENTICATION
# ============================================
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long-CHANGE-THIS
JWT_EXPIRE=7d

# ============================================
# HTTPS/SSL CONFIGURATION
# ============================================
ENABLE_HTTPS=true
HTTPS_PORT=5443

# Let's Encrypt certificates
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# ============================================
# EMAIL CONFIGURATION (Optional)
# ============================================
GMAIL_USER=your-production-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
EMAIL_FROM=noreply@yourdomain.com

# ============================================
# SMS CONFIGURATION (Optional - Twilio)
# ============================================
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# ============================================
# CLOUDINARY CONFIGURATION (Optional)
# ============================================
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# ============================================
# RECAPTCHA CONFIGURATION (Required)
# ============================================
RECAPTCHA_SECRET_KEY=your-recaptcha-secret-key

# ============================================
# CORS CONFIGURATION
# ============================================
ALLOWED_ORIGINS=https://admin.yourdomain.com,https://staff.yourdomain.com

# ============================================
# LOGGING CONFIGURATION
# ============================================
LOG_LEVEL=info
LOG_DIR=/var/log/laundrypos
```

---

## Admin App `.env.production` File

Create `LaundryPos(ADMIN)/.env.production` with:

```env
# API Configuration
VITE_API_URL=https://api.yourdomain.com/api

# Environment
VITE_ENV=production

# reCAPTCHA Site Key
VITE_RECAPTCHA_SITE_KEY=your-recaptcha-site-key

# Analytics (Optional)
VITE_ENABLE_ANALYTICS=false
```

---

## Staff App `.env.production` File

Create `LaundryPOS(STAFF)/.env.production` with:

```env
# API Configuration
EXPO_PUBLIC_API_URL=https://api.yourdomain.com/api

# Environment
EXPO_PUBLIC_ENV=production
```

---

## Quick Setup Commands

```bash
# Generate JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate MongoDB Password
openssl rand -base64 32

# Test MongoDB Connection
mongosh "your-connection-string"

# Test SSL Certificate
openssl s_client -connect yourdomain.com:443
```

---

## Important Notes

1. **NEVER commit `.env` files to git**
   - Add `.env` to `.gitignore`
   - Use these templates for documentation

2. **All variables are required unless marked Optional**

3. **Generate secure secrets:**
   - JWT_SECRET: 32+ random characters
   - MongoDB password: Strong password
   - Use password generators for production

4. **Test all configurations before deployment**

