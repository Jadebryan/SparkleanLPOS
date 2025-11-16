const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Generate self-signed SSL certificate for development
 * 
 * This script creates a self-signed certificate that can be used for HTTPS
 * in development environments. For production, use proper certificates from
 * Let's Encrypt or a trusted Certificate Authority.
 */

const certsDir = path.join(__dirname, '../certs');
const keyPath = path.join(certsDir, 'server.key');
const certPath = path.join(certsDir, 'server.crt');

// Create certs directory if it doesn't exist
if (!fs.existsSync(certsDir)) {
  fs.mkdirSync(certsDir, { recursive: true });
  console.log('✅ Created certs directory');
}

// Check if OpenSSL is available
try {
  execSync('openssl version', { stdio: 'ignore' });
} catch (error) {
  console.error('❌ OpenSSL is not installed or not in PATH');
  console.error('Please install OpenSSL to generate certificates:');
  console.error('  - Windows: Download from https://slproweb.com/products/Win32OpenSSL.html');
  console.error('  - Mac: brew install openssl');
  console.error('  - Linux: sudo apt-get install openssl');
  process.exit(1);
}

// Check if certificates already exist
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  console.log('⚠️  Certificates already exist!');
  console.log(`   Key: ${keyPath}`);
  console.log(`   Cert: ${certPath}`);
  console.log('   Delete them first if you want to regenerate.');
  process.exit(0);
}

console.log('🔐 Generating self-signed SSL certificate for development...\n');

try {
  // Generate private key
  console.log('1. Generating private key...');
  execSync(`openssl genrsa -out "${keyPath}" 2048`, { stdio: 'inherit' });
  console.log('   ✅ Private key generated\n');

  // Generate certificate signing request and self-signed certificate
  console.log('2. Generating self-signed certificate (valid for 365 days)...');
  execSync(
    `openssl req -new -x509 -key "${keyPath}" -out "${certPath}" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"`,
    { stdio: 'inherit' }
  );
  console.log('   ✅ Certificate generated\n');

  console.log('✅ Successfully generated SSL certificates!\n');
  console.log(`📜 Certificate: ${certPath}`);
  console.log(`🔑 Private Key: ${keyPath}\n`);
  console.log('📝 Next steps:');
  console.log('   1. Set ENABLE_HTTPS=true in your .env file');
  console.log('   2. Restart your server');
  console.log('   3. Access your server at https://localhost:5443\n');
  console.log('⚠️  Note: Self-signed certificates will show a security warning in browsers.');
  console.log('   This is normal for development. For production, use Let\'s Encrypt.\n');

} catch (error) {
  console.error('❌ Error generating certificates:', error.message);
  process.exit(1);
}

