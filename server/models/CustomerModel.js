const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    // Remove lowercase: true - it corrupts encrypted base64 strings
    // Email is lowercased manually before encryption in controllers
    trim: true,
    set: function(value) {
      // Only lowercase if it's not encrypted (doesn't contain colons in encrypted format)
      if (!value) return value;
      // Check if it's encrypted format (contains colons in the expected pattern)
      if (value.includes(':')) {
        const parts = value.split(':');
        // If it's encrypted format (3 or 4 parts), don't lowercase
        if (parts.length === 3 || parts.length === 4) {
          return value; // Return encrypted value as-is
        }
      }
      // For plain text emails, lowercase them
      return value.toLowerCase();
    },
    validate: {
      validator: function(value) {
        // Skip validation if email is empty (optional field)
        if (!value || value.trim() === '') {
          return true;
        }
        // Skip validation if email appears to be encrypted (contains colons, base64 format)
        // Encrypted format: iv:tag:encryptedData (base64) or iv:salt:tag:encryptedData (hex)
        if (value.includes(':')) {
          const parts = value.split(':');
          // Check if it's encrypted format (3 or 4 parts)
          if (parts.length === 3 || parts.length === 4) {
            return true; // Valid encrypted format, skip email regex validation
          }
        }
        // Validate plain text email with regex
        return /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value);
      },
      message: 'Please enter a valid email'
    }
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  totalOrders: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  lastOrder: {
    type: Date,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  notes: {
    type: String,
    default: ''
  },
  stationId: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Index for search optimization
customerSchema.index({ name: 1, email: 1, phone: 1 });
customerSchema.index({ isArchived: 1 });
customerSchema.index({ stationId: 1 });

module.exports = mongoose.model('Customer', customerSchema);

