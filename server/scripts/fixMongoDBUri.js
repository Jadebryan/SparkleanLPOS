/**
 * Script to fix MongoDB URI in .env file
 * Removes any invalid characters or formatting issues
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
const backupPath = path.join(__dirname, '..', '.env.backup2');

try {
  // Read the current .env file
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Create backup
  fs.writeFileSync(backupPath, envContent);
  console.log('✅ Backup created: .env.backup2\n');

  // Find and fix MONGODB_URI
  const lines = envContent.split('\n');
  const fixedLines = lines.map(line => {
    if (line.trim().startsWith('MONGODB_URI=')) {
      // Extract the URI value
      const parts = line.split('=');
      if (parts.length >= 2) {
        // Get everything after the first =
        let uri = parts.slice(1).join('=').trim();
        
        // Remove any non-printable characters
        uri = uri.replace(/[^\x20-\x7E]/g, '');
        
        // Ensure it starts with mongodb:// or mongodb+srv://
        if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
          console.log('⚠️  MONGODB_URI does not start with mongodb:// or mongodb+srv://');
          console.log(`   Original: ${uri.substring(0, 50)}...`);
        }
        
        // Reconstruct the line
        return `MONGODB_URI=${uri}`;
      }
    }
    return line;
  });

  const fixedContent = fixedLines.join('\n');
  
  // Write the fixed content
  fs.writeFileSync(envPath, fixedContent);
  
  console.log('✅ .env file fixed!');
  console.log('   - Cleaned MONGODB_URI of invalid characters');
  console.log('\n⚠️  Please restart your server for changes to take effect!');
  
} catch (error) {
  console.error('❌ Error fixing .env file:', error.message);
  process.exit(1);
}

