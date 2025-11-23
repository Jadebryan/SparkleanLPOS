const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// All report routes require authentication
router.use(authenticate);

// Generate reports
router.post('/orders', requirePermission('reports', 'read'), ReportController.generateOrdersReport);
router.post('/revenue', requirePermission('reports', 'read'), ReportController.generateRevenueReport);
router.post('/customers', requirePermission('reports', 'read'), ReportController.generateCustomersReport);
router.post('/expenses', requirePermission('reports', 'read'), ReportController.generateExpensesReport);
router.post('/services', requirePermission('reports', 'read'), ReportController.generateServicesReport);
router.post('/employee', requirePermission('reports', 'read'), ReportController.generateEmployeeReport);
router.post('/sales-per-branch', requirePermission('reports', 'read'), ReportController.generateSalesPerBranchReport);
router.post('/cashflow-per-branch', requirePermission('reports', 'read'), ReportController.generateCashflowPerBranchReport);

module.exports = router;

