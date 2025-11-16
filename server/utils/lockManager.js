const Lock = require('../models/LockModel');
const mongoose = require('mongoose');

/**
 * Two-Phase Locking (2PL) Lock Manager
 * 
 * Implements strict 2PL protocol:
 * - Growing Phase: Transactions can acquire locks but cannot release any locks
 * - Shrinking Phase: Transactions can release locks but cannot acquire new locks
 * 
 * This ensures serializability and prevents concurrent access conflicts.
 */
class LockManager {
  // Default lock timeout: 30 seconds
  static DEFAULT_LOCK_TIMEOUT = 30000; // milliseconds
  
  // Maximum lock wait time: 10 seconds
  static MAX_WAIT_TIME = 10000;
  
  // Lock retry interval: 100ms
  static RETRY_INTERVAL = 100;

  /**
   * Generate a unique transaction ID
   */
  static generateTransactionId() {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Acquire a lock (Growing Phase)
   * 
   * @param {Object} params
   * @param {String} params.resourceId - Resource identifier
   * @param {String} params.resourceType - Type of resource ('order', 'customer', etc.)
   * @param {String} params.lockType - 'shared' (read) or 'exclusive' (write)
   * @param {String} params.transactionId - Transaction identifier
   * @param {mongoose.Types.ObjectId} params.userId - User acquiring the lock
   * @param {Number} params.timeout - Lock timeout in milliseconds (optional)
   * @returns {Promise<Object>} Lock object
   */
  static async acquireLock({
    resourceId,
    resourceType,
    lockType = 'exclusive',
    transactionId,
    userId,
    timeout = this.DEFAULT_LOCK_TIMEOUT
  }) {
    if (!resourceId || !resourceType || !transactionId || !userId) {
      throw new Error('Missing required parameters for lock acquisition');
    }

    const startTime = Date.now();
    const expiresAt = new Date(Date.now() + timeout);

    // Check if transaction is in shrinking phase (cannot acquire new locks)
    const existingLocks = await Lock.find({
      transactionId,
      status: 'active'
    });

    if (existingLocks.length > 0) {
      const shrinkingLock = existingLocks.find(lock => lock.phase === 'shrinking');
      if (shrinkingLock) {
        throw new Error(
          `Transaction ${transactionId} is in shrinking phase. Cannot acquire new locks.`
        );
      }
    }

    // Retry loop for lock acquisition (handles conflicts)
    while (Date.now() - startTime < this.MAX_WAIT_TIME) {
      try {
        // Check for existing locks on the resource
        const existingLock = await Lock.findOne({
          resourceId,
          resourceType,
          status: 'active'
        });

        if (existingLock) {
          // Check if lock is compatible
          const isCompatible = this.isLockCompatible(
            existingLock.lockType,
            lockType,
            existingLock.transactionId === transactionId
          );

          if (!isCompatible) {
            // Lock conflict - wait and retry
            await this.sleep(this.RETRY_INTERVAL);
            continue;
          }

          // Compatible lock exists - check if same transaction
          if (existingLock.transactionId === transactionId) {
            // Same transaction, lock already acquired
            return existingLock;
          }
        }

        // Try to acquire the lock
        try {
          const lock = new Lock({
            resourceId,
            resourceType,
            lockType,
            transactionId,
            userId,
            phase: 'growing',
            expiresAt,
            status: 'active'
          });

          await lock.save();
          console.log(
            `🔒 Lock acquired: ${lockType} lock on ${resourceType}:${resourceId} by transaction ${transactionId}`
          );
          return lock;
        } catch (error) {
          // Unique constraint violation - lock already exists
          if (error.code === 11000) {
            await this.sleep(this.RETRY_INTERVAL);
            continue;
          }
          throw error;
        }
      } catch (error) {
        if (error.message.includes('shrinking phase')) {
          throw error;
        }
        // Other errors - retry
        await this.sleep(this.RETRY_INTERVAL);
      }
    }

    // Timeout - could not acquire lock
    throw new Error(
      `Timeout: Could not acquire ${lockType} lock on ${resourceType}:${resourceId} after ${this.MAX_WAIT_TIME}ms`
    );
  }

  /**
   * Release a lock (Shrinking Phase)
   * 
   * @param {Object} params
   * @param {String} params.resourceId - Resource identifier
   * @param {String} params.resourceType - Type of resource
   * @param {String} params.transactionId - Transaction identifier
   * @returns {Promise<Boolean>} Success status
   */
  static async releaseLock({ resourceId, resourceType, transactionId }) {
    const lock = await Lock.findOne({
      resourceId,
      resourceType,
      transactionId,
      status: 'active'
    });

    if (!lock) {
      console.warn(
        `⚠️ Lock not found: ${resourceType}:${resourceId} for transaction ${transactionId}`
      );
      return false;
    }

    lock.status = 'released';
    lock.releasedAt = new Date();
    await lock.save();

    console.log(
      `🔓 Lock released: ${lock.lockType} lock on ${resourceType}:${resourceId} by transaction ${transactionId}`
    );
    return true;
  }

  /**
   * Release all locks for a transaction (Shrinking Phase)
   * 
   * @param {String} transactionId - Transaction identifier
   * @returns {Promise<Number>} Number of locks released
   */
  static async releaseAllLocks(transactionId) {
    const locks = await Lock.find({
      transactionId,
      status: 'active'
    });

    if (locks.length === 0) {
      return 0;
    }

    // Mark all locks as released
    const result = await Lock.updateMany(
      {
        transactionId,
        status: 'active'
      },
      {
        $set: {
          status: 'released',
          releasedAt: new Date()
        }
      }
    );

    console.log(
      `🔓 Released ${result.modifiedCount} locks for transaction ${transactionId}`
    );
    return result.modifiedCount;
  }

  /**
   * Transition transaction to shrinking phase
   * All locks for this transaction are marked as shrinking phase
   * 
   * @param {String} transactionId - Transaction identifier
   * @returns {Promise<Number>} Number of locks transitioned
   */
  static async transitionToShrinkingPhase(transactionId) {
    const result = await Lock.updateMany(
      {
        transactionId,
        status: 'active',
        phase: 'growing'
      },
      {
        $set: {
          phase: 'shrinking'
        }
      }
    );

    console.log(
      `📉 Transaction ${transactionId} transitioned to shrinking phase (${result.modifiedCount} locks)`
    );
    return result.modifiedCount;
  }

  /**
   * Check if two lock types are compatible
   * 
   * @param {String} existingLockType - Existing lock type
   * @param {String} requestedLockType - Requested lock type
   * @param {Boolean} sameTransaction - Whether locks belong to same transaction
   * @returns {Boolean} True if compatible
   */
  static isLockCompatible(existingLockType, requestedLockType, sameTransaction) {
    // Same transaction can always acquire locks
    if (sameTransaction) {
      return true;
    }

    // Shared locks are compatible with other shared locks
    if (existingLockType === 'shared' && requestedLockType === 'shared') {
      return true;
    }

    // Exclusive locks are incompatible with any other lock
    return false;
  }

  /**
   * Check if a resource is locked
   * 
   * @param {String} resourceId - Resource identifier
   * @param {String} resourceType - Resource type
   * @returns {Promise<Object|null>} Lock object or null
   */
  static async isResourceLocked(resourceId, resourceType) {
    return await Lock.findOne({
      resourceId,
      resourceType,
      status: 'active'
    });
  }

  /**
   * Clean up expired locks
   * 
   * @returns {Promise<Number>} Number of locks cleaned up
   */
  static async cleanupExpiredLocks() {
    const result = await Lock.updateMany(
      {
        status: 'active',
        expiresAt: { $lt: new Date() }
      },
      {
        $set: {
          status: 'released',
          releasedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned up ${result.modifiedCount} expired locks`);
    }
    return result.modifiedCount;
  }

  /**
   * Get all active locks for a transaction
   * 
   * @param {String} transactionId - Transaction identifier
   * @returns {Promise<Array>} Array of lock objects
   */
  static async getTransactionLocks(transactionId) {
    return await Lock.find({
      transactionId,
      status: 'active'
    });
  }

  /**
   * Sleep utility for retry logic
   * 
   * @param {Number} ms - Milliseconds to sleep
   * @returns {Promise}
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Detect deadlocks using wait-for graph
   * 
   * @returns {Promise<Array>} Array of deadlock cycles
   */
  static async detectDeadlocks() {
    const activeLocks = await Lock.find({ status: 'active' })
      .populate('userId', 'username email')
      .sort({ resourceId: 1, resourceType: 1 });

    // Build wait-for graph
    const waitForGraph = new Map();
    const transactions = new Set();

    for (const lock of activeLocks) {
      transactions.add(lock.transactionId);
      if (!waitForGraph.has(lock.transactionId)) {
        waitForGraph.set(lock.transactionId, new Set());
      }

      // Find conflicting locks
      for (const otherLock of activeLocks) {
        if (
          lock.transactionId !== otherLock.transactionId &&
          lock.resourceId === otherLock.resourceId &&
          lock.resourceType === otherLock.resourceType &&
          !this.isLockCompatible(lock.lockType, otherLock.lockType, false)
        ) {
          waitForGraph.get(lock.transactionId).add(otherLock.transactionId);
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set();
    const recStack = new Set();
    const cycles = [];

    const dfs = (txnId, path) => {
      if (recStack.has(txnId)) {
        // Cycle detected
        const cycleStart = path.indexOf(txnId);
        cycles.push(path.slice(cycleStart).concat(txnId));
        return;
      }

      if (visited.has(txnId)) {
        return;
      }

      visited.add(txnId);
      recStack.add(txnId);

      const waitingFor = waitForGraph.get(txnId) || new Set();
      for (const nextTxnId of waitingFor) {
        dfs(nextTxnId, [...path, txnId]);
      }

      recStack.delete(txnId);
    };

    for (const txnId of transactions) {
      if (!visited.has(txnId)) {
        dfs(txnId, []);
      }
    }

    return cycles;
  }
}

module.exports = LockManager;

