const express = require('express');
const EmployeeController = require('../controllers/EmployeeController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All employee routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Get all employees
router.get('/', EmployeeController.getAllEmployees);

// Get employee performance metrics (must be before /:id to avoid route conflicts)
router.get('/:id/performance', EmployeeController.getEmployeePerformance);

// Get single employee
router.get('/:id', EmployeeController.getEmployee);

// Create employee
router.post('/', EmployeeController.createEmployee);

// Update employee
router.put('/:id', EmployeeController.updateEmployee);

// Toggle account status (enable/disable)
router.put('/:id/toggle-account', EmployeeController.toggleAccountStatus);

// Archive employee
router.put('/:id/archive', EmployeeController.archiveEmployee);

// Unarchive employee
router.put('/:id/unarchive', EmployeeController.unarchiveEmployee);

module.exports = router;

