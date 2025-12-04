const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
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

