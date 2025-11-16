const express = require('express');
const DiscountController = require('../controllers/DiscountController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All discount routes require authentication
router.use(authenticate);

// Get all discounts (both admin and staff can view)
router.get('/', DiscountController.getAllDiscounts);

// Get single discount
router.get('/:id', DiscountController.getDiscount);

// Create discount (admin only)
router.post('/', authorize('admin'), DiscountController.createDiscount);

// Update discount (admin only)
router.put('/:id', authorize('admin'), DiscountController.updateDiscount);

// Archive discount (admin only)
router.put('/:id/archive', authorize('admin'), DiscountController.archiveDiscount);

// Unarchive discount (admin only)
router.put('/:id/unarchive', authorize('admin'), DiscountController.unarchiveDiscount);

// Reset discount usage counter (admin only)
router.put('/:id/reset-usage', authorize('admin'), DiscountController.resetUsage);

module.exports = router;

