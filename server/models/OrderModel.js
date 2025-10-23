const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true },
  customerName: { type: String, required: true },
  date: { type: Date, default: Date.now },
  service: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 },
  serviceFee: { type: Number, required: true },
  laundryStatus: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  feeStatus: { type: String, enum: ['Partial', 'Paid', 'Unpaid'], default: 'Unpaid' },
  discount: { type: Number, default: 0 },
  totalFee: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  balance: { type: Number, default: 0 },
  pickupDate: { type: Date, required: true },
  notes: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createDate: { type: Date, default: Date.now }
});

// Pre-save hook to calculate totalFee and balance automatically
OrderSchema.pre('save', function(next) {
  this.totalFee = (this.serviceFee * this.quantity) - this.discount;
  this.balance = this.totalFee - this.amountPaid;
  next();
});

module.exports = mongoose.model('Order', OrderSchema);
