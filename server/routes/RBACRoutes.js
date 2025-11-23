const express = require('express');
const router = express.Router();
const RBACController = require('../controllers/RBACController');
const { authenticate, authorize } = require('../middleware/auth');

// EMERGENCY RECOVERY ROUTE - Must be BEFORE authentication middleware
// This route bypasses all authentication and RBAC checks
router.post('/emergency-recover-admin', RBACController.emergencyRecoverAdmin);

// All other RBAC routes require authentication
router.use(authenticate);

// Get available resources and actions (both admin and staff can view)
router.get('/resources', RBACController.getAvailableResources);

// Get permissions for current authenticated user
router.get('/me', RBACController.getMyPermissions);

// Get all role permissions (admin only)
router.get('/', authorize('admin'), RBACController.getAllRolePermissions);

// Get permissions for a specific role (admin only)
router.get('/:role', authorize('admin'), RBACController.getRolePermission);

// Update permissions for a role (admin only)
router.put('/:role', authorize('admin'), RBACController.updateRolePermission);

// Reset role permissions to default (admin only)
router.put('/:role/reset', authorize('admin'), RBACController.resetRolePermission);

// Initialize RBAC (admin only)
router.post('/initialize', authorize('admin'), RBACController.initializeRBAC);

module.exports = router;

