const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Employee name is required'],
    trim: true
  },
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  position: {
    type: String,
    default: 'Staff', // All employees are staff
    trim: true
  },
  department: {
    type: String,
    default: 'Staff',
    trim: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  hireDate: {
    type: Date,
    required: [true, 'Hire date is required']
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true
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

// Indexes
// Note: employeeId field already has unique: true which creates an index
employeeSchema.index({ status: 1, isArchived: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ stationId: 1 });

module.exports = mongoose.model('Employee', employeeSchema);

