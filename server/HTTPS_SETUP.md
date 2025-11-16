# HTTPS/SSL Setup Guide

This guide explains how to enable HTTPS/SSL encryption for the Laundry POS server to meet security requirement #3 (Data Encryption in Transit).

## Overview

The server now supports HTTPS/SSL encryption for secure data transmission. This protects:
- User credentials during login
- JWT tokens in transit
- All API requests and responses
- Sensitive customer and order data

## Quick Start (Development)

### Option 1: Generate Self-Signed Certificate (Recommended for Development)

1. **Generate self-signed certificate:**
   ```bash
   cd server
   node scripts/generateSelfSignedCert.js
   ```

2. **Enable HTTPS in your `.env` file:**
   ```env
   ENABLE_HTTPS=true
   HTTPS_PORT=5443
   ```

3. **Restart your server:**
   ```bash
   npm run dev
   ```

4. **Access your server:**
   - HTTPS: `https://localhost:5443`
   - HTTP: `http://localhost:5000` (will redirect to HTTPS in production)

**Note:** Browsers will show a security warning for self-signed certificates. Click "Advanced" → "Proceed to localhost" to continue. This is normal for development.

### Option 2: Use Existing Certificates

If you already have SSL certificates:

1. **Place your certificates in `server/certs/`:**
   - `server.crt` - Certificate file
   - `server.key` - Private key file

2. **Or set custom paths in `.env`:**
   ```env
   SSL_CERT_PATH=/path/to/your/certificate.crt
   SSL_KEY_PATH=/path/to/your/private.key
   ENABLE_HTTPS=true
   HTTPS_PORT=5443
   ```

## Production Setup

### Option 1: Let's Encrypt (Free, Recommended)

Let's Encrypt provides free SSL certificates that are trusted by all browsers. Certificates are valid for 90 days and can be automatically renewed.

#### Prerequisites

Before starting, ensure you have:

1. **Domain name pointing to your server:**
   - Your domain must have an A record pointing to your server's IP address
   - Verify with: `nslookup yourdomain.com` or `dig yourdomain.com`
   - Allow 24-48 hours for DNS propagation if you just updated DNS records

2. **Server access:**
   - Root or sudo access to your server
   - Port 80 (HTTP) must be open and accessible (Let's Encrypt uses this for validation)
   - Port 443 (HTTPS) should be open for production use

3. **Domain verification:**
   - You must be able to prove ownership of the domain
   - Let's Encrypt will verify this automatically during certificate issuance

#### Method 1: Standalone Mode (Recommended for First-Time Setup)

This method temporarily stops your web server to obtain the certificate. Use this if you don't have a web server running yet or can temporarily stop it.

**Step 1: Install Certbot**

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install certbot

# CentOS/RHEL
sudo yum install certbot

# Mac (using Homebrew)
brew install certbot

# Verify installation
certbot --version
```

**Step 2: Stop Your Application (Temporarily)**

```bash
# If using PM2
pm2 stop all

# If using systemd
sudo systemctl stop your-app-name

# If using Docker
docker stop your-container-name

# Or simply stop your Node.js server (Ctrl+C)
```

**Step 3: Obtain Certificate**

```bash
# Basic command (replace with your actual domain)
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Example with actual domain:
sudo certbot certonly --standalone -d laundrypos.example.com -d www.laundrypos.example.com
```

**What happens during this step:**
- Certbot will ask for your email address (for renewal reminders)
- You'll be asked to agree to Let's Encrypt Terms of Service
- Certbot will start a temporary web server on port 80
- Let's Encrypt will verify domain ownership
- Certificates will be downloaded and saved

**Expected output:**
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/yourdomain.com/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Step 4: Verify Certificate Files**

```bash
# Check certificate location
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# You should see:
# - cert.pem (certificate)
# - chain.pem (intermediate certificate)
# - fullchain.pem (certificate + chain - USE THIS)
# - privkey.pem (private key)

# Verify certificate details
sudo openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep -A 2 "Validity"
```

**Step 5: Set Proper Permissions**

```bash
# Set permissions for certificate files
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Verify permissions
sudo ls -l /etc/letsencrypt/live/yourdomain.com/
```

**Step 6: Update Your `.env` File**

Edit `server/.env` and add/update these lines:

```env
# HTTPS Configuration
SSL_CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
SSL_KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem
ENABLE_HTTPS=true
HTTPS_PORT=443
NODE_ENV=production
PORT=5000
```

**Important:** Replace `yourdomain.com` with your actual domain name.

**Step 7: Restart Your Application**

```bash
# If using PM2
pm2 restart all

# If using systemd
sudo systemctl restart your-app-name

# If using npm/node directly
cd server
npm start
```

**Step 8: Test HTTPS Connection**

```bash
# Test from command line
curl https://yourdomain.com/api/health

# Test certificate validity
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com

# Check certificate expiration
echo | openssl s_client -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -dates
```

#### Method 2: Webroot Mode (Recommended if Web Server is Running)

Use this method if you have nginx/Apache running and can't stop it. This method places a file in your web root for validation.

**Step 1: Install Certbot (same as Method 1)**

**Step 2: Configure Web Server for Validation**

Create a directory for Let's Encrypt validation:

```bash
# Create webroot directory
sudo mkdir -p /var/www/html/.well-known/acme-challenge

# Set permissions
sudo chown -R www-data:www-data /var/www/html/.well-known
sudo chmod -R 755 /var/www/html/.well-known
```

**Step 3: Obtain Certificate Using Webroot**

```bash
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d yourdomain.com \
  -d www.yourdomain.com
```

**Step 4-8:** Follow steps 4-8 from Method 1 above.

#### Method 3: DNS Challenge (For Servers Without Public Web Access)

If your server doesn't have port 80 accessible, use DNS validation:

```bash
sudo certbot certonly --manual --preferred-challenges dns -d yourdomain.com
```

Certbot will provide a TXT record to add to your DNS. After adding it, press Enter to continue.

#### Setting Up Automatic Renewal

Let's Encrypt certificates expire after 90 days. Set up automatic renewal:

**Step 1: Test Renewal (Dry Run)**

```bash
# Test renewal without actually renewing
sudo certbot renew --dry-run
```

**Step 2: Set Up Cron Job for Auto-Renewal**

```bash
# Edit crontab
sudo crontab -e

# Add this line (runs twice daily at 3 AM and 3 PM)
0 3,15 * * * certbot renew --quiet --deploy-hook "systemctl restart your-app-name"

# Or if using PM2
0 3,15 * * * certbot renew --quiet --deploy-hook "pm2 restart all"

# Or custom script
0 3,15 * * * certbot renew --quiet --deploy-hook "/path/to/restart-script.sh"
```

**Step 3: Create Renewal Hook Script (Optional but Recommended)**

Create `/usr/local/bin/renew-certificate.sh`:

```bash
#!/bin/bash
# Certificate renewal hook script

# Renew certificate
certbot renew --quiet

# Restart your application
systemctl restart your-app-name
# OR: pm2 restart all
# OR: cd /path/to/server && npm restart

# Log renewal
echo "$(date): Certificate renewed" >> /var/log/certbot-renewal.log
```

Make it executable:
```bash
sudo chmod +x /usr/local/bin/renew-certificate.sh
```

Update crontab to use the script:
```bash
0 3,15 * * * /usr/local/bin/renew-certificate.sh
```

**Step 4: Verify Cron Job**

```bash
# List current cron jobs
sudo crontab -l

# Check cron logs (Ubuntu/Debian)
sudo tail -f /var/log/syslog | grep CRON

# Check cron logs (CentOS/RHEL)
sudo tail -f /var/log/cron
```

#### Troubleshooting Let's Encrypt

**Issue: "Failed to obtain certificate"**

**Solutions:**
- Ensure port 80 is open: `sudo ufw allow 80` or `sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT`
- Check DNS is pointing correctly: `nslookup yourdomain.com`
- Verify domain is accessible: `curl http://yourdomain.com`
- Wait for DNS propagation (can take up to 48 hours)

**Issue: "Rate limit exceeded"**

Let's Encrypt has rate limits:
- 50 certificates per registered domain per week
- 5 duplicate certificates per week

**Solutions:**
- Wait for rate limit to reset
- Use staging environment for testing: `--staging` flag
- Request fewer certificates at once

**Issue: "Permission denied" errors**

**Solutions:**
```bash
# Ensure you're using sudo
sudo certbot certonly --standalone -d yourdomain.com

# Check certificate directory permissions
sudo ls -la /etc/letsencrypt/live/yourdomain.com/

# Fix permissions if needed
sudo chmod 644 /etc/letsencrypt/live/yourdomain.com/fullchain.pem
sudo chmod 600 /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**Issue: Certificate not found by Node.js**

**Solutions:**
- Verify paths in `.env` are correct and absolute (not relative)
- Check file exists: `sudo ls -la /etc/letsencrypt/live/yourdomain.com/fullchain.pem`
- Ensure Node.js process has read permissions (may need to run with sudo or add user to ssl-cert group)

**Issue: "Connection refused" on port 443**

**Solutions:**
```bash
# Check if port 443 is open
sudo netstat -tulpn | grep 443
sudo ufw status
sudo iptables -L -n

# Open port 443
sudo ufw allow 443/tcp
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT
```

#### Verification Checklist

After setup, verify everything works:

- [ ] Certificate files exist at `/etc/letsencrypt/live/yourdomain.com/`
- [ ] Certificate is not expired (valid for 90 days)
- [ ] `.env` file has correct certificate paths
- [ ] Server starts without SSL errors
- [ ] HTTPS endpoint accessible: `https://yourdomain.com/api/health`
- [ ] Browser shows padlock icon 🔒 (no security warnings)
- [ ] HTTP redirects to HTTPS (in production)
- [ ] Auto-renewal cron job is set up
- [ ] Test renewal works: `sudo certbot renew --dry-run`

#### Using Staging Environment (For Testing)

Before using production certificates, test with Let's Encrypt staging:

```bash
# Use staging environment (no rate limits)
sudo certbot certonly --standalone --staging -d yourdomain.com

# Staging certificates are stored in:
# /etc/letsencrypt/live/yourdomain.com/ (same location)

# Once testing is complete, get production certificate:
sudo certbot certonly --standalone -d yourdomain.com
```

#### Additional Certbot Commands

```bash
# List all certificates
sudo certbot certificates

# Revoke a certificate
sudo certbot revoke --cert-path /etc/letsencrypt/live/yourdomain.com/cert.pem

# Delete a certificate
sudo certbot delete --cert-name yourdomain.com

# View certificate details
sudo certbot certificates

# Force renewal (even if not expired)
sudo certbot renew --force-renewal
```

#### Security Notes

- ✅ Certificates are automatically renewed before expiration
- ✅ Private keys are stored securely in `/etc/letsencrypt/archive/`
- ✅ Certificates are world-readable but private keys are protected
- ✅ Never share your private key (`privkey.pem`)
- ✅ Keep backups of `/etc/letsencrypt/` directory
- ✅ Monitor certificate expiration dates

### Option 2: Commercial SSL Certificate

If you have a commercial SSL certificate:

1. **Obtain certificate files from your provider:**
   - Certificate file (`.crt` or `.pem`)
   - Private key file (`.key`)
   - Certificate chain file (if provided)

2. **Place files in secure location:**
   ```bash
   mkdir -p /etc/ssl/laundry-pos
   # Copy your certificate files here
   ```

3. **Set proper permissions:**
   ```bash
   chmod 600 /etc/ssl/laundry-pos/server.key
   chmod 644 /etc/ssl/laundry-pos/server.crt
   ```

4. **Update `.env`:**
   ```env
   SSL_CERT_PATH=/etc/ssl/laundry-pos/server.crt
   SSL_KEY_PATH=/etc/ssl/laundry-pos/server.key
   ENABLE_HTTPS=true
   HTTPS_PORT=443
   NODE_ENV=production
   ```

### Option 3: Reverse Proxy (nginx/Apache)

If you're using a reverse proxy (recommended for production):

1. **Configure SSL in nginx/Apache** (handles SSL termination)
2. **Keep Node.js server on HTTP** (behind proxy)
3. **Set `ENABLE_HTTPS=false`** in `.env`
4. **Configure proxy to forward `X-Forwarded-Proto` header**

Example nginx configuration:
```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Environment Variables

Add these to your `server/.env` file:

```env
# HTTPS Configuration
ENABLE_HTTPS=true                    # Enable HTTPS (true/false)
HTTPS_PORT=5443                      # HTTPS port (default: 5443, production: 443)
SSL_CERT_PATH=./certs/server.crt     # Path to SSL certificate (optional)
SSL_KEY_PATH=./certs/server.key      # Path to SSL private key (optional)
NODE_ENV=production                  # Set to 'production' for production mode
```

## How It Works

1. **SSL Configuration** (`server/configs/ssl.js`):
   - Loads SSL certificates
   - Creates HTTPS server
   - Validates certificate existence

2. **HTTPS Redirect Middleware** (`server/middleware/httpsRedirect.js`):
   - Redirects HTTP to HTTPS in production
   - Respects proxy headers (`X-Forwarded-Proto`)

3. **Server Startup** (`server/index.js`):
   - Checks for SSL certificates
   - Starts HTTPS server if certificates exist
   - Falls back to HTTP if certificates not found
   - Starts HTTP redirect server in production

## Testing HTTPS

### Test with curl:
```bash
# Test HTTPS endpoint
curl -k https://localhost:5443/api/health

# Test with certificate verification (production)
curl https://yourdomain.com/api/health
```

### Test in Browser:
1. Navigate to `https://localhost:5443`
2. Accept security warning (development only)
3. Check browser address bar for padlock icon 🔒

## Troubleshooting

### Certificate Not Found
- **Error:** "SSL certificates not found"
- **Solution:** Generate certificates or set correct paths in `.env`

### Permission Denied
- **Error:** "EACCES: permission denied"
- **Solution:** Ensure certificate files have correct permissions:
  ```bash
  chmod 644 server.crt
  chmod 600 server.key
  ```

### Port Already in Use
- **Error:** "EADDRINUSE: address already in use"
- **Solution:** Change `HTTPS_PORT` in `.env` or stop the process using the port

### Browser Security Warning
- **Development:** Normal for self-signed certificates. Click "Advanced" → "Proceed"
- **Production:** Use Let's Encrypt or commercial certificate

## Security Best Practices

1. ✅ **Always use HTTPS in production**
2. ✅ **Use Let's Encrypt for free, trusted certificates**
3. ✅ **Set up automatic certificate renewal**
4. ✅ **Use strong cipher suites**
5. ✅ **Enable HTTP Strict Transport Security (HSTS)** - Add to your reverse proxy
6. ✅ **Keep certificates and private keys secure** - Never commit to git
7. ✅ **Use reverse proxy** - nginx/Apache handle SSL termination efficiently

## Verification Checklist

- [ ] SSL certificates generated/obtained
- [ ] Certificates placed in correct location
- [ ] `.env` file configured with HTTPS settings
- [ ] Server starts with HTTPS enabled
- [ ] HTTPS endpoint accessible (`https://localhost:5443/api/health`)
- [ ] HTTP redirects to HTTPS (production)
- [ ] Browser shows padlock icon
- [ ] API calls work over HTTPS

## Additional Resources

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [OWASP Transport Layer Protection](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Protection_Cheat_Sheet.html)

---

**Status:** ✅ HTTPS/SSL implementation complete
**Requirement:** #3 - Data Encryption for Storage and Transmission (Transit portion)

