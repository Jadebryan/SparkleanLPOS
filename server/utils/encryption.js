const crypto = require('crypto');

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES
const SALT_LENGTH = 64; // 64 bytes for salt
const TAG_LENGTH = 16; // 16 bytes for GCM tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Get encryption key from environment variable or generate a default one
 * WARNING: In production, always set ENCRYPTION_KEY in .env file
 */
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    console.warn('⚠️  ENCRYPTION_KEY not set in .env file. Using default key (NOT SECURE FOR PRODUCTION)');
    // Default key for development only - should be changed in production
    return crypto.scryptSync('default-laundry-pos-key-change-in-production', 'salt', KEY_LENGTH);
  }
  
  // If key is provided as hex string, convert it
  if (envKey.length === 64) {
    return Buffer.from(envKey, 'hex');
  }
  
  // Otherwise, derive key from the provided string
  return crypto.scryptSync(envKey, 'laundry-pos-salt', KEY_LENGTH);
}

/**
 * Encrypt sensitive data
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted data in format: iv:salt:tag:encryptedData (all hex encoded)
 */
function encrypt(text) {
  if (!text || typeof text !== 'string') {
    return text; // Return as-is if not a string or empty
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine: iv:salt:tag:encryptedData
    return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * @param {string} encryptedText - Encrypted data in format: iv:salt:tag:encryptedData
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText; // Return as-is if not a string or empty
  }
  
  // Check if the text is already decrypted (doesn't contain colons in the expected format)
  if (!encryptedText.includes(':') || encryptedText.split(':').length !== 4) {
    // Might be plain text (for backward compatibility with existing data)
    return encryptedText;
  }
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }
    
    const [ivHex, saltHex, tagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // If decryption fails, return the original text (for backward compatibility)
    return encryptedText;
  }
}

/**
 * Encrypt an object's specified fields
 * @param {Object} obj - Object to encrypt
 * @param {string[]} fields - Array of field names to encrypt
 * @returns {Object} - Object with specified fields encrypted
 */
function encryptObject(obj, fields = ['name', 'email', 'phone']) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const encrypted = { ...obj };
  
  fields.forEach(field => {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = encrypt(encrypted[field]);
    }
  });
  
  return encrypted;
}

/**
 * Decrypt an object's specified fields
 * @param {Object} obj - Object to decrypt
 * @param {string[]} fields - Array of field names to decrypt
 * @returns {Object} - Object with specified fields decrypted
 */
function decryptObject(obj, fields = ['name', 'email', 'phone']) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  
  const decrypted = { ...obj };
  
  fields.forEach(field => {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      decrypted[field] = decrypt(decrypted[field]);
    }
  });
  
  return decrypted;
}

/**
 * Check if a string is encrypted (has the expected format)
 * @param {string} text - Text to check
 * @returns {boolean} - True if encrypted, false otherwise
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const parts = text.split(':');
  return parts.length === 4 && parts.every(part => /^[0-9a-f]+$/i.test(part));
}

module.exports = {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  isEncrypted,
  getEncryptionKey
};

