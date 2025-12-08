# Customer Data Encryption Guide

This guide explains how to enable and use customer data encryption in the Laundry POS system.

## Overview

The system can encrypt sensitive customer data (name, email, phone) using AES-256-GCM encryption. This provides protection for customer privacy and helps comply with data protection regulations.

## Enabling Encryption

### Step 1: Generate Encryption Key

Generate a secure 64-character hex key (Windows-friendly, no OpenSSL needed):

```powershell
python - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
```

You’ll see a 64-char hex string, e.g.:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
ENABLE_CUSTOMER_ENCRYPTION=true
ENCRYPTION_KEY=da062147c13426379a356dccfe6826d535e85da4834b14dbbeeda86cf42bbd1b
```

### Step 3: Restart Server

Restart your server for changes to take effect:

```bash
npm start
```

## How It Works

### Automatic Encryption

Once enabled, the system automatically:
- **Encrypts** customer data when creating or updating customers
- **Decrypts** customer data when retrieving customers
- Handles both encrypted and plain text data (for backward compatibility)

### Encryption Format

Encrypted data is stored in the format:
```
iv:salt:tag:encryptedData
```

All components are hex-encoded.

### Backward Compatibility

The system can handle:
- **Encrypted data** - Automatically decrypted when reading
- **Plain text data** - Remains readable (for existing data before encryption was enabled)

## Important Warnings

### ⚠️ Encryption Key Management

1. **Never lose your encryption key** - If you lose it, encrypted data cannot be decrypted
2. **Never change the key** - Changing the key will make existing encrypted data unreadable
3. **Backup your key** - Store it securely (e.g., password manager, secure vault)
4. **Don't commit to git** - Keep encryption keys out of version control

### ⚠️ Data Migration

If you enable encryption on an existing database:
- **Existing data remains unencrypted** (for backward compatibility)
- **New data will be encrypted**
- To encrypt existing data, you would need to:
  1. Export all customers
  2. Re-import them (they will be encrypted on save)

### ⚠️ Performance

- Encryption/decryption adds minimal overhead
- Database queries on encrypted fields require full table scans (indexes won't work on encrypted data)
- Consider this when enabling encryption on large databases

## Disabling Encryption

To disable encryption:

1. Set `ENABLE_CUSTOMER_ENCRYPTION=false` in `.env`
2. Restart server
3. New data will be stored as plain text
4. Existing encrypted data will remain encrypted (but readable if key is still set)

## API Usage

The encryption is transparent to API consumers. The API automatically:
- Encrypts data in requests (if enabled)
- Decrypts data in responses (if enabled)

No changes needed in frontend code.

## Encryption Utility Functions

The encryption utility (`server/utils/encryption.js`) provides:

```javascript
const { encrypt, decrypt, encryptObject, decryptObject } = require('./utils/encryption');

// Encrypt a single value
const encrypted = encrypt('John Doe');
const decrypted = decrypt(encrypted);

// Encrypt object fields
const customer = { name: 'John', email: 'john@example.com', phone: '1234567890' };
const encryptedCustomer = encryptObject(customer, ['name', 'email', 'phone']);
const decryptedCustomer = decryptObject(encryptedCustomer, ['name', 'email', 'phone']);
```

## Troubleshooting

### "Failed to decrypt data" Error

- Check that `ENCRYPTION_KEY` is set correctly
- Verify the key matches the one used to encrypt the data
- Ensure the key hasn't been changed since data was encrypted

### Data Appears Encrypted in Database

This is normal! The data is stored encrypted. The API automatically decrypts it when serving to clients.

### Search Not Working

Encrypted fields cannot be indexed or searched efficiently. The system uses regex search which may be slower on large datasets.

## Security Best Practices

1. **Use strong encryption keys** - Generate with `openssl rand -hex 32`
2. **Rotate keys periodically** - Plan for key rotation (requires re-encryption)
3. **Secure key storage** - Use environment variables, not code
4. **Backup encrypted data** - Regular backups include encrypted data
5. **Access control** - Limit who can access encryption keys
6. **Audit logging** - Monitor access to encrypted data

## Compliance

Encryption helps with:
- **GDPR** - Protection of personal data
- **CCPA** - California Consumer Privacy Act
- **HIPAA** - Health Insurance Portability (if applicable)
- **PCI DSS** - Payment Card Industry (if storing payment data)

Always consult with legal/compliance teams to ensure full compliance with applicable regulations.

