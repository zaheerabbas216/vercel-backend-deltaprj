/**
 * API Response Utilities for Delta-2 Backend
 *
 * Standardized response formatting for consistent API responses.
 * Provides methods for success, error, and various HTTP status responses.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

/**
 * Standard API response structure
 * {
 *   success: boolean,
 *   message: string,
 *   data?: any,
 *   error?: object,
 *   meta?: object,
 *   timestamp: string
 * }
 */

/**
 * Create a standardized API response
 * @param {boolean} success - Success status
 * @param {string} message - Response message
 * @param {any} data - Response data
 * @param {Object} error - Error details
 * @param {Object} meta - Additional metadata
 * @returns {Object} Standardized response object
 */
const createResponse = (success, message, data = null, error = null, meta = null) => {
  const response = {
    success,
    message,
    timestamp: new Date().toISOString()
  };

  // Add data if provided and not null
  if (data !== null && data !== undefined) {
    response.data = data;
  }

  // Add error details if provided
  if (error && !success) {
    response.error = {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message || 'An error occurred',
      ...(error.details && { details: error.details }),
      ...(error.field && { field: error.field }),
      ...(error.stack && process.env.NODE_ENV === 'development' && { stack: error.stack })
    };
  }

  // Add metadata if provided
  if (meta && typeof meta === 'object') {
    response.meta = meta;
  }

  return response;
};

/**
 * Send successful response
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @param {Object} meta - Additional metadata
 */
const success = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
  const response = createResponse(true, message, data, null, meta);
  return res.status(statusCode).json(response);
};

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} error - Error details
 * @param {Object} meta - Additional metadata
 */
const error = (res, message = 'An error occurred', statusCode = 500, error = null, meta = null) => {
  const response = createResponse(false, message, null, error, meta);
  return res.status(statusCode).json(response);
};

/**
 * Send created response (201)
 * @param {Object} res - Express response object
 * @param {any} data - Created resource data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 */
const created = (res, data = null, message = 'Resource created successfully', meta = null) => {
  return success(res, data, message, 201, meta);
};

/**
 * Send accepted response (202)
 * @param {Object} res - Express response object
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {Object} meta - Additional metadata
 */
const accepted = (res, data = null, message = 'Request accepted for processing', meta = null) => {
  return success(res, data, message, 202, meta);
};

/**
 * Send no content response (204)
 * @param {Object} res - Express response object
 */
const noContent = (res) => {
  return res.status(204).send();
};

/**
 * Send bad request response (400)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Error details
 * @param {Object} meta - Additional metadata
 */
const badRequest = (res, message = 'Bad request', errorDetails = null, meta = null) => {
  return error(res, message, 400, errorDetails, meta);
};

/**
 * Send unauthorized response (401)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Error details
 * @param {Object} meta - Additional metadata
 */
const unauthorized = (res, message = 'Unauthorized', errorDetails = null, meta = null) => {
  const defaultError = errorDetails || {
    code: 'UNAUTHORIZED',
    message: 'Authentication required'
  };
  return error(res, message, 401, defaultError, meta);
};

/**
 * Send forbidden response (403)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Error details
 * @param {Object} meta - Additional metadata
 */
const forbidden = (res, message = 'Forbidden', errorDetails = null, meta = null) => {
  const defaultError = errorDetails || {
    code: 'FORBIDDEN',
    message: 'Access denied'
  };
  return error(res, message, 403, defaultError, meta);
};

/**
 * Send not found response (404)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Error details
 * @param {Object} meta - Additional metadata
 */
const notFound = (res, message = 'Resource not found', errorDetails = null, meta = null) => {
  const defaultError = errorDetails || {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found'
  };
  return error(res, message, 404, defaultError, meta);
};

/**
 * Send method not allowed response (405)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Array} allowedMethods - Array of allowed HTTP methods
 * @param {Object} meta - Additional metadata
 */
const methodNotAllowed = (res, message = 'Method not allowed', allowedMethods = [], meta = null) => {
  const errorDetails = {
    code: 'METHOD_NOT_ALLOWED',
    message: 'HTTP method not allowed for this endpoint',
    allowedMethods
  };

  // Set Allow header
  if (allowedMethods.length > 0) {
    res.set('Allow', allowedMethods.join(', '));
  }

  return error(res, message, 405, errorDetails, meta);
};

/**
 * Send conflict response (409)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Error details
 * @param {Object} meta - Additional metadata
 */
const conflict = (res, message = 'Conflict', errorDetails = null, meta = null) => {
  const defaultError = errorDetails || {
    code: 'CONFLICT',
    message: 'Resource conflict'
  };
  return error(res, message, 409, defaultError, meta);
};

/**
 * Send unprocessable entity response (422)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Array} validationErrors - Validation error details
 * @param {Object} meta - Additional metadata
 */
const unprocessableEntity = (res, message = 'Validation failed', validationErrors = [], meta = null) => {
  const errorDetails = {
    code: 'VALIDATION_FAILED',
    message: 'Input validation failed',
    validationErrors
  };
  return error(res, message, 422, errorDetails, meta);
};

/**
 * Send too many requests response (429)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} retryAfter - Retry after seconds
 * @param {Object} meta - Additional metadata
 */
const tooManyRequests = (res, message = 'Too many requests', retryAfter = null, meta = null) => {
  const errorDetails = {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Rate limit exceeded'
  };

  if (retryAfter) {
    res.set('Retry-After', retryAfter.toString());
    errorDetails.retryAfter = retryAfter;
  }

  return error(res, message, 429, errorDetails, meta);
};

/**
 * Send internal server error response (500)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {Object} errorDetails - Error details
 * @param {Object} meta - Additional metadata
 */
const internalServerError = (res, message = 'Internal server error', errorDetails = null, meta = null) => {
  const defaultError = errorDetails || {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  };
  return error(res, message, 500, defaultError, meta);
};

/**
 * Send service unavailable response (503)
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} retryAfter - Retry after seconds
 * @param {Object} meta - Additional metadata
 */
const serviceUnavailable = (res, message = 'Service unavailable', retryAfter = null, meta = null) => {
  const errorDetails = {
    code: 'SERVICE_UNAVAILABLE',
    message: 'Service is temporarily unavailable'
  };

  if (retryAfter) {
    res.set('Retry-After', retryAfter.toString());
    errorDetails.retryAfter = retryAfter;
  }

  return error(res, message, 503, errorDetails, meta);
};

/**
 * Send paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Response data array
 * @param {Object} pagination - Pagination information
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 */
const paginated = (res, data, pagination, message = 'Success', statusCode = 200) => {
  const meta = {
    pagination: {
      currentPage: pagination.currentPage || 1,
      totalPages: pagination.totalPages || 1,
      totalItems: pagination.totalItems || 0,
      itemsPerPage: pagination.itemsPerPage || 10,
      hasNextPage: pagination.hasNextPage || false,
      hasPreviousPage: pagination.hasPreviousPage || false,
      ...(pagination.nextPage && { nextPage: pagination.nextPage }),
      ...(pagination.previousPage && { previousPage: pagination.previousPage })
    }
  };

  return success(res, data, message, statusCode, meta);
};

/**
 * Format validation errors from express-validator
 * @param {Array} validationResult - Array of validation errors
 * @returns {Array} Formatted validation errors
 */
const formatValidationErrors = (validationResult) => {
  return validationResult.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value,
    location: error.location
  }));
};

/**
 * Send validation error response
 * @param {Object} res - Express response object
 * @param {Array} validationResult - Validation result from express-validator
 * @param {string} message - Error message
 */
const validationError = (res, validationResult, message = 'Validation failed') => {
  const formattedErrors = formatValidationErrors(validationResult);
  return unprocessableEntity(res, message, formattedErrors);
};

/**
 * Handle async route errors
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized error object
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Error details
 * @returns {Object} Standardized error object
 */
const createError = (code, message, details = null) => {
  return {
    code,
    message,
    ...(details && { details })
  };
};

module.exports = {
  // Core response methods
  createResponse,
  success,
  error,

  // Success responses
  created,
  accepted,
  noContent,

  // Error responses
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  methodNotAllowed,
  conflict,
  unprocessableEntity,
  tooManyRequests,
  internalServerError,
  serviceUnavailable,

  // Specialized responses
  paginated,
  validationError,

  // Utilities
  formatValidationErrors,
  asyncHandler,
  createError
};
