const express = require('express');
const DiscountController = require('../controllers/DiscountController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All discount routes require authentication
router.use(authenticate);

// Get all discounts
router.get('/', requirePermission('discounts', 'read'), DiscountController.getAllDiscounts);

// Get single discount
router.get('/:id', requirePermission('discounts', 'read'), DiscountController.getDiscount);

// Create discount
router.post('/', requirePermission('discounts', 'create'), DiscountController.createDiscount);

// Update discount
router.put('/:id', requirePermission('discounts', 'update'), DiscountController.updateDiscount);

// Archive discount
router.put('/:id/archive', requirePermission('discounts', 'archive'), DiscountController.archiveDiscount);

// Unarchive discount
router.put('/:id/unarchive', requirePermission('discounts', 'unarchive'), DiscountController.unarchiveDiscount);

// Reset discount usage counter
router.put('/:id/reset-usage', requirePermission('discounts', 'update'), DiscountController.resetUsage);

module.exports = router;

