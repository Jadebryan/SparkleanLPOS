# Edit Lock Implementation - Frontend-Based 2PL

## Overview

This implementation provides **frontend-based edit locking** that prevents concurrent editing conflicts. When a user clicks the "Edit" button, the order is immediately locked, and other users see the edit button disabled with a notification.

## How It Works

### 1. **Lock Acquisition (On Edit Click)**
- When user clicks "Edit" button (in modal or table), the system immediately acquires an edit lock
- Lock is valid for 5 minutes (auto-expires)
- If another user already has the lock, the request fails with a clear error message

### 2. **Lock Status Polling**
- System polls lock status every 2-3 seconds to detect when locks are released
- Other users see real-time updates when an order becomes available for editing

### 3. **Lock Release**
- Lock is automatically released when:
  - User saves changes
  - User cancels editing
  - User closes the modal
  - Lock expires (5 minutes timeout)

### 4. **Visual Feedback**
- **Edit button disabled** when order is locked by another user
- **Warning message** shows who is editing the order
- **Real-time updates** as lock status changes

## API Endpoints

### Acquire Edit Lock
```
POST /api/orders/:id/lock
```
Acquires an edit lock for the order. Returns 409 if already locked by another user.

### Release Edit Lock
```
DELETE /api/orders/:id/lock
```
Releases the edit lock for the order.

### Check Lock Status
```
GET /api/orders/:id/lock
```
Returns current lock status, including who has the lock (if any).

## Implementation Details

### Admin Frontend (React)
**File**: `LaundryPos(ADMIN)/src/pages/OrderManagement.tsx`

**Features**:
- Lock acquired when "Edit" button clicked (modal or table)
- Lock status checked every 3 seconds for all orders
- Edit buttons disabled when locked by another user
- Visual warning banner shows who is editing
- Lock released on save, cancel, or modal close

**Key Functions**:
- `handleUpdate()` - Acquires lock before entering edit mode
- `handleSave()` - Releases lock after saving
- `closeModal()` - Releases lock when closing modal
- `checkLockStatus()` - Checks lock status for an order
- `startLockStatusPolling()` - Starts periodic lock checks

### Staff Frontend (React Native)
**File**: `LaundryPOS(STAFF)/app/home/orderListComponents/viewTransaction.tsx`

**Features**:
- Lock acquired when "Edit" button clicked
- Lock status checked every 2 seconds
- Edit button disabled when locked by another user
- Alert dialog shows who is editing
- Lock released on save, cancel, or modal close

**Key Functions**:
- `handleEdit()` - Acquires lock before entering edit mode
- `handleSave()` - Releases lock after saving
- `handleCancel()` - Releases lock when canceling
- `checkLockStatus()` - Checks lock status for an order
- `startLockStatusPolling()` - Starts periodic lock checks

### Backend
**Files**: 
- `server/controllers/OrderController.js` - Lock management methods
- `server/routes/OrderRoutes.js` - Lock API routes

**Methods**:
- `acquireEditLock()` - Acquires lock, returns 409 if conflict
- `releaseEditLock()` - Releases lock for current user
- `checkEditLock()` - Returns lock status and owner info

## User Experience

### Scenario 1: Staff starts editing
1. Staff clicks "Edit" button
2. Lock acquired immediately
3. Admin sees edit button disabled with message: "This order is being edited by [Staff Name]"
4. Staff can edit freely
5. When Staff saves/cancels, lock is released
6. Admin can now edit

### Scenario 2: Admin starts editing first
1. Admin clicks "Edit" button
2. Lock acquired immediately
3. Staff sees edit button disabled with alert: "This order is currently being edited by [Admin Name]"
4. Admin can edit freely
5. When Admin saves/cancels, lock is released
6. Staff can now edit

### Scenario 3: Concurrent edit attempt
1. Staff clicks "Edit" → Lock acquired
2. Admin tries to click "Edit" → Error: "This order is currently being edited by [Staff Name]"
3. Edit button is disabled for Admin
4. Admin sees warning banner
5. When Staff finishes, Admin can edit

## Lock Timeout

- **Default timeout**: 5 minutes
- Locks automatically expire after timeout
- Prevents deadlocks from abandoned edit sessions
- MongoDB TTL index automatically cleans up expired locks

## Benefits

1. **Immediate Feedback**: Users know instantly if an order is being edited
2. **Prevents Conflicts**: No race conditions or lost updates
3. **User-Friendly**: Clear messages show who is editing
4. **Real-Time Updates**: Lock status updates automatically
5. **Automatic Cleanup**: Expired locks are cleaned up automatically

## Testing

### Test Concurrent Editing
1. Open Admin app and Staff app side by side
2. Admin clicks "Edit" on an order
3. Staff should see edit button disabled
4. Staff should see warning message
5. Admin saves changes
6. Staff should now be able to edit

### Test Lock Timeout
1. Acquire lock
2. Wait 5+ minutes
3. Lock should expire automatically
4. Other users can now acquire lock

## Future Enhancements

1. **WebSocket Support**: Real-time lock updates instead of polling
2. **Lock Extensions**: Allow extending lock timeout while editing
3. **Lock Notifications**: Push notifications when lock is released
4. **Lock History**: Track who edited what and when

