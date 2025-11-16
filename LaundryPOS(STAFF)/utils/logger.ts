// Production logging utility
// Only logs in development, filters out sensitive data in production

const isDevelopment = __DEV__ || process.env.NODE_ENV === 'development';

interface LogLevel {
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const currentLogLevel = isDevelopment ? LOG_LEVELS.DEBUG : LOG_LEVELS.WARN;

// Remove sensitive data from objects
const sanitizeData = (data: any): any => {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sensitiveKeys = ['password', 'token', 'authorization', 'auth', 'secret', 'key'];
  const sanitized: any = {};

  for (const key in data) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = sanitizeData(data[key]);
    }
  }

  return sanitized;
};

export const logger = {
  debug: (...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.log('[DEBUG]', ...args.map(sanitizeData));
    }
  },

  info: (...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log('[INFO]', ...args.map(sanitizeData));
    }
  },

  warn: (...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.warn('[WARN]', ...args.map(sanitizeData));
    }
  },

  error: (...args: any[]) => {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.error('[ERROR]', ...args.map(sanitizeData));
    }
  },
};
