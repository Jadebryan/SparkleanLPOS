# Two-Phase Locking (2PL) Concurrency Control Implementation

## Overview

This document describes the implementation of **Two-Phase Locking (2PL)** concurrency control in the Laundry POS system. 2PL ensures serializability of transactions and prevents concurrent access conflicts when multiple users are accessing and modifying the same resources simultaneously.

## What is 2PL?

Two-Phase Locking is a concurrency control protocol that ensures transactions are serializable. It consists of two phases:

1. **Growing Phase**: Transactions can acquire locks but **cannot release any locks**
2. **Shrinking Phase**: Transactions can release locks but **cannot acquire new locks**

This strict protocol prevents deadlocks and ensures data consistency.

## Architecture

### Components

1. **Lock Model** (`server/models/LockModel.js`)
   - Stores lock information in MongoDB
   - Tracks resource locks, transaction IDs, lock types, and phases
   - Uses TTL indexes for automatic cleanup of expired locks

2. **Lock Manager** (`server/utils/lockManager.js`)
   - Core 2PL implementation
   - Handles lock acquisition (Growing Phase)
   - Handles lock release (Shrinking Phase)
   - Provides deadlock detection
   - Manages lock compatibility (shared vs exclusive)

3. **Transaction Wrapper** (`server/utils/transactionWrapper.js`)
   - High-level API for wrapping operations with 2PL
   - Automatically manages the two-phase protocol
   - Handles lock acquisition, phase transitions, and cleanup

## Lock Types

### Shared Locks (Read Locks)
- Multiple transactions can hold shared locks on the same resource
- Used for read-only operations
- Compatible with other shared locks

### Exclusive Locks (Write Locks)
- Only one transaction can hold an exclusive lock on a resource
- Used for write operations (create, update, delete)
- Incompatible with any other lock type

## Resource Types

The system supports locking on the following resource types:

- `order` - Order records
- `customer` - Customer records
- `discount` - Discount codes
- `inventory` - Inventory items
- `service` - Service definitions
- `expense` - Expense records

## Usage Examples

### Basic Usage

```javascript
const TransactionWrapper = require('../utils/transactionWrapper');

// Wrap an operation with 2PL
const result = await TransactionWrapper.withTransaction({
  resources: [
    {
      resourceId: 'order123',
      resourceType: 'order',
      lockType: 'exclusive'  // or 'shared' for read operations
    }
  ],
  userId: req.user._id,
  operation: async (session) => {
    // Your database operations here
    // All locks are automatically acquired before this runs
    // All locks are automatically released after this completes
    
    const order = await Order.findById('order123');
    order.status = 'Completed';
    await order.save();
    
    return order;
  }
});
```

### Order Creation with 2PL

The `createOrder` method automatically locks:
- Customer resource (if creating/updating customer)
- Discount resource (if applying discount)
- Draft order (if converting from draft)

```javascript
// In OrderController.createOrder
const resourcesToLock = [];

// Lock customer if creating/updating
if (!skipCustomerCreation && customer) {
  resourcesToLock.push({
    resourceId: `customer_${customerPhone || customer}`,
    resourceType: 'customer',
    lockType: 'exclusive'
  });
}

// Lock discount if being used
if (discountId) {
  resourcesToLock.push({
    resourceId: String(discountId),
    resourceType: 'discount',
    lockType: 'exclusive'
  });
}

const order = await TransactionWrapper.withTransaction({
  resources: resourcesToLock,
  userId: req.user._id,
  operation: async (session) => {
    // Order creation logic here
  }
});
```

### Order Update with 2PL

```javascript
// In OrderController.updateOrder
const resourcesToLock = [
  {
    resourceId: orderId,
    resourceType: 'order',
    lockType: 'exclusive'
  }
];

const order = await TransactionWrapper.withTransaction({
  resources: resourcesToLock,
  userId: req.user._id,
  operation: async (session) => {
    // Order update logic here
  }
});
```

## Lock Lifecycle

1. **Lock Acquisition (Growing Phase)**
   - Transaction requests locks for all required resources
   - Locks are acquired in order to prevent deadlocks
   - If a lock cannot be acquired, the transaction waits (up to MAX_WAIT_TIME)

2. **Phase Transition**
   - Once all locks are acquired, transaction transitions to Shrinking Phase
   - No new locks can be acquired after this point

3. **Operation Execution**
   - The actual database operations are executed
   - All operations see a consistent view of the data

4. **Lock Release (Shrinking Phase)**
   - After operation completes (successfully or with error)
   - All locks are released
   - Locks are cleaned up from the database

## Configuration

### Lock Timeout
Default lock timeout: **30 seconds**
- Locks automatically expire after this time
- Prevents deadlocks from hung transactions
- Configurable per transaction

### Maximum Wait Time
Default maximum wait: **10 seconds**
- Maximum time to wait for a lock to become available
- After timeout, transaction fails with error

### Retry Interval
Default retry interval: **100ms**
- Time between lock acquisition retry attempts

## Deadlock Detection

The system includes deadlock detection using a wait-for graph:

```javascript
const LockManager = require('../utils/lockManager');

// Detect deadlocks
const cycles = await LockManager.detectDeadlocks();
if (cycles.length > 0) {
  console.log('Deadlock detected:', cycles);
  // Handle deadlock resolution
}
```

## Error Handling

### Lock Timeout
```javascript
try {
  await TransactionWrapper.withTransaction({...});
} catch (error) {
  if (error.message.includes('Timeout')) {
    // Handle lock timeout
    // Transaction may need to be retried
  }
}
```

### Shrinking Phase Violation
```javascript
// Error thrown if trying to acquire locks in shrinking phase
// This should never happen with TransactionWrapper, but can occur
// if LockManager is used directly incorrectly
```

## Benefits

1. **Data Consistency**: Prevents race conditions and concurrent modification conflicts
2. **Serializability**: Ensures transactions execute as if they were serial
3. **Deadlock Prevention**: Strict 2PL prevents deadlocks
4. **Automatic Cleanup**: Expired locks are automatically cleaned up
5. **Transparent**: Easy to use with TransactionWrapper API

## Performance Considerations

- **Lock Granularity**: Locks are at the resource level (order, customer, etc.)
- **Lock Duration**: Locks are held only during transaction execution
- **Lock Contention**: High contention may cause wait times
- **TTL Indexes**: MongoDB TTL indexes automatically clean up expired locks

## Monitoring

Lock operations are logged with emojis for easy identification:
- 🔒 Lock acquired
- 🔓 Lock released
- 📈 Growing phase
- 📉 Shrinking phase
- ⚠️ Lock warnings
- ❌ Lock errors

## Best Practices

1. **Lock Only What You Need**: Only lock resources that will be modified
2. **Use Appropriate Lock Types**: Use shared locks for reads, exclusive for writes
3. **Keep Transactions Short**: Minimize lock hold time
4. **Handle Timeouts**: Implement retry logic for lock timeouts
5. **Monitor Deadlocks**: Regularly check for deadlock cycles

## Integration Points

2PL is currently integrated into:

- ✅ `OrderController.createOrder` - Order creation
- ✅ `OrderController.updateOrder` - Order updates
- ⏳ `CustomerController` - Customer operations (pending)
- ⏳ `DiscountController` - Discount operations (pending)

## Future Enhancements

1. **Lock Statistics**: Track lock acquisition times and contention
2. **Distributed Locking**: Support for multi-server deployments
3. **Lock Escalation**: Convert multiple shared locks to exclusive lock
4. **Optimistic Locking**: Combine with version numbers for better performance
5. **Lock Priority**: Prioritize certain transactions

## Troubleshooting

### Locks Not Releasing
- Check for unhandled exceptions in transaction operations
- Verify lock timeout is not too long
- Check MongoDB TTL index is working

### High Lock Contention
- Review lock granularity
- Consider using shared locks for read operations
- Optimize transaction duration

### Deadlocks
- Review transaction lock ordering
- Ensure consistent lock acquisition order
- Use deadlock detection to identify cycles

## References

- [Two-Phase Locking (Wikipedia)](https://en.wikipedia.org/wiki/Two-phase_locking)
- [Database Concurrency Control](https://en.wikipedia.org/wiki/Concurrency_control)
- [MongoDB Transactions](https://www.mongodb.com/docs/manual/core/transactions/)

