const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Voucher code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Voucher name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: [true, 'Voucher type is required']
  },
  value: {
    type: Number,
    required: [true, 'Voucher value is required'],
    min: [0, 'Voucher value must be a positive number']
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
  // Monthly voucher specific fields
  isMonthly: {
    type: Boolean,
    default: false
  },
  monthlyLimitPerCustomer: {
    type: Number,
    default: 1, // 1 voucher per customer per month
    min: [0, 'Monthly limit cannot be negative']
  },
  // Track which customers have used this voucher this month
  monthlyUsage: [{
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true
    },
    month: {
      type: String, // Format: "YYYY-MM" (e.g., "2025-12")
      required: true
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],
  // Points integration
  pointsRequired: {
    type: Number,
    default: 0, // 0 means no points required
    min: [0, 'Points required cannot be negative']
  },
  // Branch-specific settings
  applicableBranches: {
    type: [String], // Array of station IDs
    default: [] // Empty array means all branches
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
voucherSchema.index({ code: 1 });
voucherSchema.index({ isActive: 1, isArchived: 1 });
voucherSchema.index({ validFrom: 1, validUntil: 1 });
voucherSchema.index({ isMonthly: 1 });
voucherSchema.index({ 'monthlyUsage.customerId': 1, 'monthlyUsage.month': 1 });

// Virtual to check if voucher is currently valid
voucherSchema.virtual('isValid').get(function() {
  const now = new Date();
  return this.validFrom <= now && this.validUntil >= now && 
         (this.maxUsage === 0 || this.usageCount < this.maxUsage);
});

// Method to check if customer can use this voucher this month
voucherSchema.methods.canCustomerUseThisMonth = function(customerId) {
  if (!this.isMonthly) {
    return true; // Non-monthly vouchers can be used anytime (subject to other restrictions)
  }
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const usageThisMonth = this.monthlyUsage.filter(
    usage => usage.customerId.toString() === customerId.toString() && 
             usage.month === currentMonth
  );
  
  return usageThisMonth.length < this.monthlyLimitPerCustomer;
};

// Method to record monthly usage
voucherSchema.methods.recordMonthlyUsage = function(customerId, orderId) {
  if (!this.isMonthly) {
    return;
  }
  
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  this.monthlyUsage.push({
    customerId,
    month: currentMonth,
    usedAt: now,
    orderId
  });
  
  this.usageCount += 1;
};

module.exports = mongoose.model('Voucher', voucherSchema);

