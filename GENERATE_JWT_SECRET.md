# How to Generate a Secure JWT Secret

This guide shows you multiple ways to generate a secure JWT secret for your Laundry POS system.

## 🔐 Requirements

- **Minimum length:** 32 characters (as enforced by the environment validator)
- **Recommended length:** 64+ characters for better security
- **Character types:** Use a mix of letters, numbers, and special characters
- **Uniqueness:** Never use default or common secrets

---

## Method 1: Using Node.js (Recommended)

### Quick One-Liner:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

This generates a 128-character hexadecimal string (64 bytes × 2).

### Alternative (Base64):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Example Output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

---

## Method 2: Using OpenSSL (Linux/Mac)

```bash
openssl rand -hex 64
```

Or for Base64:
```bash
openssl rand -base64 64
```

---

## Method 3: Using PowerShell (Windows)

```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | ForEach-Object {[char]$_})
```

Or using .NET cryptography:
```powershell
[Convert]::ToBase64String((1..64 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

## Method 4: Using Python

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Or:
```bash
python -c "import secrets; print(secrets.token_hex(64))"
```

---

## Method 5: Online Generator (Use with Caution)

⚠️ **Warning:** Only use trusted online generators, and never use the same secret for production.

**Trusted Options:**
- https://www.grc.com/passwords.htm (Gibson Research Corporation)
- https://randomkeygen.com/

**Best Practice:** Generate locally using Method 1 or 2 for maximum security.

---

## 📝 Setting Up Your JWT Secret

### Step 1: Generate the Secret

Using Node.js (recommended):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copy the output.

### Step 2: Add to Your .env File

**For Server (`server/.env`):**
```env
JWT_SECRET=your-generated-secret-here-minimum-32-characters
JWT_EXPIRE=7d
```

**Example:**
```env
JWT_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
JWT_EXPIRE=7d
```

### Step 3: Verify It Works

Start your server:
```bash
cd server
npm start
```

The environment validator will check:
- ✅ Secret exists
- ✅ Secret is at least 32 characters
- ✅ Secret is not the default value
- ✅ Secret is not obviously weak

If validation fails, you'll see an error message.

---

## 🔒 Security Best Practices

### ✅ DO:
- Generate a unique secret for each environment (dev, staging, production)
- Use at least 64 characters for production
- Store secrets securely (environment variables, not in code)
- Rotate secrets periodically (every 90 days recommended)
- Use different secrets for different services

### ❌ DON'T:
- Use default or example secrets
- Share secrets in version control
- Use simple passwords or dictionary words
- Reuse secrets across environments
- Commit `.env` files to git

---

## 🔄 Rotating JWT Secrets

If you need to rotate your JWT secret:

1. **Generate a new secret** using one of the methods above
2. **Update your `.env` file** with the new secret
3. **Restart your server**
4. **Note:** All existing tokens will become invalid - users will need to log in again

---

## 🧪 Testing Your Secret

You can test if your secret is valid by checking the server logs on startup:

```bash
cd server
npm start
```

You should see:
```
✅ Environment variables validated successfully
```

If you see an error, check:
- Secret length (minimum 32 characters)
- Secret is not the default value
- Secret doesn't contain obvious weak patterns

---

## 📋 Quick Reference

### Generate 128-character hex secret (Recommended):
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Generate 88-character base64 secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### Check secret length:
```bash
node -e "console.log('Length:', process.argv[1].length)" "your-secret-here"
```

---

## 🆘 Troubleshooting

### Error: "JWT_SECRET must be at least 32 characters long"
**Solution:** Generate a longer secret (64+ characters recommended)

### Error: "JWT_SECRET must be changed from default value"
**Solution:** Make sure you're not using the default example secret

### Error: "JWT_SECRET is required but not set"
**Solution:** Add `JWT_SECRET=your-secret` to your `server/.env` file

---

*Last Updated: [Current Date]*

