const auditLogger = require('../utils/auditLogger');

/**
 * Audit Middleware
 * Automatically logs user actions for audit trail
 */
const auditMiddleware = (action, resource = null) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override res.json to log after response
    res.json = function(data) {
      // Determine resource and resourceId from request
      const resourceType = resource || req.route?.path?.split('/')[1] || 'unknown';
      const resourceId = req.params.id || req.params.userId || req.params.orderId || null;

      // Log the action
      auditLogger.logDataModification(
        action,
        req.user ? req.user._id : null,
        resourceType,
        resourceId,
        {
          method: req.method,
          endpoint: req.originalUrl || req.url,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent'),
          userEmail: req.user ? req.user.email : null,
          userRole: req.user ? req.user.role : null,
          status: res.statusCode < 400 ? 'success' : 'failure',
          changes: req.body || {}
        }
      ).catch(err => {
        console.error('Audit logging error:', err);
      });

      // Call original json method
      return originalJson(data);
    };

    next();
  };
};

module.exports = auditMiddleware;

