const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Expense date is required'],
    default: Date.now
  },
  category: {
    type: String,
    enum: ['Supplies', 'Utilities', 'Maintenance', 'Salaries', 'Other'],
    required: [true, 'Expense category is required']
  },
  description: {
    type: String,
    required: [true, 'Expense description is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Expense amount is required'],
    min: [0, 'Amount must be a positive number']
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Requested by is required']
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Appealed'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  receipt: {
    type: String,
    default: ''
  },
  images: {
    type: [String],
    default: []
  },
  receipts: {
    type: [{
      image: {
        type: String,
        required: true
      },
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  stationId: {
    type: String,
    trim: true,
    default: null
  },
  adminFeedback: {
    type: String,
    trim: true,
    default: ''
  },
  appealReason: {
    type: String,
    trim: true,
    default: ''
  },
  appealedAt: {
    type: Date,
    default: null
  },
  appealImages: {
    type: [String],
    default: []
  }
}, {
  timestamps: true
});

// Indexes
expenseSchema.index({ status: 1, isArchived: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ requestedBy: 1 });
expenseSchema.index({ stationId: 1 });

module.exports = mongoose.model('Expense', expenseSchema);

