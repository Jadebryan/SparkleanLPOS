# Rate Limiting Explained

## What is Rate Limiting?

Rate limiting is a security feature that **controls how many requests a user or IP address can make to your API within a specific time period**. It's like a speed limit for your server - it prevents abuse and protects your system.

---

## 🛡️ Why Do We Need Rate Limiting?

### 1. **Protection Against DDoS Attacks**
- **Problem:** Attackers can flood your server with thousands of requests per second, crashing it
- **Solution:** Rate limiting stops this by limiting how many requests can be made
- **Example:** Without rate limiting, an attacker could send 10,000 requests/second and crash your server

### 2. **Prevent Brute Force Attacks**
- **Problem:** Attackers try to guess passwords by trying thousands of login attempts
- **Solution:** Rate limiting on login endpoints (5 attempts per 15 minutes) stops brute force attacks
- **Example:** An attacker can't try 1000 passwords in a minute - they're limited to 5 attempts

### 3. **Protect Server Resources**
- **Problem:** Too many requests can overload your server, making it slow for everyone
- **Solution:** Rate limiting ensures fair usage and prevents one user from consuming all resources
- **Example:** One user making 1000 requests/second can slow down the server for all other users

### 4. **Cost Control**
- **Problem:** If you're using cloud services, excessive API calls can cost money
- **Solution:** Rate limiting prevents unexpected costs from abuse
- **Example:** Each API call might cost $0.001 - 10,000 requests = $10 wasted

### 5. **Fair Usage**
- **Problem:** One user or application could monopolize your API
- **Solution:** Rate limiting ensures all users get fair access
- **Example:** Without limits, one user could make all the requests, leaving nothing for others

---

## 📊 How Rate Limiting Works in Your System

### Current Configuration

#### **Development Mode** (More Lenient)
- **General API:** 5,000 requests per 15 minutes
- **Login/Register:** 50 attempts per 15 minutes
- **Password Reset:** 20 attempts per hour
- **File Uploads:** 100 uploads per 15 minutes
- **Special:** Lock status checks and notification streaming are **excluded** (no limits)

#### **Production Mode** (Strict)
- **General API:** 100 requests per 15 minutes
- **Login/Register:** 5 attempts per 15 minutes
- **Password Reset:** 3 attempts per hour
- **File Uploads:** 20 uploads per 15 minutes

---

## 🔍 What Happens When Rate Limit is Exceeded?

When someone exceeds the rate limit:

1. **Request is Blocked:** The API returns a `429 Too Many Requests` status code
2. **Error Message:** User sees: "Too many requests from this IP, please try again later."
3. **Logging:** In production, the event is logged for security monitoring
4. **Wait Period:** User must wait until the time window resets (15 minutes)

### Example Response:
```json
{
  "success": false,
  "message": "Too many requests from this IP, please try again later."
}
```

---

## 🎯 Real-World Examples

### Example 1: Brute Force Attack Prevention
```
Attacker tries to guess password:
- Attempt 1: "password123" ❌
- Attempt 2: "admin123" ❌
- Attempt 3: "123456" ❌
- Attempt 4: "qwerty" ❌
- Attempt 5: "letmein" ❌
- Attempt 6: BLOCKED! ⛔ (Rate limit exceeded)

Without rate limiting: Attacker could try 10,000 passwords
With rate limiting: Attacker can only try 5 passwords per 15 minutes
```

### Example 2: DDoS Attack Prevention
```
Attacker sends 10,000 requests per second:
- Request 1-100: ✅ Allowed
- Request 101-10,000: ❌ BLOCKED! (Rate limit exceeded)

Without rate limiting: Server crashes 💥
With rate limiting: Server stays online ✅
```

### Example 3: Normal User Usage
```
Normal user browsing the app:
- Page load: 20 API requests ✅
- Clicking around: 50 more requests ✅
- Total: 70 requests in 5 minutes ✅ (Well under 5,000 limit)

No problems! User can use the app normally.
```

---

## ⚙️ How It's Configured in Your System

### Rate Limiter Middleware
**File:** `server/middleware/rateLimiter.js`

```javascript
// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 100, // Requests allowed
  // ... other settings
});
```

### Applied to Routes
**File:** `server/index.js`

```javascript
// Apply rate limiting to all API routes
app.use("/api/", apiLimiter);

// Special limits for sensitive endpoints
app.use("/api/auth/login", authLimiter); // Stricter limit
```

---

## 🚨 Why You're Seeing Warnings

The warnings you're seeing are because:

1. **Your app makes many requests** - When loading the order management page, it checks lock status for every order
2. **Development mode** - Even with 5,000 requests limit, if you refresh the page many times quickly, you might hit it
3. **Multiple users** - If multiple people are using the app from the same network, they share the same IP limit

### Solutions:

1. **Restart the server** - This resets the rate limit counter
2. **Wait 15 minutes** - The limit resets automatically
3. **Use different IPs** - Each IP has its own limit
4. **Optimize the app** - Reduce the number of API calls (we've already excluded lock checks in dev)

---

## 📈 Rate Limit Headers

The API includes rate limit information in response headers:

```
RateLimit-Limit: 5000        // Maximum requests allowed
RateLimit-Remaining: 4950    // Requests remaining
RateLimit-Reset: 1638360000  // When the limit resets (Unix timestamp)
```

---

## 🔧 Customization

You can adjust rate limits by editing `server/middleware/rateLimiter.js`:

```javascript
// Increase limit for development
max: isDevelopment ? 10000 : 100, // Change 5000 to 10000

// Change time window
windowMs: 30 * 60 * 1000, // Change from 15 to 30 minutes
```

---

## ✅ Best Practices

1. **Different limits for different endpoints**
   - Login: Very strict (5 attempts)
   - General API: Moderate (100 requests)
   - Health check: No limit (always available)

2. **Environment-specific limits**
   - Development: Lenient (for testing)
   - Production: Strict (for security)

3. **User-friendly error messages**
   - Tell users what happened
   - Suggest when to try again

4. **Monitor and adjust**
   - Watch for false positives
   - Adjust limits based on actual usage

---

## 🎓 Summary

**Rate limiting is like a bouncer at a club:**
- It lets legitimate users in (normal API requests)
- It stops troublemakers (attackers, abusers)
- It ensures everyone has a good time (fair resource usage)
- It protects the venue (your server)

**Without rate limiting:**
- ❌ Server can be crashed by attackers
- ❌ Passwords can be brute-forced
- ❌ One user can slow down everyone
- ❌ Unexpected costs from abuse

**With rate limiting:**
- ✅ Server is protected from attacks
- ✅ Passwords are safe from brute force
- ✅ Fair usage for all users
- ✅ Predictable costs

---

*Last Updated: [Current Date]*

