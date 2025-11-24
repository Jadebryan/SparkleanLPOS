/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and DDoS attacks
 */

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// General API rate limiter
// More lenient in development, stricter in production
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 100, // Very high limit in development (5000 requests per 15 min)
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check endpoint
    if (req.path === '/health' || req.path === '/api/health') {
      return true;
    }
    // In development, skip rate limiting for high-frequency endpoints
    if (isDevelopment) {
      // Skip rate limiting for lock status checks (high frequency)
      if (req.path.includes('/lock') && req.method === 'GET') {
        return true;
      }
      // Skip rate limiting for notification polling
      if (req.path.includes('/notifications/stream')) {
        return true;
      }
    }
    return false;
  },
  handler: (req, res) => {
    // Only log warnings in production
    if (!isDevelopment) {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    }
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    });
  },
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 50 : 5, // More lenient in development
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    if (!isDevelopment) {
      logger.warn(`Auth rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    }
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again later.',
    });
  },
});

// Rate limiter for password reset and sensitive operations
const sensitiveLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDevelopment ? 20 : 3, // More lenient in development
  message: {
    success: false,
    message: 'Too many attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    if (!isDevelopment) {
      logger.warn(`Sensitive operation rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);
    }
    res.status(429).json({
      success: false,
      message: 'Too many attempts, please try again later.',
    });
  },
});

// Rate limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 20, // More lenient in development
  message: {
    success: false,
    message: 'Too many upload requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  sensitiveLimiter,
  uploadLimiter,
};

