const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Discount code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Discount name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Discount type is required']
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value must be a positive number']
  },
  minPurchase: {
    type: Number,
    default: 0,
    min: [0, 'Minimum purchase must be a positive number']
  },
  validFrom: {
    type: Date,
    required: [true, 'Valid from date is required']
  },
  validUntil: {
    type: Date,
    required: [true, 'Valid until date is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Usage count cannot be negative']
  },
  maxUsage: {
    type: Number,
    default: 0, // 0 means unlimited
    min: [0, 'Max usage cannot be negative']
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Indexes
discountSchema.index({ code: 1 });
discountSchema.index({ isActive: 1, isArchived: 1 });
discountSchema.index({ validFrom: 1, validUntil: 1 });

// Virtual to check if discount is currently valid
discountSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.validFrom <= now && this.validUntil >= now && 
         (this.maxUsage === 0 || this.usageCount < this.maxUsage);
});

module.exports = mongoose.model('Discount', discountSchema);

