const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  service: {
    type: String,
    required: true
  },
  quantity: {
    type: String, // e.g., "3kg", "5 items", "1 flat"
    required: true
  },
  discount: {
    type: String,
    default: '0%'
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Ready for Pickup', 'Completed'],
    default: 'Pending'
  },
  amount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  customer: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  payment: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Partial'],
    default: 'Unpaid',
    required: true
  },
  total: {
    type: String,
    required: true
  },
  items: {
    type: [orderItemSchema],
    required: [true, 'Order must have at least one item'],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'Order must have at least one item'
    }
  },
  discount: {
    type: String,
    default: '0%'
  },
  discountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Discount',
    default: null
  },
  paid: {
    type: Number,
    default: 0
  },
  balance: {
    type: String,
    default: '₱0.00'
  },
  change: {
    type: Number,
    default: 0,
    min: 0
  },
  pickupDate: {
    type: Date,
    default: null
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  lastEditedAt: {
    type: Date,
    default: null
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDraft: {
    type: Boolean,
    default: false
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  scheduledDeleteAt: {
    type: Date,
    default: null
  },
  convertedOrderId: {
    type: String,
    default: null
  },
  stationId: {
    type: String,
    trim: true,
    default: null
  }
}, {
  timestamps: true
});

// Indexes
// Note: id field already has unique: true which creates an index
OrderSchema.index({ customer: 1 });
OrderSchema.index({ payment: 1, isArchived: 1 });
OrderSchema.index({ createdBy: 1 });
OrderSchema.index({ date: -1 });
OrderSchema.index({ isDraft: 1, createdBy: 1 }); // For querying drafts by user
OrderSchema.index({ scheduledDeleteAt: 1 }); // For scheduled deletion cleanup
OrderSchema.index({ stationId: 1 }); // For filtering orders by station

module.exports = mongoose.model('Order', OrderSchema);
