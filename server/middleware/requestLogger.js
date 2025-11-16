const logger = require('../utils/logger');

/**
 * Request Logging Middleware
 * Logs all HTTP requests with details
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Log request
  logger.http('Incoming Request', {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user ? req.user._id : null,
    role: req.user ? req.user.role : null
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // Don't log 401/403 as ERROR if there's no authenticated user (expected behavior)
    // Only log as ERROR if it's a 401/403 for an authenticated user (unexpected)
    const isAuthError = res.statusCode === 401 || res.statusCode === 403;
    const hasUser = req.user && req.user._id;
    const isExpectedAuthError = isAuthError && !hasUser;
    
    // Log level: ERROR for 500+, WARN for 400-499 (except expected auth errors), HTTP for 200-399
    let logLevel = 'http';
    if (res.statusCode >= 500) {
      logLevel = 'error';
    } else if (res.statusCode >= 400 && !isExpectedAuthError) {
      logLevel = 'warn'; // Use warn instead of error for client errors
    }

    logger[logLevel]('Request Completed', {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userId: req.user ? req.user._id : null
    });
  });

  next();
};

module.exports = requestLogger;

