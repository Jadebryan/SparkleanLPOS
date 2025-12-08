const express = require('express');
const router = express.Router();
const VoucherController = require('../controllers/VoucherController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All voucher routes require authentication
router.use(authenticate);

// Get all vouchers
router.get('/', requirePermission('discounts', 'read'), VoucherController.getAllVouchers);

// Check if customer has available voucher
router.get('/customer/:customerId/available', requirePermission('discounts', 'read'), VoucherController.checkCustomerVoucher);

// Get single voucher
router.get('/:id', requirePermission('discounts', 'read'), VoucherController.getVoucher);

// Create voucher
router.post('/', requirePermission('discounts', 'create'), VoucherController.createVoucher);

// Update voucher
router.put('/:id', requirePermission('discounts', 'update'), VoucherController.updateVoucher);

// Archive voucher
router.put('/:id/archive', requirePermission('discounts', 'archive'), VoucherController.archiveVoucher);

// Unarchive voucher
router.put('/:id/unarchive', requirePermission('discounts', 'archive'), VoucherController.unarchiveVoucher);

// Delete voucher permanently
router.delete('/:id', requirePermission('discounts', 'delete'), VoucherController.deleteVoucher);

module.exports = router;

