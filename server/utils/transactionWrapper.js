const LockManager = require('./lockManager');
const mongoose = require('mongoose');

/**
 * Transaction Wrapper for 2PL Concurrency Control
 * 
 * This wrapper automatically manages the two-phase locking protocol:
 * 1. Growing Phase: Acquires locks before executing operations
 * 2. Shrinking Phase: Releases locks after operations complete
 * 
 * Usage:
 *   const result = await withTransaction({
 *     resources: [{ resourceId: 'order123', resourceType: 'order', lockType: 'exclusive' }],
 *     userId: req.user._id,
 *     operation: async (session) => {
 *       // Your database operations here
 *       // Use session for MongoDB transactions if needed
 *     }
 *   });
 */
class TransactionWrapper {
  /**
   * Execute an operation with 2PL concurrency control
   * 
   * @param {Object} params
   * @param {Array} params.resources - Array of resources to lock
   *   [{ resourceId, resourceType, lockType }]
   * @param {mongoose.Types.ObjectId} params.userId - User executing the transaction
   * @param {Function} params.operation - Async function to execute
   * @param {Number} params.lockTimeout - Lock timeout in milliseconds (optional)
   * @param {Boolean} params.useMongoSession - Whether to use MongoDB session (optional)
   * @returns {Promise<*>} Result of the operation
   */
  static async withTransaction({
    resources = [],
    userId,
    operation,
    lockTimeout = LockManager.DEFAULT_LOCK_TIMEOUT,
    useMongoSession = false
  }) {
    if (!userId) {
      throw new Error('UserId is required for transaction');
    }

    if (!operation || typeof operation !== 'function') {
      throw new Error('Operation function is required');
    }

    const transactionId = LockManager.generateTransactionId();
    const acquiredLocks = [];
    let mongoSession = null;

    try {
      // GROWING PHASE: Acquire all required locks
      console.log(`📈 Transaction ${transactionId} - GROWING PHASE: Acquiring locks...`);

      for (const resource of resources) {
        const lock = await LockManager.acquireLock({
          resourceId: resource.resourceId,
          resourceType: resource.resourceType,
          lockType: resource.lockType || 'exclusive',
          transactionId,
          userId,
          timeout: lockTimeout
        });
        acquiredLocks.push(lock);
      }

      console.log(`✅ Transaction ${transactionId} - All locks acquired (${acquiredLocks.length} locks)`);

      // Start MongoDB session if requested
      if (useMongoSession) {
        mongoSession = await mongoose.startSession();
        mongoSession.startTransaction();
      }

      // TRANSITION TO SHRINKING PHASE: Mark transaction as shrinking
      // This prevents acquiring new locks but allows releasing existing ones
      await LockManager.transitionToShrinkingPhase(transactionId);

      console.log(`📉 Transaction ${transactionId} - SHRINKING PHASE: Executing operation...`);

      // Execute the operation
      const result = await operation(mongoSession);

      // Commit MongoDB transaction if session was used
      if (mongoSession) {
        await mongoSession.commitTransaction();
      }

      console.log(`✅ Transaction ${transactionId} - Operation completed successfully`);

      return result;
    } catch (error) {
      // Rollback MongoDB transaction if session was used
      if (mongoSession) {
        await mongoSession.abortTransaction();
      }

      console.error(`❌ Transaction ${transactionId} - Error:`, error.message);
      throw error;
    } finally {
      // SHRINKING PHASE: Release all locks
      console.log(`🔓 Transaction ${transactionId} - Releasing locks...`);

      try {
        await LockManager.releaseAllLocks(transactionId);
        console.log(`✅ Transaction ${transactionId} - All locks released`);
      } catch (releaseError) {
        console.error(
          `⚠️ Transaction ${transactionId} - Error releasing locks:`,
          releaseError.message
        );
      }

      // End MongoDB session if it was started
      if (mongoSession) {
        await mongoSession.endSession();
      }
    }
  }

  /**
   * Execute an operation with automatic resource detection
   * Automatically locks resources based on operation type
   * 
   * @param {Object} params
   * @param {String} params.operationType - Type of operation ('create', 'update', 'delete', 'read')
   * @param {String} params.resourceType - Type of resource ('order', 'customer', etc.)
   * @param {String|Array} params.resourceIds - Resource ID(s) to lock
   * @param {mongoose.Types.ObjectId} params.userId - User executing the transaction
   * @param {Function} params.operation - Async function to execute
   * @returns {Promise<*>} Result of the operation
   */
  static async withAutoTransaction({
    operationType,
    resourceType,
    resourceIds,
    userId,
    operation
  }) {
    // Determine lock type based on operation
    const lockType = operationType === 'read' ? 'shared' : 'exclusive';

    // Convert single resourceId to array
    const resourceIdsArray = Array.isArray(resourceIds) ? resourceIds : [resourceIds];

    // Build resources array
    const resources = resourceIdsArray
      .filter(id => id) // Filter out null/undefined
      .map(resourceId => ({
        resourceId: String(resourceId),
        resourceType,
        lockType
      }));

    return await this.withTransaction({
      resources,
      userId,
      operation
    });
  }
}

module.exports = TransactionWrapper;

