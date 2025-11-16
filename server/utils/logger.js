const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Structured Logging Service
 * Provides logging with different levels and file rotation
 */
class Logger {
  constructor() {
    this.logDir = process.env.LOG_DIR || path.join(__dirname, '../logs');
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableConsole = process.env.LOG_CONSOLE !== 'false';
    this.enableFile = process.env.LOG_FILE !== 'false';
    
    // Log levels (lower number = higher priority)
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      http: 3,
      debug: 4
    };

    // Ensure log directory exists
    this.ensureLogDir();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get current log file path
   */
  getLogFilePath(level) {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return path.join(this.logDir, `${level}-${date}.log`);
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  }

  /**
   * Check if level should be logged
   */
  shouldLog(level) {
    return this.levels[level] <= this.levels[this.logLevel];
  }

  /**
   * Write to log file
   */
  writeToFile(level, message, meta) {
    if (!this.enableFile) return;

    try {
      const logFile = this.getLogFilePath(level);
      const formattedMessage = this.formatMessage(level, message, meta);
      fs.appendFileSync(logFile, formattedMessage, 'utf8');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Write to console
   */
  writeToConsole(level, message, meta) {
    if (!this.enableConsole) return;

    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
    
    // Color codes for console
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      http: '\x1b[35m',  // Magenta
      debug: '\x1b[90m', // Gray
      reset: '\x1b[0m'
    };

    const color = colors[level] || colors.reset;
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}]${colors.reset} ${message}${metaStr}`);
  }

  /**
   * Log error
   */
  error(message, meta = {}) {
    if (!this.shouldLog('error')) return;
    this.writeToConsole('error', message, meta);
    this.writeToFile('error', message, meta);
  }

  /**
   * Log warning
   */
  warn(message, meta = {}) {
    if (!this.shouldLog('warn')) return;
    this.writeToConsole('warn', message, meta);
    this.writeToFile('warn', message, meta);
  }

  /**
   * Log info
   */
  info(message, meta = {}) {
    if (!this.shouldLog('info')) return;
    this.writeToConsole('info', message, meta);
    this.writeToFile('info', message, meta);
  }

  /**
   * Log HTTP request
   */
  http(message, meta = {}) {
    if (!this.shouldLog('http')) return;
    this.writeToConsole('http', message, meta);
    this.writeToFile('http', message, meta);
  }

  /**
   * Log debug
   */
  debug(message, meta = {}) {
    if (!this.shouldLog('debug')) return;
    this.writeToConsole('debug', message, meta);
    this.writeToFile('debug', message, meta);
  }

  /**
   * Log user activity (for audit trail)
   */
  audit(action, userId, details = {}) {
    const auditMessage = `User Action: ${action}`;
    const auditMeta = {
      type: 'audit',
      userId,
      action,
      ...details,
      timestamp: new Date().toISOString()
    };

    // Always log audit events
    this.writeToConsole('info', auditMessage, auditMeta);
    this.writeToFile('info', auditMessage, auditMeta);
  }

  /**
   * Log system event
   */
  system(event, details = {}) {
    const systemMessage = `System Event: ${event}`;
    const systemMeta = {
      type: 'system',
      event,
      ...details,
      timestamp: new Date().toISOString()
    };

    this.info(systemMessage, systemMeta);
  }

  /**
   * Log security event
   */
  security(event, details = {}) {
    const securityMessage = `Security Event: ${event}`;
    const securityMeta = {
      type: 'security',
      event,
      ...details,
      timestamp: new Date().toISOString()
    };

    // Security events are always logged as warnings or errors
    if (details.severity === 'high') {
      this.error(securityMessage, securityMeta);
    } else {
      this.warn(securityMessage, securityMeta);
    }
  }
}

// Export singleton instance
module.exports = new Logger();

