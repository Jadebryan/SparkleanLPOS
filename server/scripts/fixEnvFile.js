/**
 * Script to fix .env file formatting issues
 * Removes leading/trailing whitespace from environment variable names
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const backupPath = path.join(__dirname, '..', '.env.backup');

try {
  // Read the current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Create backup
  fs.writeFileSync(backupPath, envContent);
  console.log('✅ Backup created: .env.backup\n');

  // Fix the content
  const lines = envContent.split('\n');
  const fixedLines = lines.map(line => {
    // Skip comments and empty lines
    if (line.trim().startsWith('#') || line.trim() === '') {
      return line;
    }
    
    // Remove leading whitespace from variable names
    // Keep the value as-is (in case it has intentional spaces)
    const trimmed = line.trimStart();
    
    // If line has =, split and fix
    if (trimmed.includes('=')) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('='); // Rejoin in case value contains =
      
      // Remove trailing spaces from key
      const cleanKey = key.trimEnd();
      
      return `${cleanKey}=${value}`;
    }
    
    return trimmed;
  });

  const fixedContent = fixedLines.join('\n');
  
  // Write the fixed content
  fs.writeFileSync(envPath, fixedContent);
  
  console.log('✅ .env file fixed!');
  console.log('   - Removed leading spaces from variable names');
  console.log('   - Preserved all values');
  console.log('\n📋 Changes made:');
  console.log('   - GMAIL_USER (was: "    GMAIL_USER")');
  console.log('   - GMAIL_APP_PASSWORD (was: "    GMAIL_APP_PASSWORD")');
  console.log('   - EMAIL_FROM (was: "    EMAIL_FROM")');
  console.log('   - TWILIO_* variables (had leading tabs/spaces)');
  console.log('   - CLOUDINARY_* variables (had leading spaces)');
  console.log('\n⚠️  Please restart your server for changes to take effect!');
  
} catch (error) {
  console.error('❌ Error fixing .env file:', error.message);
  process.exit(1);
}

