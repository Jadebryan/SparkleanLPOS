# Login Authentication Analysis

## 🔍 Current Login Flow

### 1. **Login Process** (`app/login/index.tsx`)
- **API Endpoint**: `http://localhost:3000/api/auth/login`
- **Method**: POST with `email` and `password`
- **On Success (200)**:
  - Saves user data to AsyncStorage with key `"user"`:
    ```javascript
    {
      name: body.user.name,
      email: body.user.email,
      staffId: body.user.staffId
    }
    ```
  - Redirects to `/home/orderList`

- **Error Handling**:
  - 404: Email not registered
  - 401: Invalid credentials
  - 403: Account inactive
  - 429: Too many login attempts

### 2. **Authentication Check** (`app/index.tsx`)
- **Current Behavior**: Checks for `"userToken"` key
- **Problem**: Login saves `"user"`, not `"userToken"` ❌
- **Result**: Always redirects to login even after successful login

### 3. **Logout Process** (`app/home/components/sideBar.tsx`)
- Removes both `"userToken"` and `"user"` from AsyncStorage
- Navigates to `/login`

### 4. **API Calls** (`app/home/addOrderComponents/addOrderForm.tsx`)
- Checks for `"token"` key in AsyncStorage
- Uses `Bearer ${token}` in Authorization header
- **Problem**: Login never saves a token! ❌

---

## 🚨 Critical Issues

### Issue #1: Token Not Stored
**Location**: `app/login/index.tsx` line 109
```javascript
await AsyncStorage.setItem("user", JSON.stringify(staff));
```

**Problem**: The backend likely returns a JWT token (as seen in admin app), but this app:
- ❌ Doesn't store the token
- ❌ Only stores user info (name, email, staffId)

**Expected Backend Response** (based on admin app):
```javascript
{
  success: true,
  data: {
    token: "jwt-token-here",
    username: "...",
    email: "...",
    role: "staff",
    id: "..."
  }
}
```

### Issue #2: Inconsistent Storage Keys
| Location | Checks For | Sets |
|----------|-----------|------|
| `app/index.tsx` | `"userToken"` | ❌ Nothing |
| `app/login/index.tsx` | - | `"user"` |
| `app/home/addOrderComponents/addOrderForm.tsx` | `"token"` | ❌ Nothing |
| `app/home/components/sideBar.tsx` (logout) | - | Removes `"userToken"` and `"user"` |

### Issue #3: Missing Token in API Calls
**Location**: `app/home/addOrderComponents/addOrderForm.tsx` line 32
```javascript
const token = await AsyncStorage.getItem('token');
```
This will always be `null` because login never stores a token!

---

## ✅ Recommended Fixes

### Fix #1: Update Login to Store Token
```javascript
// In app/login/index.tsx, after successful login (line 102-112):
if (res.status === 200) {
  const body = await res.json();
  
  // Store token if provided
  if (body.token || body.data?.token) {
    const token = body.token || body.data.token;
    await AsyncStorage.setItem("token", token);
    await AsyncStorage.setItem("userToken", token); // For compatibility
  }
  
  // Store user info
  const staff = {
    name: body.user?.name || body.data?.fullName,
    email: body.user?.email || body.data?.email,
    staffId: body.user?.staffId || body.data?.id,
    _id: body.user?._id || body.data?.id,
  };
  await AsyncStorage.setItem("user", JSON.stringify(staff));
  
  router.push("/home/orderList");
  return;
}
```

### Fix #2: Update Index Check
```javascript
// In app/index.tsx, change line 12:
const user = await AsyncStorage.getItem("user");
setIsLoggedIn(!!user);
// OR check for token:
const token = await AsyncStorage.getItem("token");
setIsLoggedIn(!!token || !!user);
```

### Fix #3: Standardize Storage Keys
Create a utility file `utils/storage.ts`:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  USER_TOKEN: 'userToken', // For backward compatibility
};

export const storage = {
  async setAuth(token: string, user: any) {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.TOKEN, token],
      [STORAGE_KEYS.USER_TOKEN, token],
      [STORAGE_KEYS.USER, JSON.stringify(user)],
    ]);
  },
  
  async getToken() {
    return await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  },
  
  async getUser() {
    const user = await AsyncStorage.getItem(STORAGE_KEYS.USER);
    return user ? JSON.parse(user) : null;
  },
  
  async clearAuth() {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.TOKEN,
      STORAGE_KEYS.USER_TOKEN,
      STORAGE_KEYS.USER,
    ]);
  },
};
```

---

## 📋 Current Backend API Expectations

Based on the admin app and server code:
- **Login Endpoint**: `POST /api/auth/login`
- **Expected Request**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Expected Response (200)**:
  ```json
  {
    "success": true,
    "data": {
      "token": "jwt-token-string",
      "username": "staff123",
      "email": "staff@example.com",
      "role": "staff",
      "id": "user_id_here",
      "fullName": "Staff Name"
    }
  }
  ```
- **Or Alternative Response**:
  ```json
  {
    "user": {
      "name": "Staff Name",
      "email": "staff@example.com",
      "staffId": "id_here"
    },
    "token": "jwt-token-string"
  }
  ```

---

## 🔐 Security Concerns

1. **No Token Validation**: App doesn't verify if token is expired
2. **No Automatic Refresh**: No token refresh mechanism
3. **Token Not Verified on App Start**: Should validate token with backend
4. **No Protected Routes**: Any user can access routes if they know the path

---

## 🎯 Summary

**Main Problems**:
1. ❌ Login doesn't store authentication token
2. ❌ Index page checks wrong storage key (`userToken` vs `user`)
3. ❌ API calls expect token but it's never saved
4. ❌ Inconsistent storage key usage across the app

**Impact**: 
- Users can't stay logged in (always redirected to login)
- API calls fail authentication (no token available)
- Poor user experience

**Priority**: **HIGH** - This breaks core functionality

