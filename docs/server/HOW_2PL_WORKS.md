# How 2PL Concurrency Control Works - Step by Step

## 🎯 The Problem It Solves

Imagine two staff members trying to update the same order at the same time:

**Without 2PL:**
```
Staff A: Reads Order #123 (total: ₱500)
Staff B: Reads Order #123 (total: ₱500)  ← Same time!
Staff A: Updates total to ₱600
Staff B: Updates total to ₱550  ← Overwrites A's change!
Result: Order #123 has ₱550 (A's ₱600 is lost!) ❌
```

**With 2PL:**
```
Staff A: Locks Order #123 → Reads (₱500) → Updates (₱600) → Releases lock
Staff B: Waits... → Locks Order #123 → Reads (₱600) → Updates (₱550) → Releases lock
Result: Order #123 has ₱550 (correct final value) ✅
```

---

## 🔄 The Two Phases Explained

### Phase 1: GROWING PHASE 📈
**Rule: You can ONLY acquire locks, NEVER release them**

```
Transaction starts
    ↓
Acquire Lock #1 ✅
    ↓
Acquire Lock #2 ✅
    ↓
Acquire Lock #3 ✅
    ↓
[All locks acquired]
    ↓
TRANSITION TO SHRINKING PHASE
```

### Phase 2: SHRINKING PHASE 📉
**Rule: You can ONLY release locks, NEVER acquire new ones**

```
[All locks acquired]
    ↓
Execute database operations
    ↓
Release Lock #1 ✅
    ↓
Release Lock #2 ✅
    ↓
Release Lock #3 ✅
    ↓
Transaction ends
```

---

## 📝 Real Example: Creating an Order

Let's trace through what happens when Staff A creates an order:

### Step 1: Request Comes In
```javascript
// Staff A wants to create Order #123 with Discount D1
POST /api/orders
{
  customer: "John Doe",
  discountId: "D1",
  items: [...]
}
```

### Step 2: Prepare Resources to Lock
```javascript
const resourcesToLock = [
  {
    resourceId: "customer_JohnDoe",  // Lock customer
    resourceType: "customer",
    lockType: "exclusive"  // Write lock
  },
  {
    resourceId: "D1",  // Lock discount
    resourceType: "discount",
    lockType: "exclusive"  // Write lock
  }
];
```

### Step 3: GROWING PHASE - Acquire Locks
```javascript
TransactionWrapper.withTransaction({
  resources: resourcesToLock,
  userId: staffA._id,
  operation: async (session) => {
    // This code runs AFTER all locks are acquired
  }
});
```

**What happens internally:**

```
1. Generate Transaction ID: "txn_1234567890_abc123"
   
2. Try to acquire customer lock:
   - Check: Is "customer_JohnDoe" locked?
   - If NO → Create lock in database ✅
   - If YES → Wait 100ms, retry (up to 10 seconds)
   
3. Try to acquire discount lock:
   - Check: Is "D1" locked?
   - If NO → Create lock in database ✅
   - If YES → Wait 100ms, retry
   
4. All locks acquired! ✅
```

**Database state after locks acquired:**
```javascript
// Locks collection in MongoDB
[
  {
    resourceId: "customer_JohnDoe",
    resourceType: "customer",
    lockType: "exclusive",
    transactionId: "txn_1234567890_abc123",
    userId: staffA._id,
    phase: "growing",  // ← Still in growing phase
    status: "active",
    acquiredAt: "2024-01-15T10:00:00Z",
    expiresAt: "2024-01-15T10:00:30Z"  // 30 seconds from now
  },
  {
    resourceId: "D1",
    resourceType: "discount",
    lockType: "exclusive",
    transactionId: "txn_1234567890_abc123",
    userId: staffA._id,
    phase: "growing",
    status: "active",
    acquiredAt: "2024-01-15T10:00:00Z",
    expiresAt: "2024-01-15T10:00:30Z"
  }
]
```

### Step 4: TRANSITION TO SHRINKING PHASE
```javascript
// All locks acquired, now mark transaction as "shrinking"
await LockManager.transitionToShrinkingPhase(transactionId);

// This updates all locks:
// phase: "growing" → phase: "shrinking"
```

**Why this matters:**
- Prevents acquiring NEW locks (enforces 2PL rule)
- But allows releasing existing locks

### Step 5: Execute Operations
```javascript
operation: async (session) => {
  // NOW we can safely modify the database
  
  // 1. Find or create customer
  let customer = await Customer.findOne({ name: "John Doe" });
  if (!customer) {
    customer = new Customer({ name: "John Doe", ... });
    await customer.save();  // ✅ Safe - we have customer lock
  }
  
  // 2. Apply discount
  const discount = await Discount.findById("D1");
  discount.usageCount += 1;  // ✅ Safe - we have discount lock
  await discount.save();
  
  // 3. Create order
  const order = new Order({
    id: "#ORD-123",
    customer: "John Doe",
    discountId: "D1",
    ...
  });
  await order.save();  // ✅ Safe - no conflicts possible
  
  return order;
}
```

### Step 6: SHRINKING PHASE - Release Locks
```javascript
// After operation completes (success or error)
await LockManager.releaseAllLocks(transactionId);

// This updates all locks:
// status: "active" → status: "released"
// releasedAt: current timestamp
```

**Database state after locks released:**
```javascript
[
  {
    resourceId: "customer_JohnDoe",
    ...
    phase: "shrinking",
    status: "released",  // ← Released
    releasedAt: "2024-01-15T10:00:05Z"
  },
  {
    resourceId: "D1",
    ...
    phase: "shrinking",
    status: "released",  // ← Released
    releasedAt: "2024-01-15T10:00:05Z"
  }
]
```

---

## 🔒 Lock Compatibility Rules

### Shared Locks (Read Locks)
**Multiple transactions can read simultaneously**

```
Transaction A: Shared lock on Order #123 ✅
Transaction B: Shared lock on Order #123 ✅  ← Both can read!
Transaction C: Shared lock on Order #123 ✅  ← All can read!
```

### Exclusive Locks (Write Locks)
**Only ONE transaction can write**

```
Transaction A: Exclusive lock on Order #123 ✅
Transaction B: Tries exclusive lock... ⏳ WAITS
Transaction C: Tries shared lock... ⏳ WAITS

Transaction A: Releases lock ✅
Transaction B: Now acquires lock ✅
Transaction C: Still waits... ⏳
```

### Compatibility Matrix

| Existing Lock | Requested Lock | Compatible? |
|--------------|----------------|-------------|
| Shared       | Shared         | ✅ YES      |
| Shared       | Exclusive      | ❌ NO       |
| Exclusive    | Shared         | ❌ NO       |
| Exclusive    | Exclusive      | ❌ NO       |

---

## 🚨 What Happens When Two Transactions Conflict?

### Scenario: Two Staff Updating Same Order

**Timeline:**

```
10:00:00.000 - Staff A starts updating Order #123
              → Acquires EXCLUSIVE lock on Order #123 ✅
              
10:00:00.100 - Staff B tries updating Order #123
              → Tries to acquire EXCLUSIVE lock
              → Lock already held by Staff A ❌
              → Waits 100ms, retries...
              → Still locked, waits 100ms...
              → (repeats up to 10 seconds)
              
10:00:05.000 - Staff A finishes update
              → Releases lock ✅
              
10:00:05.100 - Staff B's retry succeeds!
              → Acquires EXCLUSIVE lock ✅
              → Updates order
              → Releases lock ✅
```

**Result:** Both updates succeed, one after the other (no data loss!)

---

## ⏱️ Timeout Protection

### Lock Expiration
Every lock has an expiration time (default: 30 seconds)

```javascript
{
  expiresAt: "2024-01-15T10:00:30Z"  // 30 seconds from acquisition
}
```

**If transaction hangs:**
- Lock automatically expires after 30 seconds
- MongoDB TTL index removes expired locks
- Other transactions can proceed

### Maximum Wait Time
If a lock can't be acquired within 10 seconds:
```javascript
throw new Error(
  "Timeout: Could not acquire exclusive lock on order:123 after 10000ms"
);
```

---

## 🎬 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    TRANSACTION STARTS                        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              PHASE 1: GROWING PHASE 📈                      │
│  Rule: Can ONLY acquire locks, NEVER release                │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌───────────────────┴───────────────────┐
        │                                       │
   Try Lock #1                            Try Lock #2
        │                                       │
   Available?                            Available?
    ├─ YES → Acquire ✅                  ├─ YES → Acquire ✅
    └─ NO → Wait & Retry ⏳               └─ NO → Wait & Retry ⏳
        │                                       │
        └───────────────────┬───────────────────┘
                            ↓
              ┌─────────────────────────┐
              │  All Locks Acquired?    │
              └─────────────────────────┘
                      │
            ┌─────────┴─────────┐
            │                   │
          YES ✅               NO ⏳
            │                   │
            ↓                   └──→ Continue waiting
    ┌───────────────────┐
    │ TRANSITION PHASE   │
    │ growing → shrinking│
    └───────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│              PHASE 2: SHRINKING PHASE 📉                    │
│  Rule: Can ONLY release locks, NEVER acquire new ones      │
└─────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────┐
│         EXECUTE DATABASE OPERATIONS                          │
│  - Read/Write data safely                                    │
│  - No conflicts possible (locks held)                       │
└─────────────────────────────────────────────────────────────┘
            ↓
        ┌─────────┴─────────┐
        │                   │
    Success ✅          Error ❌
        │                   │
        └─────────┬─────────┘
                  ↓
    ┌─────────────────────────────┐
    │   RELEASE ALL LOCKS         │
    │   status: active → released │
    └─────────────────────────────┘
                  ↓
    ┌─────────────────────────────┐
    │      TRANSACTION ENDS       │
    └─────────────────────────────┘
```

---

## 💡 Key Benefits

1. **No Data Loss**: Concurrent updates don't overwrite each other
2. **Consistency**: All transactions see consistent data
3. **Serializability**: Transactions execute as if they were sequential
4. **Deadlock Prevention**: Strict 2PL prevents deadlocks
5. **Automatic Cleanup**: Expired locks are automatically removed

---

## 🔍 How to See It in Action

### Check Active Locks
```javascript
const Lock = require('./models/LockModel');

// See all active locks
const activeLocks = await Lock.find({ status: 'active' });
console.log('Active locks:', activeLocks);
```

### Monitor Lock Operations
Watch your server logs for these emojis:
- 🔒 = Lock acquired
- 🔓 = Lock released
- 📈 = Growing phase
- 📉 = Shrinking phase
- ⚠️ = Lock warning
- ❌ = Lock error

### Example Log Output
```
📈 Transaction txn_1234567890_abc123 - GROWING PHASE: Acquiring locks...
🔒 Lock acquired: exclusive lock on order:#ORD-123 by transaction txn_1234567890_abc123
✅ Transaction txn_1234567890_abc123 - All locks acquired (1 locks)
📉 Transaction txn_1234567890_abc123 - SHRINKING PHASE: Executing operation...
✅ Transaction txn_1234567890_abc123 - Operation completed successfully
🔓 Transaction txn_1234567890_abc123 - Releasing locks...
🔓 Released 1 locks for transaction txn_1234567890_abc123
✅ Transaction txn_1234567890_abc123 - All locks released
```

---

## 🎓 Summary

**2PL = Two Simple Rules:**

1. **Growing Phase**: Acquire all locks first, then execute
2. **Shrinking Phase**: Execute operations, then release all locks

**Result:** Transactions never conflict, data stays consistent, no deadlocks!

The system automatically handles all the complexity - you just wrap your operations with `TransactionWrapper.withTransaction()` and it works! 🎉

