# API Endpoint Configuration Fix ✅

## Problem
The staff app was trying to connect to **port 3000**, but the backend server runs on **port 5000**. This caused "Network error" when trying to log in.

## Solution
Created a centralized API configuration and updated all API endpoints to use the correct port (5000).

---

## Changes Made

### 1. Created API Configuration File
**File**: `constants/api.ts`
```typescript
export const API_BASE_URL = "http://localhost:5000/api";
```

This makes it easy to change the API URL in one place if needed.

---

### 2. Updated All API Endpoints

All files now import and use `API_BASE_URL`:

| File | Endpoint | Status |
|------|----------|--------|
| `app/login/index.tsx` | `/auth/login` | ✅ Updated |
| `app/login/forgotPassword.tsx` | `/auth/forgot-password` | ✅ Updated |
| `app/login/resetPassword.tsx` | `/auth/reset-password` | ✅ Updated |
| `app/login/create.tsx` | `/auth/register` | ✅ Updated |
| `app/home/addOrderComponents/addOrderForm.tsx` | `/orders` | ✅ Updated |
| `app/home/manageCustomersComponents/customerTable.tsx` | `/customers` | ✅ Updated |
| `app/home/orderListComponents/orderTable.tsx` | `/orders` | ✅ Updated |
| `app/home/orderListComponents/viewTransaction.tsx` | `/orders/:id` | ✅ Updated |

**Before**: `http://localhost:3000/api/...`  
**After**: `http://localhost:5000/api/...` (from `API_BASE_URL`)

---

### 3. Fixed Logout to Clear All Tokens

Updated logout functions to remove all authentication data:
- `app/home/components/sideBar.tsx` ✅
- `app/home/customer.tsx` ✅
- `app/home/addOrder.tsx` ✅

**Before**: Only removed `"user"`  
**After**: Removes `["token", "userToken", "user"]`

---

## How to Change API URL

If you need to change the API URL in the future:

1. **Edit** `constants/api.ts`:
   ```typescript
   export const API_BASE_URL = "http://your-new-url:port/api";
   ```

2. **Or use environment variable** (uncomment in `constants/api.ts`):
   ```typescript
   export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5000/api";
   ```

---

## Next Steps

1. ✅ **Start your backend server** (if not running):
   ```bash
   cd server
   npm start
   # Server should run on http://localhost:5000
   ```

2. ✅ **Restart your Expo dev server**:
   ```bash
   cd LaundryPOS(STAFF)
   npm run dev
   ```

3. ✅ **Test login** - The network error should be fixed!

---

## Verification

After restarting:
- Login should work without "Network error"
- All API calls should connect to the correct backend
- Logout should clear all authentication data

---

## Summary

✅ **Fixed**: Port mismatch (3000 → 5000)  
✅ **Fixed**: Centralized API configuration  
✅ **Fixed**: Logout clears all tokens  
✅ **Result**: Login should now work correctly!

**Make sure your backend server is running on port 5000 before testing!**

