const mongoose = require('mongoose');

/**
 * Audit Log Model
 * Stores user activity and system events for audit trail
 */
const auditLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['user_action', 'system_event', 'security_event'],
    required: true
  },
  action: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  userEmail: {
    type: String,
    default: null
  },
  userRole: {
    type: String,
    enum: ['admin', 'staff'],
    default: null
  },
  resource: {
    type: String, // e.g., 'order', 'customer', 'user'
    default: null
  },
  resourceId: {
    type: String, // ID of the affected resource
    default: null
  },
  method: {
    type: String, // HTTP method
    default: null
  },
  endpoint: {
    type: String, // API endpoint
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // Flexible object for additional details
    default: {}
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'error'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  // Create index for common queries
  indexes: [
    { userId: 1, createdAt: -1 },
    { type: 1, createdAt: -1 },
    { action: 1, createdAt: -1 },
    { resource: 1, resourceId: 1 }
  ]
});

// TTL index to auto-delete old logs after 90 days
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

