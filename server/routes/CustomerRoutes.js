const express = require('express');
const CustomerController = require('../controllers/CustomerController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All customer routes require authentication
router.use(authenticate);

// Get all customers
router.get('/', requirePermission('customers', 'read'), CustomerController.getAllCustomers);

// Get single customer
router.get('/:id', requirePermission('customers', 'read'), CustomerController.getCustomer);

// Create customer
router.post('/', requirePermission('customers', 'create'), CustomerController.createCustomer);

// Update customer
router.put('/:id', requirePermission('customers', 'update'), CustomerController.updateCustomer);

// Archive customer
router.put('/:id/archive', requirePermission('customers', 'archive'), CustomerController.archiveCustomer);

// Unarchive customer
router.put('/:id/unarchive', requirePermission('customers', 'unarchive'), CustomerController.unarchiveCustomer);

// Delete customer permanently
router.delete('/:id', requirePermission('customers', 'delete'), CustomerController.deleteCustomer);

module.exports = router;

