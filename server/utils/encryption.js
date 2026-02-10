const crypto = require('crypto');

// Encryption configuration - optimized for performance
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes is standard for GCM (more efficient than 16)
const TAG_LENGTH = 16; // 16 bytes for GCM authentication tag
const KEY_LENGTH = 32; // 32 bytes for AES-256

// Pre-initialize encryption key at module load for maximum performance
let encryptionKey = null;

/**
 * Initialize encryption key from environment variable
 * Called once at module load time for optimal performance
 * WARNING: In production, always set ENCRYPTION_KEY in .env file
 */
function initializeEncryptionKey() {
  if (encryptionKey) {
    return encryptionKey; // Already initialized
  }
  
  const envKey = process.env.ENCRYPTION_KEY;
  
  if (!envKey) {
    console.warn('⚠️  ENCRYPTION_KEY not set in .env file. Using default key (NOT SECURE FOR PRODUCTION)');
    // Default key for development only - should be changed in production
    encryptionKey = crypto.scryptSync('default-laundry-pos-key-change-in-production', 'salt', KEY_LENGTH);
    return encryptionKey;
  }
  
  // If key is provided as hex string, convert it (fast path - most common case)
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    encryptionKey = Buffer.from(envKey, 'hex');
    return encryptionKey;
  }
  
  // Otherwise, derive key from the provided string (slow, but only done once at startup)
  encryptionKey = crypto.scryptSync(envKey, 'laundry-pos-salt', KEY_LENGTH);
  return encryptionKey;
}

/**
 * Get encryption key (returns pre-initialized key)
 */
function getEncryptionKey() {
  if (!encryptionKey) {
    return initializeEncryptionKey();
  }
  return encryptionKey;
}

// Initialize key immediately when module loads
initializeEncryptionKey();

/**
 * Encrypt sensitive data
 * Optimized for performance: uses 12-byte IV, base64 encoding, no unused salt
 * @param {string} text - Plain text to encrypt
 * @returns {string} - Encrypted data in format: iv:tag:encryptedData (all base64 encoded)
 */
function encrypt(text) {
  if (!text || typeof text !== 'string' || text.length === 0) {
    return text; // Return as-is if not a string or empty
  }
  
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH); // 12 bytes for GCM (standard)
    
    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text (using base64 for better performance than hex)
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    // Get authentication tag
    const tag = cipher.getAuthTag();
    
    // Combine: iv:tag:encryptedData (all base64 encoded for efficiency)
    // Format changed: removed unused salt, using base64 instead of hex
    return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data
 * Supports both new format (base64, 3 parts) and old format (hex, 4 parts) for backward compatibility
 * @param {string} encryptedText - Encrypted data in format: iv:tag:encryptedData (base64) or iv:salt:tag:encryptedData (hex)
 * @returns {string} - Decrypted plain text
 */
function decrypt(encryptedText) {
  if (!encryptedText || typeof encryptedText !== 'string') {
    return encryptedText; // Return as-is if not a string or empty
  }
  
  // Check if the text is already decrypted (doesn't contain colons)
  if (!encryptedText.includes(':')) {
    // Might be plain text (for backward compatibility with existing data)
    return encryptedText;
  }
  
  try {
    const key = getEncryptionKey();
    const parts = encryptedText.split(':');
    
    let iv, tag, encrypted;
    
    // Support new format: iv:tag:encryptedData (base64, 3 parts)
    if (parts.length === 3) {
      iv = Buffer.from(parts[0], 'base64');
      tag = Buffer.from(parts[1], 'base64');
      encrypted = Buffer.from(parts[2], 'base64');
    }
    // Support old format: iv:salt:tag:encryptedData (hex, 4 parts) for backward compatibility
    else if (parts.length === 4) {
      iv = Buffer.from(parts[0], 'hex');
      tag = Buffer.from(parts[2], 'hex'); // Skip salt (parts[1])
      encrypted = Buffer.from(parts[3], 'hex');
    } else {
      throw new Error('Invalid encrypted data format');
    }
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    
    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error.message);
    console.error('Encrypted text format:', encryptedText.substring(0, 50) + '...');
    // If decryption fails, check if it's actually encrypted or just plain text
    // If it contains colons in the expected format, it's encrypted but decryption failed
    if (encryptedText.includes(':') && encryptedText.split(':').length >= 3) {
      console.error('Decryption failed for encrypted data. This may indicate:');
      console.error('1. Encryption key mismatch');
      console.error('2. Data was encrypted with a different key');
      console.error('3. Corrupted encrypted data');
    }
    // Return the original text (for backward compatibility with plain text)
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
      try {
        const decryptedValue = decrypt(decrypted[field]);
        // Only update if decryption actually changed the value
        // If decrypt returns the same value, it might be plain text or decryption failed
        if (decryptedValue !== decrypted[field] || !decrypted[field].includes(':')) {
          decrypted[field] = decryptedValue;
        }
      } catch (error) {
        console.error(`Error decrypting field ${field}:`, error);
        // If decryption fails, check if it's already plain text
        // If it contains colons (encrypted format), log warning but keep original
        if (decrypted[field].includes(':')) {
          console.warn(`Failed to decrypt ${field}, returning encrypted value. This may indicate a key mismatch.`);
        }
        // Otherwise, assume it's plain text and keep it
      }
    }
  });
  
  return decrypted;
}

/**
 * Check if a string is encrypted (has the expected format)
 * Supports both new (base64, 3 parts) and old (hex, 4 parts) formats
 * @param {string} text - Text to check
 * @returns {boolean} - True if encrypted, false otherwise
 */
function isEncrypted(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }
  
  const parts = text.split(':');
  
  // New format: 3 parts (base64)
  if (parts.length === 3) {
    // Check if all parts are valid base64
    return parts.every(part => {
      try {
        Buffer.from(part, 'base64');
        return part.length > 0;
      } catch {
        return false;
      }
    });
  }
  
  // Old format: 4 parts (hex)
  if (parts.length === 4) {
    return parts.every(part => /^[0-9a-f]+$/i.test(part));
  }
  
  return false;
}

module.exports = {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  isEncrypted,
  getEncryptionKey
};

