const express = require('express');
const OrderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Get all orders
router.get('/', OrderController.getAllOrders);

// Get single order
router.get('/:id', OrderController.getOrder);

// Create order (both admin and staff)
router.post('/', OrderController.createOrder);

// Save draft order
router.post('/draft', OrderController.saveDraft);

// Update order (both admin and staff, but staff only their own)
router.put('/:id', OrderController.updateOrder);

// Archive order (admin only)
router.put('/:id/archive', authorize('admin'), OrderController.archiveOrder);

// Unarchive order (admin only)
router.put('/:id/unarchive', authorize('admin'), OrderController.unarchiveOrder);

// Mark draft as completed
router.put('/:id/mark-completed', authenticate, OrderController.markDraftAsCompleted);

// Schedule draft deletion (30 days)
router.put('/:id/schedule-deletion', authenticate, OrderController.scheduleDraftDeletion);

// Delete order permanently (admin only)
router.delete('/:id', authorize('admin'), OrderController.deleteOrder);

// Send invoice via email
router.post('/:id/send-email', OrderController.sendInvoiceEmail);

// Edit lock management (acquire/release/check)
router.post('/:id/lock', OrderController.acquireEditLock);
router.delete('/:id/lock', OrderController.releaseEditLock);
router.get('/:id/lock', OrderController.checkEditLock);

module.exports = router;

