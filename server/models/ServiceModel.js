const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    unique: true
  },
  category: {
    type: String,
    enum: ['Washing', 'Dry Cleaning', 'Ironing', 'Special'],
    required: [true, 'Service category is required']
  },
  price: {
    type: Number,
    required: [true, 'Service price is required'],
    min: [0, 'Price must be a positive number']
  },
  unit: {
    type: String,
    enum: ['item', 'kg', 'flat'],
    required: [true, 'Service unit is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
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
serviceSchema.index({ isActive: 1, isArchived: 1 });
serviceSchema.index({ category: 1 });

module.exports = mongoose.model('Service', serviceSchema);

