/**
 * Error Codes and Messages for Delta-2 Backend
 *
 * Centralized error code definitions with detailed descriptions
 * and localization support for consistent error handling.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

// =============================================================================
// ERROR CODE DEFINITIONS
// =============================================================================

const ERROR_CODES = {
  // =============================================================================
  // GENERAL ERRORS (1000-1999)
  // =============================================================================
  UNKNOWN_ERROR: {
    code: 'UNKNOWN_ERROR',
    httpStatus: 500,
    message: 'An unknown error occurred',
    description: 'An unexpected error that is not categorized'
  },

  INTERNAL_SERVER_ERROR: {
    code: 'INTERNAL_SERVER_ERROR',
    httpStatus: 500,
    message: 'Internal server error',
    description: 'Server encountered an unexpected condition'
  },

  BAD_REQUEST: {
    code: 'BAD_REQUEST',
    httpStatus: 400,
    message: 'Bad request',
    description: 'The request was invalid or malformed'
  },

  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    httpStatus: 422,
    message: 'Validation failed',
    description: 'Input validation failed for one or more fields'
  },

  INVALID_INPUT: {
    code: 'INVALID_INPUT',
    httpStatus: 400,
    message: 'Invalid input provided',
    description: 'The provided input does not meet requirements'
  },

  RESOURCE_NOT_FOUND: {
    code: 'RESOURCE_NOT_FOUND',
    httpStatus: 404,
    message: 'Resource not found',
    description: 'The requested resource could not be found'
  },

  DUPLICATE_RESOURCE: {
    code: 'DUPLICATE_RESOURCE',
    httpStatus: 409,
    message: 'Resource already exists',
    description: 'A resource with the same identifier already exists'
  },

  OPERATION_FAILED: {
    code: 'OPERATION_FAILED',
    httpStatus: 500,
    message: 'Operation failed',
    description: 'The requested operation could not be completed'
  },

  INVALID_OPERATION: {
    code: 'INVALID_OPERATION',
    httpStatus: 400,
    message: 'Invalid operation',
    description: 'The requested operation is not valid in the current context'
  },

  // =============================================================================
  // AUTHENTICATION ERRORS (2000-2999)
  // =============================================================================
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    httpStatus: 401,
    message: 'Unauthorized',
    description: 'Authentication is required to access this resource'
  },

  INVALID_CREDENTIALS: {
    code: 'INVALID_CREDENTIALS',
    httpStatus: 401,
    message: 'Invalid credentials',
    description: 'The provided username or password is incorrect'
  },

  TOKEN_EXPIRED: {
    code: 'TOKEN_EXPIRED',
    httpStatus: 401,
    message: 'Token has expired',
    description: 'The authentication token has expired and needs to be renewed'
  },

  TOKEN_INVALID: {
    code: 'TOKEN_INVALID',
    httpStatus: 401,
    message: 'Invalid token',
    description: 'The authentication token is invalid or malformed'
  },

  TOKEN_MISSING: {
    code: 'TOKEN_MISSING',
    httpStatus: 401,
    message: 'Authentication token is missing',
    description: 'No authentication token was provided in the request'
  },

  TOKEN_REVOKED: {
    code: 'TOKEN_REVOKED',
    httpStatus: 401,
    message: 'Token has been revoked',
    description: 'The authentication token has been revoked and is no longer valid'
  },

  ACCOUNT_LOCKED: {
    code: 'ACCOUNT_LOCKED',
    httpStatus: 423,
    message: 'Account is locked',
    description: 'The user account is locked due to security reasons'
  },

  ACCOUNT_DISABLED: {
    code: 'ACCOUNT_DISABLED',
    httpStatus: 403,
    message: 'Account is disabled',
    description: 'The user account has been disabled'
  },

  EMAIL_NOT_VERIFIED: {
    code: 'EMAIL_NOT_VERIFIED',
    httpStatus: 403,
    message: 'Email address not verified',
    description: 'Email address must be verified before accessing this resource'
  },

  PASSWORD_EXPIRED: {
    code: 'PASSWORD_EXPIRED',
    httpStatus: 403,
    message: 'Password has expired',
    description: 'The user password has expired and must be changed'
  },

  LOGIN_ATTEMPTS_EXCEEDED: {
    code: 'LOGIN_ATTEMPTS_EXCEEDED',
    httpStatus: 429,
    message: 'Too many login attempts',
    description: 'Maximum number of login attempts exceeded'
  },

  // =============================================================================
  // AUTHORIZATION ERRORS (3000-3999)
  // =============================================================================
  FORBIDDEN: {
    code: 'FORBIDDEN',
    httpStatus: 403,
    message: 'Forbidden',
    description: 'You do not have permission to access this resource'
  },

  INSUFFICIENT_PERMISSIONS: {
    code: 'INSUFFICIENT_PERMISSIONS',
    httpStatus: 403,
    message: 'Insufficient permissions',
    description: 'You do not have the required permissions for this operation'
  },

  ROLE_REQUIRED: {
    code: 'ROLE_REQUIRED',
    httpStatus: 403,
    message: 'Required role missing',
    description: 'A specific role is required to access this resource'
  },

  ACCESS_DENIED: {
    code: 'ACCESS_DENIED',
    httpStatus: 403,
    message: 'Access denied',
    description: 'Access to the requested resource is denied'
  },

  PERMISSION_DENIED: {
    code: 'PERMISSION_DENIED',
    httpStatus: 403,
    message: 'Permission denied',
    description: 'You do not have permission to perform this action'
  },

  // =============================================================================
  // USER MANAGEMENT ERRORS (4000-4999)
  // =============================================================================
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    httpStatus: 404,
    message: 'User not found',
    description: 'The specified user could not be found'
  },

  USER_ALREADY_EXISTS: {
    code: 'USER_ALREADY_EXISTS',
    httpStatus: 409,
    message: 'User already exists',
    description: 'A user with this identifier already exists'
  },

  EMAIL_ALREADY_EXISTS: {
    code: 'EMAIL_ALREADY_EXISTS',
    httpStatus: 409,
    message: 'Email address already in use',
    description: 'The email address is already associated with another account'
  },

  USERNAME_ALREADY_EXISTS: {
    code: 'USERNAME_ALREADY_EXISTS',
    httpStatus: 409,
    message: 'Username already taken',
    description: 'The username is already taken by another user'
  },

  INVALID_PASSWORD: {
    code: 'INVALID_PASSWORD',
    httpStatus: 400,
    message: 'Invalid password format',
    description: 'The password does not meet the required security criteria'
  },

  WEAK_PASSWORD: {
    code: 'WEAK_PASSWORD',
    httpStatus: 400,
    message: 'Password is too weak',
    description: 'The password does not meet minimum strength requirements'
  },

  PASSWORD_MISMATCH: {
    code: 'PASSWORD_MISMATCH',
    httpStatus: 400,
    message: 'Password confirmation does not match',
    description: 'The password and confirmation password do not match'
  },

  CURRENT_PASSWORD_INCORRECT: {
    code: 'CURRENT_PASSWORD_INCORRECT',
    httpStatus: 400,
    message: 'Current password is incorrect',
    description: 'The provided current password is incorrect'
  },

  // =============================================================================
  // DATABASE ERRORS (5000-5999)
  // =============================================================================
  DATABASE_ERROR: {
    code: 'DATABASE_ERROR',
    httpStatus: 500,
    message: 'Database error',
    description: 'An error occurred while accessing the database'
  },

  CONNECTION_ERROR: {
    code: 'CONNECTION_ERROR',
    httpStatus: 503,
    message: 'Database connection error',
    description: 'Could not establish connection to the database'
  },

  QUERY_ERROR: {
    code: 'QUERY_ERROR',
    httpStatus: 500,
    message: 'Database query error',
    description: 'An error occurred while executing the database query'
  },

  CONSTRAINT_VIOLATION: {
    code: 'CONSTRAINT_VIOLATION',
    httpStatus: 409,
    message: 'Database constraint violation',
    description: 'The operation violates a database constraint'
  },

  FOREIGN_KEY_VIOLATION: {
    code: 'FOREIGN_KEY_VIOLATION',
    httpStatus: 409,
    message: 'Foreign key constraint violation',
    description: 'The operation violates a foreign key constraint'
  },

  TRANSACTION_FAILED: {
    code: 'TRANSACTION_FAILED',
    httpStatus: 500,
    message: 'Database transaction failed',
    description: 'The database transaction could not be completed'
  },

  // =============================================================================
  // FILE HANDLING ERRORS (6000-6999)
  // =============================================================================
  FILE_UPLOAD_ERROR: {
    code: 'FILE_UPLOAD_ERROR',
    httpStatus: 400,
    message: 'File upload failed',
    description: 'An error occurred during file upload'
  },

  FILE_TOO_LARGE: {
    code: 'FILE_TOO_LARGE',
    httpStatus: 413,
    message: 'File size exceeds limit',
    description: 'The uploaded file exceeds the maximum allowed size'
  },

  INVALID_FILE_TYPE: {
    code: 'INVALID_FILE_TYPE',
    httpStatus: 415,
    message: 'Invalid file type',
    description: 'The file type is not allowed for this operation'
  },

  FILE_NOT_FOUND: {
    code: 'FILE_NOT_FOUND',
    httpStatus: 404,
    message: 'File not found',
    description: 'The requested file could not be found'
  },

  FILE_PROCESSING_ERROR: {
    code: 'FILE_PROCESSING_ERROR',
    httpStatus: 500,
    message: 'File processing error',
    description: 'An error occurred while processing the file'
  },

  STORAGE_ERROR: {
    code: 'STORAGE_ERROR',
    httpStatus: 500,
    message: 'Storage error',
    description: 'An error occurred while accessing file storage'
  },

  // =============================================================================
  // RATE LIMITING ERRORS (7000-7999)
  // =============================================================================
  RATE_LIMIT_EXCEEDED: {
    code: 'RATE_LIMIT_EXCEEDED',
    httpStatus: 429,
    message: 'Rate limit exceeded',
    description: 'Too many requests have been made in a short period of time'
  },

  QUOTA_EXCEEDED: {
    code: 'QUOTA_EXCEEDED',
    httpStatus: 429,
    message: 'Quota exceeded',
    description: 'The usage quota for this resource has been exceeded'
  },

  // =============================================================================
  // EXTERNAL SERVICE ERRORS (8000-8999)
  // =============================================================================
  EMAIL_SERVICE_ERROR: {
    code: 'EMAIL_SERVICE_ERROR',
    httpStatus: 502,
    message: 'Email service error',
    description: 'An error occurred while sending email'
  },

  SMS_SERVICE_ERROR: {
    code: 'SMS_SERVICE_ERROR',
    httpStatus: 502,
    message: 'SMS service error',
    description: 'An error occurred while sending SMS'
  },

  PAYMENT_SERVICE_ERROR: {
    code: 'PAYMENT_SERVICE_ERROR',
    httpStatus: 502,
    message: 'Payment service error',
    description: 'An error occurred while processing payment'
  },

  EXTERNAL_API_ERROR: {
    code: 'EXTERNAL_API_ERROR',
    httpStatus: 502,
    message: 'External API error',
    description: 'An error occurred while communicating with external API'
  },

  SERVICE_UNAVAILABLE: {
    code: 'SERVICE_UNAVAILABLE',
    httpStatus: 503,
    message: 'Service unavailable',
    description: 'The requested service is temporarily unavailable'
  },

  // =============================================================================
  // BUSINESS LOGIC ERRORS (9000-9999)
  // =============================================================================
  BUSINESS_RULE_VIOLATION: {
    code: 'BUSINESS_RULE_VIOLATION',
    httpStatus: 400,
    message: 'Business rule violation',
    description: 'The operation violates a business rule'
  },

  INVALID_STATE_TRANSITION: {
    code: 'INVALID_STATE_TRANSITION',
    httpStatus: 400,
    message: 'Invalid state transition',
    description: 'The requested state transition is not allowed'
  },

  WORKFLOW_ERROR: {
    code: 'WORKFLOW_ERROR',
    httpStatus: 400,
    message: 'Workflow error',
    description: 'An error occurred in the business workflow'
  },

  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    httpStatus: 400,
    message: 'Insufficient balance',
    description: 'Insufficient balance to complete the transaction'
  },

  INVENTORY_UNAVAILABLE: {
    code: 'INVENTORY_UNAVAILABLE',
    httpStatus: 409,
    message: 'Inventory unavailable',
    description: 'The requested item is not available in inventory'
  },

  ORDER_CANNOT_BE_MODIFIED: {
    code: 'ORDER_CANNOT_BE_MODIFIED',
    httpStatus: 400,
    message: 'Order cannot be modified',
    description: 'The order is in a state that does not allow modifications'
  }
};

// =============================================================================
// ERROR UTILITIES
// =============================================================================

/**
 * Get error details by code
 * @param {string} errorCode - Error code
 * @returns {Object|null} Error details or null if not found
 */
const getErrorByCode = (errorCode) => {
  return ERROR_CODES[errorCode] || null;
};

/**
 * Create standardized error object
 * @param {string} errorCode - Error code
 * @param {Object} additionalData - Additional error data
 * @returns {Object} Standardized error object
 */
const createError = (errorCode, additionalData = {}) => {
  const errorDef = getErrorByCode(errorCode);

  if (!errorDef) {
    return {
      code: 'UNKNOWN_ERROR',
      httpStatus: 500,
      message: 'An unknown error occurred',
      description: 'Error code not found in definitions',
      ...additionalData
    };
  }

  return {
    ...errorDef,
    ...additionalData,
    timestamp: new Date().toISOString()
  };
};

/**
 * Check if error code exists
 * @param {string} errorCode - Error code to check
 * @returns {boolean} True if error code exists
 */
const isValidErrorCode = (errorCode) => {
  return ERROR_CODES.hasOwnProperty(errorCode);
};

/**
 * Get all error codes in a category
 * @param {string} category - Category prefix (e.g., 'AUTH', 'USER', 'DATABASE')
 * @returns {Array} Array of error codes in the category
 */
const getErrorsByCategory = (category) => {
  const categoryMap = {
    GENERAL: ['UNKNOWN_ERROR', 'INTERNAL_SERVER_ERROR', 'BAD_REQUEST', 'VALIDATION_FAILED', 'INVALID_INPUT', 'RESOURCE_NOT_FOUND', 'DUPLICATE_RESOURCE', 'OPERATION_FAILED', 'INVALID_OPERATION'],
    AUTH: ['UNAUTHORIZED', 'INVALID_CREDENTIALS', 'TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_MISSING', 'TOKEN_REVOKED', 'ACCOUNT_LOCKED', 'ACCOUNT_DISABLED', 'EMAIL_NOT_VERIFIED', 'PASSWORD_EXPIRED', 'LOGIN_ATTEMPTS_EXCEEDED'],
    AUTHORIZATION: ['FORBIDDEN', 'INSUFFICIENT_PERMISSIONS', 'ROLE_REQUIRED', 'ACCESS_DENIED', 'PERMISSION_DENIED'],
    USER: ['USER_NOT_FOUND', 'USER_ALREADY_EXISTS', 'EMAIL_ALREADY_EXISTS', 'USERNAME_ALREADY_EXISTS', 'INVALID_PASSWORD', 'WEAK_PASSWORD', 'PASSWORD_MISMATCH', 'CURRENT_PASSWORD_INCORRECT'],
    DATABASE: ['DATABASE_ERROR', 'CONNECTION_ERROR', 'QUERY_ERROR', 'CONSTRAINT_VIOLATION', 'FOREIGN_KEY_VIOLATION', 'TRANSACTION_FAILED'],
    FILE: ['FILE_UPLOAD_ERROR', 'FILE_TOO_LARGE', 'INVALID_FILE_TYPE', 'FILE_NOT_FOUND', 'FILE_PROCESSING_ERROR', 'STORAGE_ERROR'],
    RATE_LIMIT: ['RATE_LIMIT_EXCEEDED', 'QUOTA_EXCEEDED'],
    EXTERNAL: ['EMAIL_SERVICE_ERROR', 'SMS_SERVICE_ERROR', 'PAYMENT_SERVICE_ERROR', 'EXTERNAL_API_ERROR', 'SERVICE_UNAVAILABLE'],
    BUSINESS: ['BUSINESS_RULE_VIOLATION', 'INVALID_STATE_TRANSITION', 'WORKFLOW_ERROR', 'INSUFFICIENT_BALANCE', 'INVENTORY_UNAVAILABLE', 'ORDER_CANNOT_BE_MODIFIED']
  };

  const errorCodes = categoryMap[category.toUpperCase()] || [];
  return errorCodes.map(code => ERROR_CODES[code]).filter(Boolean);
};

/**
 * Get errors by HTTP status code
 * @param {number} httpStatus - HTTP status code
 * @returns {Array} Array of errors with the specified HTTP status
 */
const getErrorsByStatus = (httpStatus) => {
  return Object.values(ERROR_CODES).filter(error => error.httpStatus === httpStatus);
};

/**
 * Format error for API response
 * @param {string} errorCode - Error code
 * @param {Object} context - Additional context information
 * @returns {Object} Formatted error response
 */
const formatErrorForAPI = (errorCode, context = {}) => {
  const error = createError(errorCode, context);

  return {
    error: {
      code: error.code,
      message: error.message,
      description: error.description,
      timestamp: error.timestamp,
      ...(context.field && { field: context.field }),
      ...(context.details && { details: context.details }),
      ...(process.env.NODE_ENV === 'development' && context.stack && { stack: context.stack })
    }
  };
};

/**
 * Create HTTP error from error code
 * @param {string} errorCode - Error code
 * @param {Object} context - Additional context
 * @returns {Error} HTTP Error object
 */
const createHttpError = (errorCode, context = {}) => {
  const errorDef = createError(errorCode, context);
  const error = new Error(errorDef.message);

  error.name = errorDef.code;
  error.statusCode = errorDef.httpStatus;
  error.code = errorDef.code;
  error.description = errorDef.description;
  error.context = context;

  return error;
};

/**
 * Error code validation regex patterns
 */
const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
};

/**
 * Common validation error creators
 */
const ValidationErrors = {
  /**
     * Create email validation error
     * @param {string} email - Invalid email
     * @returns {Object} Email validation error
     */
  invalidEmail: (email) => createError('VALIDATION_FAILED', {
    field: 'email',
    value: email,
    details: 'Invalid email format'
  }),

  /**
     * Create password validation error
     * @param {Array} requirements - Failed requirements
     * @returns {Object} Password validation error
     */
  weakPassword: (requirements = []) => createError('WEAK_PASSWORD', {
    field: 'password',
    details: 'Password does not meet security requirements',
    failedRequirements: requirements
  }),

  /**
     * Create required field error
     * @param {string} fieldName - Field name
     * @returns {Object} Required field error
     */
  requiredField: (fieldName) => createError('VALIDATION_FAILED', {
    field: fieldName,
    details: `${fieldName} is required`
  }),

  /**
     * Create field length error
     * @param {string} fieldName - Field name
     * @param {number} min - Minimum length
     * @param {number} max - Maximum length
     * @returns {Object} Field length error
     */
  fieldLength: (fieldName, min, max) => createError('VALIDATION_FAILED', {
    field: fieldName,
    details: `${fieldName} must be between ${min} and ${max} characters`
  }),

  /**
     * Create invalid format error
     * @param {string} fieldName - Field name
     * @param {string} expectedFormat - Expected format
     * @returns {Object} Invalid format error
     */
  invalidFormat: (fieldName, expectedFormat) => createError('VALIDATION_FAILED', {
    field: fieldName,
    details: `${fieldName} must be in ${expectedFormat} format`
  })
};

/**
 * HTTP status code to error code mapping
 */
const HTTP_STATUS_TO_ERROR = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'RESOURCE_NOT_FOUND',
  409: 'DUPLICATE_RESOURCE',
  413: 'FILE_TOO_LARGE',
  415: 'INVALID_FILE_TYPE',
  422: 'VALIDATION_FAILED',
  423: 'ACCOUNT_LOCKED',
  429: 'RATE_LIMIT_EXCEEDED',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'EXTERNAL_API_ERROR',
  503: 'SERVICE_UNAVAILABLE'
};

/**
 * Get error code from HTTP status
 * @param {number} httpStatus - HTTP status code
 * @returns {string} Corresponding error code
 */
const getErrorCodeFromHttpStatus = (httpStatus) => {
  return HTTP_STATUS_TO_ERROR[httpStatus] || 'UNKNOWN_ERROR';
};

/**
 * Error severity levels
 */
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Get error severity by code
 * @param {string} errorCode - Error code
 * @returns {string} Error severity level
 */
const getErrorSeverity = (errorCode) => {
  const criticalErrors = ['INTERNAL_SERVER_ERROR', 'DATABASE_ERROR', 'CONNECTION_ERROR'];
  const highErrors = ['UNAUTHORIZED', 'FORBIDDEN', 'ACCOUNT_LOCKED', 'TOKEN_EXPIRED'];
  const mediumErrors = ['VALIDATION_FAILED', 'RESOURCE_NOT_FOUND', 'DUPLICATE_RESOURCE'];

  if (criticalErrors.includes(errorCode)) return ERROR_SEVERITY.CRITICAL;
  if (highErrors.includes(errorCode)) return ERROR_SEVERITY.HIGH;
  if (mediumErrors.includes(errorCode)) return ERROR_SEVERITY.MEDIUM;

  return ERROR_SEVERITY.LOW;
};

/**
 * Get all available error codes
 * @returns {Array} Array of all error code strings
 */
const getAllErrorCodes = () => {
  return Object.keys(ERROR_CODES);
};

/**
 * Get error statistics
 * @returns {Object} Error statistics by category and status
 */
const getErrorStatistics = () => {
  const errors = Object.values(ERROR_CODES);
  const byStatus = {};
  const byCategory = {
    GENERAL: 0,
    AUTH: 0,
    AUTHORIZATION: 0,
    USER: 0,
    DATABASE: 0,
    FILE: 0,
    RATE_LIMIT: 0,
    EXTERNAL: 0,
    BUSINESS: 0
  };

  errors.forEach(error => {
    // Count by HTTP status
    byStatus[error.httpStatus] = (byStatus[error.httpStatus] || 0) + 1;

    // Count by category (simplified categorization)
    if (error.code.includes('AUTH') || error.code.includes('TOKEN') || error.code.includes('LOGIN')) {
      byCategory.AUTH++;
    } else if (error.code.includes('USER') || error.code.includes('EMAIL') || error.code.includes('PASSWORD')) {
      byCategory.USER++;
    } else if (error.code.includes('DATABASE') || error.code.includes('QUERY') || error.code.includes('CONNECTION')) {
      byCategory.DATABASE++;
    } else if (error.code.includes('FILE') || error.code.includes('UPLOAD') || error.code.includes('STORAGE')) {
      byCategory.FILE++;
    } else if (error.code.includes('RATE') || error.code.includes('QUOTA')) {
      byCategory.RATE_LIMIT++;
    } else if (error.code.includes('SERVICE') || error.code.includes('EXTERNAL') || error.code.includes('API')) {
      byCategory.EXTERNAL++;
    } else if (error.code.includes('BUSINESS') || error.code.includes('WORKFLOW') || error.code.includes('INVENTORY')) {
      byCategory.BUSINESS++;
    } else if (error.code.includes('FORBIDDEN') || error.code.includes('PERMISSION') || error.code.includes('ACCESS')) {
      byCategory.AUTHORIZATION++;
    } else {
      byCategory.GENERAL++;
    }
  });

  return {
    total: errors.length,
    byStatus,
    byCategory
  };
};

module.exports = {
  // Error definitions
  ERROR_CODES,

  // Error utilities
  getErrorByCode,
  createError,
  isValidErrorCode,
  getErrorsByCategory,
  getErrorsByStatus,
  formatErrorForAPI,
  createHttpError,

  // Validation utilities
  VALIDATION_PATTERNS,
  ValidationErrors,

  // HTTP mapping
  HTTP_STATUS_TO_ERROR,
  getErrorCodeFromHttpStatus,

  // Error management
  ERROR_SEVERITY,
  getErrorSeverity,
  getAllErrorCodes,
  getErrorStatistics
};
