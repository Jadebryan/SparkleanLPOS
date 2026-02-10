# Data Encryption: How It Works and Implementation

## Overview

Your Laundry POS system uses **AES-256-GCM** (Advanced Encryption Standard with 256-bit keys and Galois/Counter Mode) to encrypt sensitive customer data. This is a military-grade encryption algorithm used by banks and governments worldwide.

---

## How Encryption Works

### 1. **What Gets Encrypted?**

The following customer fields are encrypted when `ENABLE_CUSTOMER_ENCRYPTION=true`:
- **Name** (e.g., "John Doe")
- **Email** (e.g., "john@example.com")
- **Phone** (e.g., "1234567890")

### 2. **The Encryption Process**

When you save customer data, here's what happens:

```
Plain Text: "John Doe"
    ↓
[Encryption Process]
    ↓
Encrypted: "a1b2c3d4...:e5f6g7h8...:i9j0k1l2...:m3n4o5p6..."
```

**Step-by-step encryption:**

1. **Generate Random IV (Initialization Vector)**
   - Creates a unique 16-byte random value for each encryption
   - Ensures the same data encrypts differently each time
   - Prevents pattern detection

2. **Generate Random Salt**
   - Creates a 64-byte random salt
   - Adds extra randomness to the encryption

3. **Create Cipher**
   - Uses AES-256-GCM algorithm
   - Uses your encryption key (from `ENCRYPTION_KEY` env variable)
   - Initializes with the IV

4. **Encrypt the Data**
   - Converts plain text to encrypted bytes
   - Encodes as hexadecimal string

5. **Get Authentication Tag**
   - GCM mode provides built-in authentication
   - Ensures data hasn't been tampered with
   - 16-byte tag for integrity verification

6. **Combine Components**
   - Final format: `iv:salt:tag:encryptedData`
   - All parts are hex-encoded
   - Stored as a single string in database

### 3. **The Decryption Process**

When you retrieve customer data:

```
Encrypted: "a1b2c3d4...:e5f6g7h8...:i9j0k1l2...:m3n4o5p6..."
    ↓
[Decryption Process]
    ↓
Plain Text: "John Doe"
```

**Step-by-step decryption:**

1. **Split the Encrypted String**
   - Separates `iv`, `salt`, `tag`, and `encryptedData`
   - Converts hex strings back to bytes

2. **Create Decipher**
   - Uses the same encryption key
   - Uses the IV from the encrypted data
   - Sets the authentication tag

3. **Decrypt the Data**
   - Converts encrypted bytes back to plain text
   - Verifies authentication tag (ensures data integrity)

4. **Return Plain Text**
   - Returns original data to the application
   - Frontend receives decrypted data automatically

---

## Implementation Details

### File Structure

```
server/
├── utils/
│   └── encryption.js          # Core encryption functions
└── controllers/
    └── CustomerController.js  # Uses encryption for customer data
```

### Key Components

#### 1. **Encryption Utility** (`server/utils/encryption.js`)

**Main Functions:**

```javascript
// Encrypt a single value
encrypt(text) → "iv:salt:tag:encryptedData"

// Decrypt a single value
decrypt(encryptedText) → "plain text"

// Encrypt multiple fields in an object
encryptObject(obj, ['name', 'email', 'phone']) → { name: "encrypted", ... }

// Decrypt multiple fields in an object
decryptObject(obj, ['name', 'email', 'phone']) → { name: "John Doe", ... }

// Check if data is encrypted
isEncrypted(text) → true/false
```

**Key Management:**

```javascript
getEncryptionKey()
  ↓
Checks ENCRYPTION_KEY from .env
  ↓
If 64-char hex: Uses directly
If other string: Derives key using scrypt
If missing: Uses default (development only)
```

#### 2. **Customer Controller Integration**

**When Creating a Customer:**

```javascript
// In CustomerController.createCustomer()
const shouldEncrypt = process.env.ENABLE_CUSTOMER_ENCRYPTION === 'true';

const customerData = {
  name: shouldEncrypt ? encrypt(name) : name,
  email: shouldEncrypt ? encrypt(email) : email,
  phone: shouldEncrypt ? encrypt(phone) : phone,
  // ... other fields
};

// Save to database (encrypted data stored)
await customer.save();
```

**When Retrieving Customers:**

```javascript
// In CustomerController.getAllCustomers()
const customers = await Customer.find(query);

// Decrypt before sending to frontend
const shouldEncrypt = process.env.ENABLE_CUSTOMER_ENCRYPTION === 'true';
const decryptedCustomers = shouldEncrypt 
  ? customers.map(c => decryptObject(c.toObject(), ['name', 'email', 'phone']))
  : customers;

// Frontend receives decrypted data
res.json({ data: decryptedCustomers });
```

**When Updating a Customer:**

```javascript
// In CustomerController.updateCustomer()
const shouldEncrypt = process.env.ENABLE_CUSTOMER_ENCRYPTION === 'true';

if (name) customer.name = shouldEncrypt ? encrypt(name) : name;
if (email) customer.email = shouldEncrypt ? encrypt(email) : email;
if (phone) customer.phone = shouldEncrypt ? encrypt(phone) : phone;

await customer.save();
```

---

## Encryption Flow Diagram

### Write Flow (Create/Update)

```
Frontend Request
    ↓
API Endpoint (CustomerController)
    ↓
Check: ENABLE_CUSTOMER_ENCRYPTION === 'true'?
    ↓ YES
Encrypt: name, email, phone
    ↓
Save to Database (encrypted)
    ↓
Return Success Response
```

### Read Flow (Get/List)

```
API Endpoint (CustomerController)
    ↓
Query Database (encrypted data)
    ↓
Check: ENABLE_CUSTOMER_ENCRYPTION === 'true'?
    ↓ YES
Decrypt: name, email, phone
    ↓
Send to Frontend (decrypted)
    ↓
Frontend displays plain text
```

---

## Security Features

### 1. **AES-256-GCM Algorithm**

- **AES-256**: Uses 256-bit keys (extremely secure)
- **GCM Mode**: Provides both encryption AND authentication
- **Authenticated Encryption**: Detects if data has been tampered with

### 2. **Unique IV per Encryption**

- Each encryption uses a different IV
- Same data encrypts to different ciphertext each time
- Prevents pattern analysis attacks

### 3. **Salt for Key Derivation**

- Adds randomness to key generation
- Makes brute-force attacks much harder
- Different salts = different derived keys

### 4. **Authentication Tag**

- Verifies data integrity during decryption
- Detects tampering or corruption
- Fails decryption if data is modified

### 5. **Backward Compatibility**

- Handles both encrypted and plain text data
- Existing data remains readable
- Gradual migration possible

---

## Configuration

### Environment Variables

```env
# Enable/disable encryption
ENABLE_CUSTOMER_ENCRYPTION=true

# Encryption key (64-char hex or any string)
ENCRYPTION_KEY=your-secret-key-here
```

### Key Generation

**Option 1: Generate 64-character hex key (Recommended)**
```powershell
python - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
```

**Option 2: Use any string (will be derived)**
```env
ENCRYPTION_KEY=my-super-secret-password-123
```

---

## Example: Real-World Usage

### Scenario: Creating a Customer

**1. Frontend sends:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "1234567890"
}
```

**2. Backend receives and encrypts:**
```javascript
// Before saving to database
{
  "name": "a1b2c3d4e5f6...:salt...:tag...:encrypted...",
  "email": "f6e5d4c3b2a1...:salt...:tag...:encrypted...",
  "phone": "1234abcd5678...:salt...:tag...:encrypted..."
}
```

**3. Database stores encrypted data**

**4. When retrieving, backend decrypts:**
```javascript
// After reading from database
{
  "name": "John Doe",        // Decrypted
  "email": "john@example.com", // Decrypted
  "phone": "1234567890"      // Decrypted
}
```

**5. Frontend receives decrypted data (transparent)**

---

## Important Security Considerations

### ✅ **DO:**

1. **Use strong encryption keys**
   - Generate with secure random generator
   - At least 32 characters long

2. **Backup your encryption key**
   - Store in secure password manager
   - Keep multiple secure backups

3. **Protect your .env file**
   - Never commit to git
   - Restrict file permissions
   - Use environment variable management in production

4. **Monitor encryption status**
   - Log encryption/decryption errors
   - Audit access to encrypted data

### ❌ **DON'T:**

1. **Never lose your encryption key**
   - Encrypted data cannot be recovered without the key
   - Data will be permanently lost

2. **Never change the key without re-encryption**
   - Old data will become unreadable
   - Requires full data migration

3. **Never share encryption keys**
   - Keep keys secret and secure
   - Use different keys for different environments

4. **Never disable encryption without planning**
   - Existing encrypted data remains encrypted
   - Plan migration strategy

---

## Performance Impact

### Encryption Overhead

- **Encryption**: ~0.1-1ms per field
- **Decryption**: ~0.1-1ms per field
- **Total per customer**: ~0.3-3ms (negligible)

### Database Impact

- **Storage**: Encrypted data is ~2-3x larger
- **Indexing**: Encrypted fields cannot be efficiently indexed
- **Searching**: Requires full table scans (slower on large datasets)

### Optimization Tips

1. **Index other fields** (not encrypted ones)
2. **Use pagination** for large datasets
3. **Cache decrypted data** when appropriate
4. **Consider partial encryption** (only most sensitive fields)

---

## Troubleshooting

### Issue: "Failed to decrypt data"

**Causes:**
- Wrong encryption key
- Key was changed after encryption
- Data corruption

**Solutions:**
1. Verify `ENCRYPTION_KEY` matches original key
2. Check if key was changed in .env
3. Restore from backup if corrupted

### Issue: Data appears encrypted in database

**This is normal!** The database stores encrypted data. The API automatically decrypts it when serving to clients.

### Issue: Search not working on encrypted fields

**Expected behavior.** Encrypted fields cannot be efficiently searched. The system uses regex search which works but is slower on large datasets.

---

## Compliance Benefits

Encryption helps with:

- **GDPR** (General Data Protection Regulation)
  - Protects personal data
  - Reduces breach impact

- **CCPA** (California Consumer Privacy Act)
  - Protects consumer privacy
  - Meets security requirements

- **HIPAA** (if applicable)
  - Protects health information
  - Meets encryption requirements

- **PCI DSS** (if storing payment data)
  - Protects cardholder data
  - Meets compliance standards

---

## Summary

**How it works:**
1. Data is encrypted before saving to database
2. Encryption uses AES-256-GCM with unique IV per encryption
3. Data is decrypted when retrieved from database
4. Process is transparent to frontend (automatic)

**Key points:**
- ✅ Military-grade encryption (AES-256-GCM)
- ✅ Automatic encryption/decryption
- ✅ Backward compatible with existing data
- ✅ Transparent to frontend applications
- ⚠️ Requires secure key management
- ⚠️ Cannot efficiently search encrypted fields

**Files involved:**
- `server/utils/encryption.js` - Core encryption functions
- `server/controllers/CustomerController.js` - Uses encryption
- `.env` - Configuration (ENABLE_CUSTOMER_ENCRYPTION, ENCRYPTION_KEY)

---

**Last Updated:** January 2025
