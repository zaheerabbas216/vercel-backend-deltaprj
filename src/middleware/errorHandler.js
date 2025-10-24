/**
 * Error Handler Middleware for Delta-2 Backend
 *
 * Centralized error handling middleware for consistent error responses,
 * logging, and environment-specific error details.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const { apiResponse } = require('../utils/apiResponse');
const { ERROR_CODES, createError } = require('../utils/errorCodes');
const logger = require('../utils/logger');

/**
 * Determine if error should be reported (logged with full details)
 * @param {Error} error - Error object
 * @returns {boolean} True if error should be reported
 */
const shouldReportError = (error) => {
  // Don't report validation errors and client errors (4xx)
  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return false;
  }

  // Don't report known operational errors
  const operationalErrors = [
    'ValidationError',
    'CastError',
    'MongoError',
    'SequelizeValidationError',
    'SequelizeUniqueConstraintError'
  ];

  if (operationalErrors.includes(error.name)) {
    return false;
  }

  return true;
};

/**
 * Extract meaningful error information
 * @param {Error} error - Error object
 * @returns {Object} Extracted error information
 */
const extractErrorInfo = (error) => {
  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    timestamp: new Date().toISOString(),
    ...(error.details && { details: error.details }),
    ...(error.field && { field: error.field }),
    ...(error.validationErrors && { validationErrors: error.validationErrors })
  };
};

/**
 * Handle Sequelize database errors
 * @param {Error} error - Sequelize error
 * @returns {Object} Formatted error response
 */
const handleSequelizeError = (error) => {
  switch (error.name) {
    case 'SequelizeValidationError':
      const validationErrors = error.errors.map(err => ({
        field: err.path,
        message: err.message,
        value: err.value
      }));

      return {
        statusCode: 422,
        errorCode: ERROR_CODES.VALIDATION_FAILED,
        message: 'Database validation failed',
        validationErrors
      };

    case 'SequelizeUniqueConstraintError':
      const field = error.errors[0]?.path || 'unknown';
      return {
        statusCode: 409,
        errorCode: ERROR_CODES.DUPLICATE_RESOURCE,
        message: `Duplicate value for field: ${field}`,
        field
      };

    case 'SequelizeForeignKeyConstraintError':
      return {
        statusCode: 409,
        errorCode: ERROR_CODES.FOREIGN_KEY_VIOLATION,
        message: 'Foreign key constraint violation'
      };

    case 'SequelizeConnectionError':
    case 'SequelizeConnectionRefusedError':
    case 'SequelizeHostNotFoundError':
      return {
        statusCode: 503,
        errorCode: ERROR_CODES.CONNECTION_ERROR,
        message: 'Database connection error'
      };

    case 'SequelizeTimeoutError':
      return {
        statusCode: 503,
        errorCode: ERROR_CODES.DATABASE_ERROR,
        message: 'Database operation timeout'
      };

    case 'SequelizeDatabaseError':
      return {
        statusCode: 500,
        errorCode: ERROR_CODES.DATABASE_ERROR,
        message: 'Database error occurred'
      };

    default:
      return {
        statusCode: 500,
        errorCode: ERROR_CODES.DATABASE_ERROR,
        message: 'Database operation failed'
      };
  }
};

/**
 * Handle JWT errors
 * @param {Error} error - JWT error
 * @returns {Object} Formatted error response
 */
const handleJWTError = (error) => {
  switch (error.name) {
    case 'TokenExpiredError':
      return {
        statusCode: 401,
        errorCode: ERROR_CODES.TOKEN_EXPIRED,
        message: 'Authentication token has expired'
      };

    case 'JsonWebTokenError':
      return {
        statusCode: 401,
        errorCode: ERROR_CODES.TOKEN_INVALID,
        message: 'Invalid authentication token'
      };

    case 'NotBeforeError':
      return {
        statusCode: 401,
        errorCode: ERROR_CODES.TOKEN_INVALID,
        message: 'Token is not active yet'
      };

    default:
      return {
        statusCode: 401,
        errorCode: ERROR_CODES.TOKEN_INVALID,
        message: 'Token authentication failed'
      };
  }
};

/**
 * Handle Multer file upload errors
 * @param {Error} error - Multer error
 * @returns {Object} Formatted error response
 */
const handleMulterError = (error) => {
  switch (error.code) {
    case 'LIMIT_FILE_SIZE':
      return {
        statusCode: 413,
        errorCode: ERROR_CODES.FILE_TOO_LARGE,
        message: 'File size exceeds the allowed limit'
      };

    case 'LIMIT_FILE_COUNT':
      return {
        statusCode: 400,
        errorCode: ERROR_CODES.FILE_UPLOAD_ERROR,
        message: 'Too many files uploaded'
      };

    case 'LIMIT_UNEXPECTED_FILE':
      return {
        statusCode: 400,
        errorCode: ERROR_CODES.FILE_UPLOAD_ERROR,
        message: `Unexpected field: ${error.field}`
      };

    case 'INVALID_FILE_TYPE':
      return {
        statusCode: 415,
        errorCode: ERROR_CODES.INVALID_FILE_TYPE,
        message: 'File type not allowed'
      };

    default:
      return {
        statusCode: 400,
        errorCode: ERROR_CODES.FILE_UPLOAD_ERROR,
        message: 'File upload failed'
      };
  }
};

/**
 * Handle validation errors (from express-validator)
 * @param {Error} error - Validation error
 * @returns {Object} Formatted error response
 */
const handleValidationError = (error) => {
  return {
    statusCode: 422,
    errorCode: ERROR_CODES.VALIDATION_FAILED,
    message: 'Input validation failed',
    validationErrors: error.validationErrors || []
  };
};

/**
 * Handle MongoDB errors (if using MongoDB)
 * @param {Error} error - MongoDB error
 * @returns {Object} Formatted error response
 */
const handleMongoError = (error) => {
  if (error.code === 11000) {
    // Duplicate key error
    const field = Object.keys(error.keyPattern)[0];
    return {
      statusCode: 409,
      errorCode: ERROR_CODES.DUPLICATE_RESOURCE,
      message: `Duplicate value for field: ${field}`,
      field
    };
  }

  return {
    statusCode: 500,
    errorCode: ERROR_CODES.DATABASE_ERROR,
    message: 'Database operation failed'
  };
};

/**
 * Handle network and HTTP errors
 * @param {Error} error - Network error
 * @returns {Object} Formatted error response
 */
const handleNetworkError = (error) => {
  if (error.code === 'ECONNREFUSED') {
    return {
      statusCode: 503,
      errorCode: ERROR_CODES.SERVICE_UNAVAILABLE,
      message: 'External service unavailable'
    };
  }

  if (error.code === 'ETIMEDOUT') {
    return {
      statusCode: 504,
      errorCode: ERROR_CODES.EXTERNAL_API_ERROR,
      message: 'External service timeout'
    };
  }

  return {
    statusCode: 502,
    errorCode: ERROR_CODES.EXTERNAL_API_ERROR,
    message: 'External service error'
  };
};

/**
 * Map error to appropriate handler
 * @param {Error} error - Error object
 * @returns {Object} Formatted error response
 */
const mapError = (error) => {
  // Handle specific error types
  if (error.name?.includes('Sequelize')) {
    return handleSequelizeError(error);
  }

  if (error.name?.includes('JsonWebToken') || error.name?.includes('Token')) {
    return handleJWTError(error);
  }

  if (error.name === 'MulterError') {
    return handleMulterError(error);
  }

  if (error.name === 'ValidationError' && error.validationErrors) {
    return handleValidationError(error);
  }

  if (error.name === 'MongoError' || error.name === 'BulkWriteError') {
    return handleMongoError(error);
  }

  if (error.code?.startsWith('E') && (error.syscall || error.hostname)) {
    return handleNetworkError(error);
  }

  // Handle HTTP errors with status codes
  if (error.statusCode || error.status) {
    const statusCode = error.statusCode || error.status;
    const errorCode = Object.values(ERROR_CODES).find(
      code => code.httpStatus === statusCode
    );

    return {
      statusCode,
      errorCode: errorCode || ERROR_CODES.UNKNOWN_ERROR,
      message: error.message || 'An error occurred'
    };
  }

  // Handle known operational errors
  if (error.isOperational) {
    return {
      statusCode: error.statusCode || 400,
      errorCode: createError(error.code || 'OPERATION_FAILED'),
      message: error.message
    };
  }

  // Default to internal server error
  return {
    statusCode: 500,
    errorCode: ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: 'Internal server error'
  };
};

/**
 * Create client-safe error response
 * @param {Object} errorInfo - Mapped error information
 * @param {Object} originalError - Original error object
 * @param {Object} req - Express request object
 * @returns {Object} Client-safe error response
 */
const createClientResponse = (errorInfo, originalError, req) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  const response = {
    success: false,
    error: {
      code: errorInfo.errorCode.code,
      message: errorInfo.errorCode.message,
      timestamp: new Date().toISOString(),
      path: req.originalUrl,
      method: req.method
    }
  };

  // Add validation errors if present
  if (errorInfo.validationErrors) {
    response.error.validationErrors = errorInfo.validationErrors;
  }

  // Add field information if present
  if (errorInfo.field) {
    response.error.field = errorInfo.field;
  }

  // Add development-specific details
  if (isDevelopment) {
    response.error.details = {
      originalMessage: originalError.message,
      name: originalError.name,
      ...(originalError.stack && { stack: originalError.stack }),
      ...(originalError.code && { code: originalError.code })
    };
  }

  // Add request ID if present
  if (req.requestId) {
    response.error.requestId = req.requestId;
  }

  return response;
};

/**
 * Main error handling middleware
 * @param {Error} error - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const errorHandler = (error, req, res, next) => {
  // Skip if response already sent
  if (res.headersSent) {
    return next(error);
  }

  // Extract error information
  const errorInfo = extractErrorInfo(error);

  // Map error to appropriate response
  const mappedError = mapError(error);

  // Create client-safe response
  const clientResponse = createClientResponse(mappedError, error, req);

  // Log error if it should be reported
  if (shouldReportError(error)) {
    logger.logError('Unhandled error occurred', error, {
      userId: req.user?.id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl,
      method: req.method,
      requestId: req.requestId,
      errorInfo: errorInfo
    });
  } else {
    // Log client errors at info level
    logger.info('Client error occurred', {
      error: error.message,
      statusCode: mappedError.statusCode,
      userId: req.user?.id,
      ip: req.ip,
      path: req.originalUrl,
      method: req.method
    });
  }

  // Send error response
  res.status(mappedError.statusCode).json(clientResponse);
};

/**
 * Handle 404 errors (route not found)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  error.code = ERROR_CODES.RESOURCE_NOT_FOUND.code;
  next(error);
};

/**
 * Async error wrapper
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped function that catches async errors
 */
const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create operational error
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} code - Error code
 * @returns {Error} Operational error
 */
const createOperationalError = (message, statusCode = 500, code = 'OPERATION_FAILED') => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.isOperational = true;
  return error;
};

/**
 * Graceful error handling for unhandled promise rejections
 */
const handleUnhandledRejections = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.logError('Unhandled Promise Rejection', reason, {
      promise: promise.toString(),
      fatal: true
    });

    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Graceful error handling for uncaught exceptions
 */
const handleUncaughtExceptions = () => {
  process.on('uncaughtException', (error) => {
    logger.logError('Uncaught Exception', error, {
      fatal: true
    });

    // Give time for logging then exit
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
};

/**
 * Initialize error handling
 */
const initializeErrorHandling = () => {
  handleUnhandledRejections();
  handleUncaughtExceptions();
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncErrorHandler,
  createOperationalError,
  initializeErrorHandling,

  // Utility functions
  shouldReportError,
  extractErrorInfo,
  mapError,
  createClientResponse,

  // Specific error handlers
  handleSequelizeError,
  handleJWTError,
  handleMulterError,
  handleValidationError,
  handleMongoError,
  handleNetworkError
};
