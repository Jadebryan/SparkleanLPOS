const express = require('express');
const CustomerController = require('../controllers/CustomerController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All customer routes require authentication
router.use(authenticate);

// Get all customers
router.get('/', requirePermission('customers', 'read'), CustomerController.getAllCustomers);

// Global customer search across all stations
router.get('/global/search', requirePermission('customers', 'read'), CustomerController.globalSearch);

// Get single customer
router.get('/:id', requirePermission('customers', 'read'), CustomerController.getCustomer);

// Create customer
router.post('/', requirePermission('customers', 'create'), CustomerController.createCustomer);

// Update customer
router.put('/:id', requirePermission('customers', 'update'), CustomerController.updateCustomer);

// Assign / move customer to a specific station (branch)
router.put('/:id/assign-station', requirePermission('customers', 'update'), CustomerController.assignCustomerToStation);

// Archive customer
router.put('/:id/archive', requirePermission('customers', 'archive'), CustomerController.archiveCustomer);

// Unarchive customer
router.put('/:id/unarchive', requirePermission('customers', 'unarchive'), CustomerController.unarchiveCustomer);

// Delete customer permanently
router.delete('/:id', requirePermission('customers', 'delete'), CustomerController.deleteCustomer);

// Check customer transactions in other branches
router.get('/:customerId/other-branch-transactions', requirePermission('customers', 'read'), CustomerController.checkOtherBranchTransactions);

module.exports = router;

