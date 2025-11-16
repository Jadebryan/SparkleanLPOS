const AuditLog = require('../models/AuditLogModel');
const logger = require('./logger');

/**
 * Audit Logger Service
 * Logs user activities and system events to database
 */
class AuditLogger {
  /**
   * Log user action
   */
  async logUserAction(action, userId, details = {}) {
    try {
      const auditLog = new AuditLog({
        type: 'user_action',
        action,
        userId: userId || null,
        userEmail: details.userEmail || null,
        userRole: details.userRole || null,
        resource: details.resource || null,
        resourceId: details.resourceId || null,
        method: details.method || null,
        endpoint: details.endpoint || null,
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
        details: details.details || {},
        status: details.status || 'success',
        errorMessage: details.errorMessage || null
      });

      await auditLog.save();

      // Also log to file logger
      logger.audit(action, userId, details);

      return auditLog;
    } catch (error) {
      // Don't fail the request if audit logging fails
      console.error('Audit logging failed:', error);
      logger.error('Failed to log audit event', { action, userId, error: error.message });
      return null;
    }
  }

  /**
   * Log system event
   */
  async logSystemEvent(event, details = {}) {
    try {
      const auditLog = new AuditLog({
        type: 'system_event',
        action: event,
        details: details.details || {},
        status: details.status || 'success',
        errorMessage: details.errorMessage || null
      });

      await auditLog.save();
      logger.system(event, details);

      return auditLog;
    } catch (error) {
      console.error('System event logging failed:', error);
      logger.error('Failed to log system event', { event, error: error.message });
      return null;
    }
  }

  /**
   * Log security event
   */
  async logSecurityEvent(event, details = {}) {
    try {
      const auditLog = new AuditLog({
        type: 'security_event',
        action: event,
        userId: details.userId || null,
        userEmail: details.userEmail || null,
        ipAddress: details.ipAddress || null,
        userAgent: details.userAgent || null,
        details: details.details || {},
        status: details.status || 'failure',
        errorMessage: details.errorMessage || null
      });

      await auditLog.save();
      logger.security(event, details);

      return auditLog;
    } catch (error) {
      console.error('Security event logging failed:', error);
      logger.error('Failed to log security event', { event, error: error.message });
      return null;
    }
  }

  /**
   * Log login attempt
   */
  async logLogin(userId, email, success, details = {}) {
    const action = success ? 'login_success' : 'login_failed';
    return this.logUserAction(action, userId, {
      userEmail: email,
      userRole: details.role || null,
      ipAddress: details.ipAddress || null,
      userAgent: details.userAgent || null,
      status: success ? 'success' : 'failure',
      errorMessage: success ? null : details.errorMessage || 'Invalid credentials'
    });
  }

  /**
   * Log logout
   */
  async logLogout(userId, details = {}) {
    return this.logUserAction('logout', userId, {
      userEmail: details.userEmail || null,
      userRole: details.userRole || null,
      ipAddress: details.ipAddress || null,
      status: 'success'
    });
  }

  /**
   * Log data modification (create, update, delete)
   */
  async logDataModification(action, userId, resource, resourceId, details = {}) {
    return this.logUserAction(`${action}_${resource}`, userId, {
      resource,
      resourceId: resourceId ? resourceId.toString() : null,
      method: details.method || null,
      endpoint: details.endpoint || null,
      ipAddress: details.ipAddress || null,
      details: details.changes || {},
      status: details.status || 'success'
    });
  }

  /**
   * Log access attempt
   */
  async logAccessAttempt(userId, resource, resourceId, success, details = {}) {
    const action = success ? 'access_granted' : 'access_denied';
    return this.logUserAction(action, userId, {
      resource,
      resourceId: resourceId ? resourceId.toString() : null,
      method: details.method || null,
      endpoint: details.endpoint || null,
      ipAddress: details.ipAddress || null,
      status: success ? 'success' : 'failure',
      errorMessage: success ? null : details.errorMessage || 'Access denied'
    });
  }
}

module.exports = new AuditLogger();

