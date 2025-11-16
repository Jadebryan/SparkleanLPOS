const mongoose = require('mongoose');

/**
 * Lock Schema for 2PL (Two-Phase Locking) Concurrency Control
 * 
 * This model stores lock information for resources to prevent concurrent access conflicts.
 * Locks follow the 2PL protocol:
 * - Growing Phase: Locks can be acquired but not released
 * - Shrinking Phase: Locks can be released but not acquired
 */
const LockSchema = new mongoose.Schema({
  // Resource identifier (e.g., order ID, customer ID)
  resourceId: {
    type: String,
    required: true,
    index: true
  },
  
  // Resource type (e.g., 'order', 'customer', 'discount', 'inventory')
  resourceType: {
    type: String,
    required: true,
    enum: ['order', 'customer', 'discount', 'inventory', 'service', 'expense'],
    index: true
  },
  
  // Lock type: 'shared' (read) or 'exclusive' (write)
  lockType: {
    type: String,
    required: true,
    enum: ['shared', 'exclusive'],
    default: 'exclusive'
  },
  
  // Transaction ID (unique identifier for the transaction)
  transactionId: {
    type: String,
    required: true,
    index: true
  },
  
  // User who acquired the lock
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Lock phase: 'growing' (can acquire locks) or 'shrinking' (can release locks)
  phase: {
    type: String,
    required: true,
    enum: ['growing', 'shrinking'],
    default: 'growing'
  },
  
  // Lock acquisition timestamp
  acquiredAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  
  // Lock expiration timestamp (locks expire after timeout)
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 } // MongoDB TTL index for auto-cleanup
  },
  
  // Lock release timestamp (null if still active)
  releasedAt: {
    type: Date,
    default: null
  },
  
  // Status: 'active' or 'released'
  status: {
    type: String,
    enum: ['active', 'released'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Compound index for efficient lock queries
LockSchema.index({ resourceId: 1, resourceType: 1, status: 1 });
LockSchema.index({ transactionId: 1, status: 1 });
LockSchema.index({ userId: 1, status: 1 });

// Prevent duplicate active locks on same resource
LockSchema.index(
  { resourceId: 1, resourceType: 1, status: 1, lockType: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

const Lock = mongoose.model('Lock', LockSchema);

module.exports = Lock;

