const express = require('express');
const ExpenseController = require('../controllers/ExpenseController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All expense routes require authentication
router.use(authenticate);

// Get all expenses (staff see only their own, admin sees all)
router.get('/', ExpenseController.getAllExpenses);

// Get single expense
router.get('/:id', ExpenseController.getExpense);

// Create expense (both admin and staff)
router.post('/', ExpenseController.createExpense);

// Update expense (only requester, and only if pending)
router.put('/:id', ExpenseController.updateExpense);

// Approve expense (admin only)
router.put('/:id/approve', authorize('admin'), ExpenseController.approveExpense);

// Reject expense (admin only)
router.put('/:id/reject', authorize('admin'), ExpenseController.rejectExpense);

// Add feedback to expense (admin only)
router.put('/:id/feedback', authorize('admin'), ExpenseController.addFeedback);

// Upload receipt to approved expense (staff can add receipts after approval)
router.put('/:id/receipt', ExpenseController.uploadReceipt);

// Appeal rejected expense (staff only)
router.put('/:id/appeal', ExpenseController.appealExpense);

// Archive expense (admin only)
router.put('/:id/archive', authorize('admin'), ExpenseController.archiveExpense);

// Unarchive expense (admin only)
router.put('/:id/unarchive', authorize('admin'), ExpenseController.unarchiveExpense);

module.exports = router;

