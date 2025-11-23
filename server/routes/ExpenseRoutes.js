const express = require('express');
const ExpenseController = require('../controllers/ExpenseController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All expense routes require authentication
router.use(authenticate);

// Get all expenses
router.get('/', requirePermission('expenses', 'read'), ExpenseController.getAllExpenses);

// Get single expense
router.get('/:id', requirePermission('expenses', 'read'), ExpenseController.getExpense);

// Create expense
router.post('/', requirePermission('expenses', 'create'), ExpenseController.createExpense);

// Update expense
router.put('/:id', requirePermission('expenses', 'update'), ExpenseController.updateExpense);

// Approve expense
router.put('/:id/approve', requirePermission('expenses', 'approve'), ExpenseController.approveExpense);

// Reject expense
router.put('/:id/reject', requirePermission('expenses', 'reject'), ExpenseController.rejectExpense);

// Add feedback to expense
router.put('/:id/feedback', requirePermission('expenses', 'update'), ExpenseController.addFeedback);

// Upload receipt to approved expense
router.put('/:id/receipt', requirePermission('expenses', 'update'), ExpenseController.uploadReceipt);

// Appeal rejected expense
router.put('/:id/appeal', requirePermission('expenses', 'update'), ExpenseController.appealExpense);

// Archive expense
router.put('/:id/archive', requirePermission('expenses', 'archive'), ExpenseController.archiveExpense);

// Unarchive expense
router.put('/:id/unarchive', requirePermission('expenses', 'unarchive'), ExpenseController.unarchiveExpense);

module.exports = router;

