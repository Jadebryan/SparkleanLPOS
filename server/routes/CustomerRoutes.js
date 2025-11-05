const express = require('express');
const CustomerController = require('../controllers/CustomerController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All customer routes require authentication
router.use(authenticate);

// Get all customers
router.get('/', CustomerController.getAllCustomers);

// Get single customer
router.get('/:id', CustomerController.getCustomer);

// Create customer (both admin and staff)
router.post('/', CustomerController.createCustomer);

// Update customer (both admin and staff)
router.put('/:id', CustomerController.updateCustomer);

// Archive customer (admin only)
router.put('/:id/archive', authorize('admin'), CustomerController.archiveCustomer);

// Unarchive customer (admin only)
router.put('/:id/unarchive', authorize('admin'), CustomerController.unarchiveCustomer);

// Delete customer permanently (admin only)
router.delete('/:id', authorize('admin'), CustomerController.deleteCustomer);

module.exports = router;

