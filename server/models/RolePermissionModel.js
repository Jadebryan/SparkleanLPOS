const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
  resource: {
    type: String,
    required: true,
    trim: true
  },
  actions: {
    type: [String],
    required: true,
    default: []
  }
}, { _id: false });

const rolePermissionSchema = new mongoose.Schema({
  role: {
    type: String,
    required: true,
    enum: ['admin', 'staff'],
    unique: true,
    trim: true
  },
  permissions: {
    type: [permissionSchema],
    default: []
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes (role already has unique: true which creates an index)
rolePermissionSchema.index({ isActive: 1 });

module.exports = mongoose.model('RolePermission', rolePermissionSchema);

