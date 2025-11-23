const express = require('express');
const OrderController = require('../controllers/OrderController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Get all orders
router.get('/', requirePermission('orders', 'read'), OrderController.getAllOrders);

// Get single order
router.get('/:id', requirePermission('orders', 'read'), OrderController.getOrder);

// Create order
router.post('/', requirePermission('orders', 'create'), OrderController.createOrder);

// Save draft order
router.post('/draft', requirePermission('orders', 'create'), OrderController.saveDraft);

// Update order
router.put('/:id', requirePermission('orders', 'update'), OrderController.updateOrder);

// Archive order
router.put('/:id/archive', requirePermission('orders', 'archive'), OrderController.archiveOrder);

// Unarchive order
router.put('/:id/unarchive', requirePermission('orders', 'unarchive'), OrderController.unarchiveOrder);

// Mark draft as completed
router.put('/:id/mark-completed', requirePermission('orders', 'update'), OrderController.markDraftAsCompleted);

// Schedule draft deletion (30 days)
router.put('/:id/schedule-deletion', requirePermission('orders', 'update'), OrderController.scheduleDraftDeletion);

// Delete order permanently
router.delete('/:id', requirePermission('orders', 'delete'), OrderController.deleteOrder);

// Send invoice via email
router.post('/:id/send-email', requirePermission('orders', 'read'), OrderController.sendInvoiceEmail);

// Edit lock management (acquire/release/check)
router.post('/:id/lock', requirePermission('orders', 'update'), OrderController.acquireEditLock);
router.delete('/:id/lock', requirePermission('orders', 'update'), OrderController.releaseEditLock);
router.get('/:id/lock', requirePermission('orders', 'read'), OrderController.checkEditLock);

module.exports = router;

