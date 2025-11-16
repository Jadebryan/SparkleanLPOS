const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * SSL Certificate Configuration
 * Supports both development (self-signed) and production (Let's Encrypt/custom) certificates
 */
class SSLConfig {
  constructor() {
    this.certPath = process.env.SSL_CERT_PATH || path.join(__dirname, '../certs/server.crt');
    this.keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, '../certs/server.key');
    this.enableHTTPS = process.env.ENABLE_HTTPS === 'true' || process.env.NODE_ENV === 'production';
  }

  /**
   * Check if SSL certificates exist
   */
  certificatesExist() {
    try {
      return fs.existsSync(this.certPath) && fs.existsSync(this.keyPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Load SSL certificates
   */
  getCertificates() {
    try {
      if (!this.certificatesExist()) {
        return null;
      }

      return {
        key: fs.readFileSync(this.keyPath, 'utf8'),
        cert: fs.readFileSync(this.certPath, 'utf8')
      };
    } catch (error) {
      console.error('Error loading SSL certificates:', error.message);
      return null;
    }
  }

  /**
   * Create HTTPS server
   */
  createHTTPSServer(app) {
    const certs = this.getCertificates();
    
    if (!certs) {
      throw new Error('SSL certificates not found. Cannot create HTTPS server.');
    }

    return https.createServer(certs, app);
  }

  /**
   * Get SSL status information
   */
  getStatus() {
    const exists = this.certificatesExist();
    const enabled = this.enableHTTPS && exists;

    return {
      enabled,
      certificatesExist: exists,
      certPath: this.certPath,
      keyPath: this.keyPath,
      environment: process.env.NODE_ENV || 'development'
    };
  }
}

module.exports = new SSLConfig();

