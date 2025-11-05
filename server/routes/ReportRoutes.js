const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const { authenticate } = require('../middleware/auth');

// All report routes require authentication
router.use(authenticate);

// Generate reports
router.post('/orders', ReportController.generateOrdersReport);
router.post('/revenue', ReportController.generateRevenueReport);
router.post('/customers', ReportController.generateCustomersReport);
router.post('/expenses', ReportController.generateExpensesReport);
router.post('/services', ReportController.generateServicesReport);
router.post('/employee', ReportController.generateEmployeeReport);

module.exports = router;

