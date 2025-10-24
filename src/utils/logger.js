/**
 * Winston Logger Configuration for Delta-2 Backend
 *
 * Centralized logging utility with multiple transports and log levels.
 * Provides structured logging for development and production environments.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Configuration
const config = {
  level: process.env.LOG_LEVEL || 'info',
  enableFile: process.env.LOG_FILE === 'true' && (!process.env.VERCEL || (process.env.VERCEL && (process.env.LOG_DIR === '/tmp/logs' || (!process.env.LOG_DIR && process.env.VERCEL)))),
  enableConsole: process.env.LOG_CONSOLE !== 'false',
  logDir: process.env.LOG_DIR || (process.env.VERCEL ? '/tmp/logs' : './storage/logs'),
  maxSize: process.env.LOG_MAX_SIZE || '20m',
  maxFiles: process.env.LOG_MAX_FILES || '14d',
  datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD'
};

// Ensure log directory exists only if file logging is enabled
if (config.enableFile && !fs.existsSync(config.logDir)) {
  try {
    fs.mkdirSync(config.logDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create log directory:', error.message);
  }
}

// Custom log levels
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

/**
 * Custom format for development logs
 */
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}]: ${message}`;

    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }

    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }

    return logMessage;
  })
);

/**
 * Custom format for production logs
 */
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

/**
 * Create file transport configuration
 * @param {string} filename - Log file name
 * @param {string} level - Log level
 * @returns {Object} Transport configuration
 */
const createFileTransport = (filename, level = 'info') => {
  return new DailyRotateFile({
    filename: path.join(config.logDir, filename),
    datePattern: config.datePattern,
    maxSize: config.maxSize,
    maxFiles: config.maxFiles,
    level: level,
    format: productionFormat,
    handleExceptions: level === 'error',
    handleRejections: level === 'error'
  });
};

/**
 * Create console transport configuration
 * @returns {Object} Console transport
 */
const createConsoleTransport = () => {
  return new winston.transports.Console({
    level: config.level,
    format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
    handleExceptions: true,
    handleRejections: true
  });
};

// Configure transports array
const transports = [];

// Add console transport
if (config.enableConsole) {
  transports.push(createConsoleTransport());
}

// Add file transports
if (config.enableFile) {
  // Application log (all levels)
  transports.push(createFileTransport('application-%DATE%.log', 'debug'));

  // Error log (errors and warnings only)
  transports.push(createFileTransport('error-%DATE%.log', 'warn'));

  // HTTP access log
  transports.push(createFileTransport('access-%DATE%.log', 'http'));
}

/**
 * Create Winston logger instance
 */
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: config.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] })
  ),
  transports: transports,
  exitOnError: false
});

/**
 * Enhanced logging methods with additional context
 */

/**
 * Log error with context
 * @param {string} message - Error message
 * @param {Error|Object} error - Error object or additional context
 * @param {Object} meta - Additional metadata
 */
logger.logError = (message, error = null, meta = {}) => {
  const logData = { ...meta };

  if (error instanceof Error) {
    logData.error = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  } else if (error && typeof error === 'object') {
    logData.context = error;
  }

  logger.error(message, logData);
};

/**
 * Log HTTP request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 */
logger.logHttp = (req, res, responseTime = null) => {
  const httpData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    responseTime: responseTime ? `${responseTime}ms` : undefined
  };

  // Add user ID if authenticated
  if (req.user && req.user.userId) {
    httpData.userId = req.user.userId;
  }

  logger.http(`${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, httpData);
};

/**
 * Log database operation
 * @param {string} operation - Database operation type
 * @param {string} table - Database table name
 * @param {Object} meta - Additional metadata
 */
logger.logDatabase = (operation, table, meta = {}) => {
  logger.debug(`Database ${operation} on ${table}`, {
    operation,
    table,
    ...meta
  });
};

/**
 * Log authentication event
 * @param {string} event - Authentication event type
 * @param {string} userId - User ID
 * @param {Object} meta - Additional metadata
 */
logger.logAuth = (event, userId = null, meta = {}) => {
  logger.info(`Auth: ${event}`, {
    event,
    userId,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

/**
 * Log security event
 * @param {string} event - Security event description
 * @param {Object} meta - Security-related metadata
 */
logger.logSecurity = (event, meta = {}) => {
  logger.warn(`Security: ${event}`, {
    securityEvent: true,
    event,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

/**
 * Log performance metric
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} meta - Additional metadata
 */
logger.logPerformance = (operation, duration, meta = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level](`Performance: ${operation} took ${duration}ms`, {
    performanceMetric: true,
    operation,
    duration,
    ...meta
  });
};

/**
 * Log business event
 * @param {string} event - Business event description
 * @param {Object} meta - Event metadata
 */
logger.logBusiness = (event, meta = {}) => {
  logger.info(`Business: ${event}`, {
    businessEvent: true,
    event,
    timestamp: new Date().toISOString(),
    ...meta
  });
};

/**
 * Create child logger with additional context
 * @param {Object} defaultMeta - Default metadata to include in all logs
 * @returns {Object} Child logger instance
 */
logger.createChild = (defaultMeta = {}) => {
  return logger.child(defaultMeta);
};

/**
 * Profiling utility
 * @param {string} id - Profile identifier
 * @returns {Function} Function to end profiling
 */
logger.startProfile = (id) => {
  const startTime = Date.now();

  return (message = null, meta = {}) => {
    const duration = Date.now() - startTime;
    logger.logPerformance(message || id, duration, meta);
    return duration;
  };
};

/**
 * Stream for Morgan HTTP logging
 */
logger.stream = {
  write: (message) => {
    // Remove trailing newline and log as http level
    logger.http(message.trim());
  }
};

/**
 * Graceful shutdown of logger
 */
logger.gracefulShutdown = () => {
  return new Promise((resolve) => {
    logger.end(() => {
      resolve();
    });
  });
};

/**
 * Get logger configuration summary
 * @returns {Object} Configuration summary
 */
logger.getConfig = () => {
  return {
    level: config.level,
    enableFile: config.enableFile,
    enableConsole: config.enableConsole,
    logDir: config.logDir,
    transports: transports.length,
    environment: process.env.NODE_ENV
  };
};

// Handle uncaught exceptions and unhandled rejections
if (process.env.NODE_ENV !== 'test') {
  process.on('uncaughtException', (error) => {
    logger.logError('Uncaught Exception', error, {
      fatal: true,
      process: 'uncaughtException'
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.logError('Unhandled Rejection', reason, {
      fatal: true,
      process: 'unhandledRejection',
      promise: promise.toString()
    });
  });
}

// Log system startup
if (process.env.NODE_ENV !== 'test') {
  logger.info('Logger initialized', {
    level: config.level,
    environment: process.env.NODE_ENV,
    transports: transports.length
  });
}

module.exports = logger;
