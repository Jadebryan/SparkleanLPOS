const express = require('express');
const EmployeeController = require('../controllers/EmployeeController');
const { authenticate, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

const router = express.Router();

// All employee routes require authentication
router.use(authenticate);

// Get all employees
router.get('/', requirePermission('employees', 'read'), EmployeeController.getAllEmployees);

// Get employee performance metrics (must be before /:id to avoid route conflicts)
router.get('/:id/performance', requirePermission('employees', 'read'), EmployeeController.getEmployeePerformance);

// Get single employee
router.get('/:id', requirePermission('employees', 'read'), EmployeeController.getEmployee);

// Create employee
router.post('/', requirePermission('employees', 'create'), EmployeeController.createEmployee);

// Update employee
router.put('/:id', requirePermission('employees', 'update'), EmployeeController.updateEmployee);

// Toggle account status (enable/disable)
router.put('/:id/toggle-account', requirePermission('employees', 'update'), EmployeeController.toggleAccountStatus);

// Archive employee
router.put('/:id/archive', requirePermission('employees', 'archive'), EmployeeController.archiveEmployee);

// Unarchive employee
router.put('/:id/unarchive', requirePermission('employees', 'unarchive'), EmployeeController.unarchiveEmployee);

module.exports = router;

