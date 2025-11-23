# Admin vs Staff Login: Database & Storage Comparison

## ✅ **YES - They Use the SAME Database**

### Backend/Database Level

**Both admin and staff use:**
- ✅ **Same User Model** (`server/models/UserModel.js`)
- ✅ **Same Database Collection** (MongoDB `users` collection)
- ✅ **Same Authentication Controller** (`server/controllers/AuthController.js`)
- ✅ **Same Login Endpoint** (`POST /api/auth/login`)
- ✅ **Same JWT Token Generation** (same secret, same format)
- ✅ **Same User Schema** with `role` field: `["admin", "staff"]`

**Database Structure:**
```javascript
{
  email: String,
  username: String,
  password: String (hashed),
  role: "admin" | "staff",
  isActive: Boolean,
  lastLogin: Date,
  // ... other fields
}
```

**Key Point**: Admin and staff are stored in the **same collection**, differentiated only by the `role` field.

---

## ❌ **NO - They Use DIFFERENT Client-Side Storage**

### Client-Side Storage

| Aspect | Admin App | Staff App |
|--------|-----------|-----------|
| **Storage Type** | `localStorage` (browser) | `AsyncStorage` (React Native) |
| **Storage Key** | `"user"` | `"user"` (inconsistent with `"userToken"` checks) |
| **What's Stored** | ✅ Token + User data | ❌ Only user data (token missing!) |
| **Platform** | Web Browser | React Native (Mobile/Web) |

### Admin App Storage (`LaundryPos(ADMIN)`)
```javascript
// Stored in localStorage
{
  id: "...",
  username: "...",
  email: "...",
  role: "admin" | "staff",
  fullName: "...",
  token: "jwt-token-here" ✅
}
```

### Staff App Storage (`LaundryPOS(STAFF)`)
```javascript
// Currently stored in AsyncStorage
{
  name: "...",
  email: "...",
  staffId: "..."
  // ❌ Missing: token, _id
}
```

---

## ⚠️ **POTENTIAL ISSUE: Different API Ports**

### Current Configuration

| App | API Endpoint | Port |
|-----|-------------|------|
| **Admin** | `http://localhost:5000/api/auth/login` | Port 5000 |
| **Staff** | `http://localhost:3000/api/auth/login` | Port 3000 |

**This suggests:**
1. **Two different backend servers running** (unlikely)
2. **Configuration mismatch** (more likely)
3. **Environment variable not set properly**

**Recommendation**: Both should use the same backend URL:
- Check your `.env` file or server configuration
- Staff app should use: `http://localhost:5000/api` (or match admin)
- Or create a shared config file for API URL

---

## 🔍 **Backend Response Format**

### What Backend Returns (from `AuthController.js`)
```javascript
{
  success: true,
  message: "Login successful",
  data: {
    id: user._id,
    email: user.email,
    username: user.username,
    role: user.role,        // "admin" or "staff"
    lastLogin: user.lastLogin,
    token: token            // JWT token
  }
}
```

### How Admin App Handles It
```javascript
// ✅ Correctly extracts and stores token
login(data.data.username, data.data.email, role, data.data.fullName, data.data.token, data.data.id)
// Stores in localStorage with token included
```

### How Staff App Handles It (Current - Broken)
```javascript
// ❌ Only saves user info, ignores token!
const staff = {
  name: body.user.name,        // But response has body.data, not body.user!
  email: body.user.email,
  staffId: body.user.staffId,
};
await AsyncStorage.setItem("user", JSON.stringify(staff));
// ❌ Token is never saved!
```

---

## 🔧 **Issues to Fix**

### Issue 1: Staff App Doesn't Store Token
**Location**: `app/login/index.tsx` line 102-109

**Current Code**:
```javascript
if (res.status === 200) {
  const body = await res.json();
  const staff = {
    name: body.user.name,    // Wrong - should be body.data
    email: body.user.email,
    staffId: body.user.staffId,
  };
  await AsyncStorage.setItem("user", JSON.stringify(staff));
  // ❌ Token never saved!
}
```

**Should Be**:
```javascript
if (res.status === 200) {
  const body = await res.json();
  
  // Store token
  if (body.data?.token) {
    await AsyncStorage.setItem("token", body.data.token);
    await AsyncStorage.setItem("userToken", body.data.token); // For compatibility
  }
  
  // Store user info
  const staff = {
    name: body.data.fullName || body.data.username,
    email: body.data.email,
    staffId: body.data.id,
    _id: body.data.id,
    role: body.data.role,
  };
  await AsyncStorage.setItem("user", JSON.stringify(staff));
  
  router.push("/home/orderList");
}
```

### Issue 2: API Endpoint Port Mismatch
**Check**:
- Are both apps pointing to the same backend server?
- Should staff app use port 5000 instead of 3000?
- Or is there a proxy/redirect configuration?

### Issue 3: Response Structure Mismatch
Staff app expects `body.user.*` but backend returns `body.data.*`

---

## 📊 **Summary Table**

| Question | Answer |
|----------|--------|
| **Same database?** | ✅ YES - Same MongoDB collection, same User model |
| **Same backend endpoint?** | ✅ YES - Same `/api/auth/login` route |
| **Same authentication method?** | ✅ YES - Same JWT tokens, same secret |
| **Same user collection?** | ✅ YES - Both stored in `users` collection |
| **Same client storage?** | ❌ NO - localStorage vs AsyncStorage |
| **Same storage format?** | ❌ NO - Admin stores token, Staff doesn't |
| **Same API port?** | ⚠️ UNKNOWN - Admin uses 5000, Staff uses 3000 |

---

## 🎯 **Key Takeaway**

**Backend**: ✅ Fully unified - admin and staff share the same database, authentication, and user management.

**Frontend**: ❌ Inconsistent implementation - admin app properly stores tokens, staff app doesn't. This breaks authentication for the staff app.

**Action Required**: Fix staff app to:
1. Store the JWT token from login response
2. Use correct response structure (`body.data.*` not `body.user.*`)
3. Verify API port configuration matches backend server

