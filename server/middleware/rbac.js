const { checkPermission } = require('../utils/rbac');

/**
 * Middleware to check if user has permission for a specific resource and action
 * @param {string} resource - The resource to check (e.g., 'orders', 'customers')
 * @param {string} action - The action to check (e.g., 'create', 'read', 'update', 'delete')
 */
const requirePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasPermission = checkPermission(req.user.role, resource, action);

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You don't have permission to ${action} ${resource}.`
      });
    }

    next();
  };
};

/**
 * Middleware to check multiple permissions (user needs at least one)
 * @param {Array} permissions - Array of {resource, action} objects
 */
const requireAnyPermission = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasAnyPermission = permissions.some(({ resource, action }) =>
      checkPermission(req.user.role, resource, action)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

/**
 * Middleware to check multiple permissions (user needs all)
 * @param {Array} permissions - Array of {resource, action} objects
 */
const requireAllPermissions = (permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasAllPermissions = permissions.every(({ resource, action }) =>
      checkPermission(req.user.role, resource, action)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

module.exports = {
  requirePermission,
  requireAnyPermission,
  requireAllPermissions
};

