/**
 * Global Error Handler Middleware
 * Centralized error handling for the application
 */

const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id || req.user?._id,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
  });

  // Default error
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error: ' + Object.values(err.errors).map(e => e.message).join(', ');
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token has expired';
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry. This record already exists.';
  }

  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An internal server error occurred. Please try again later.';
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err,
    }),
  });
};

// 404 handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  error.statusCode = 404;
  next(error);
};

module.exports = {
  errorHandler,
  notFoundHandler,
};

