/**
 * File: src/middleware/validation.js
 * Yup Validation Middleware for Express.js
 *
 * This file contains Express middleware functions for validating request data using Yup schemas.
 * It provides comprehensive validation with detailed error handling and logging.
 *
 * For beginners:
 * - Middleware functions run between receiving a request and sending a response
 * - These functions validate incoming data before it reaches your route handlers
 * - If validation fails, they automatically send error responses to the client
 * - This keeps your route handlers clean and ensures data integrity
 */

const yup = require('yup');
const { schemas, utils: schemaUtils, presets } = require('../schemas');

/**
 * Create validation middleware for specific schema and data source
 * This is the main function for creating validation middleware
 *
 * @param {string|Object} schema - Schema path (e.g., 'auth.login') or Yup schema object
 * @param {string} dataSource - Where to get data ('body', 'query', 'params', 'headers')
 * @param {Object} options - Validation options and settings
 * @returns {Function} Express middleware function
 */
const createValidationMiddleware = (schema, dataSource = 'body', options = {}) => {
  return async (req, res, next) => {
    try {
      // Get the actual schema object
      let validationSchema;
      if (typeof schema === 'string') {
        validationSchema = schemaUtils.getSchemaByPath(schema);
        if (!validationSchema) {
          console.error(`❌ Validation middleware error: Schema '${schema}' not found`);
          return res.status(500).json({
            success: false,
            message: 'Server configuration error',
            error: 'Validation schema not configured'
          });
        }
      } else if (schema && typeof schema.validate === 'function') {
        validationSchema = schema;
      } else {
        console.error('❌ Validation middleware error: Invalid schema provided');
        return res.status(500).json({
          success: false,
          message: 'Server configuration error',
          error: 'Invalid validation schema'
        });
      }

      // Get data from the specified source
      const data = req[dataSource];
      if (data === undefined) {
        console.error(`❌ Validation middleware error: Data source '${dataSource}' not found in request`);
        return res.status(500).json({
          success: false,
          message: 'Server configuration error',
          error: `Invalid data source: ${dataSource}`
        });
      }

      // Set up validation options
      const validationOptions = {
        stripUnknown: true,
        abortEarly: false,
        ...presets.api,
        ...options
      };

      // Perform validation
      const result = await schemaUtils.validateSchema(validationSchema, data, validationOptions);

      if (result.success) {
        // Replace request data with validated and transformed data
        req[dataSource] = result.data;

        // Log successful validation in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ Validation passed for ${req.method} ${req.originalUrl} (${dataSource})`);
        }

        next();
      } else {
        // Log validation failure
        console.log(`❌ Validation failed for ${req.method} ${req.originalUrl}:`, result.errors);

        // Send validation error response
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: result.errors,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          method: req.method
        });
      }
    } catch (error) {
      console.error('❌ Validation middleware unexpected error:', error);

      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Validate request body
 * Shorthand for body validation - most common use case
 *
 * @param {string|Object} schema - Schema path or schema object
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateBody = (schema, options = {}) => {
  return createValidationMiddleware(schema, 'body', options);
};

/**
 * Validate query parameters
 * For validating URL query strings and search parameters
 *
 * @param {string|Object} schema - Schema path or schema object
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateQuery = (schema, options = {}) => {
  return createValidationMiddleware(schema, 'query', options);
};

/**
 * Validate URL parameters
 * For validating route parameters like /users/:id
 *
 * @param {string|Object} schema - Schema path or schema object
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateParams = (schema, options = {}) => {
  return createValidationMiddleware(schema, 'params', options);
};

/**
 * Validate request headers
 * For validating custom headers or authentication tokens
 *
 * @param {string|Object} schema - Schema path or schema object
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 */
const validateHeaders = (schema, options = {}) => {
  return createValidationMiddleware(schema, 'headers', options);
};

/**
 * Validate multiple data sources in one middleware
 * For complex validation scenarios involving multiple request parts
 *
 * @param {Object} validationConfig - Configuration object with multiple validations
 * @returns {Function} Express middleware function
 *
 * Example usage:
 * validateMultiple({
 *   body: 'auth.login',
 *   query: { page: yup.number().min(1) },
 *   params: { id: yup.number().required() }
 * })
 */
const validateMultiple = (validationConfig) => {
  return async (req, res, next) => {
    try {
      const validations = [];

      // Build validation array
      Object.entries(validationConfig).forEach(([source, schemaConfig]) => {
        let schema;
        let options = {};

        if (typeof schemaConfig === 'string') {
          schema = schemaUtils.getSchemaByPath(schemaConfig);
        } else if (typeof schemaConfig === 'object' && schemaConfig.validate) {
          schema = schemaConfig;
        } else if (typeof schemaConfig === 'object' && schemaConfig.schema) {
          schema = typeof schemaConfig.schema === 'string'
            ? schemaUtils.getSchemaByPath(schemaConfig.schema)
            : schemaConfig.schema;
          options = schemaConfig.options || {};
        } else {
          throw new Error(`Invalid schema configuration for ${source}`);
        }

        if (!schema) {
          throw new Error(`Schema not found for ${source}`);
        }

        validations.push({
          schema,
          data: req[source],
          options: { ...presets.api, ...options },
          fieldPrefix: source
        });
      });

      // Perform all validations
      const result = await schemaUtils.validateMultiple(validations);

      if (result.success) {
        // Update request with validated data
        result.results.forEach((validationResult, index) => {
          if (validationResult.success) {
            const source = Object.keys(validationConfig)[index];
            req[source] = validationResult.data;
          }
        });

        next();
      } else {
        console.log(`❌ Multi-validation failed for ${req.method} ${req.originalUrl}:`, result.errors);

        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: result.errors,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          method: req.method
        });
      }
    } catch (error) {
      console.error('❌ Multi-validation middleware error:', error);

      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      });
    }
  };
};

/**
 * Conditional validation middleware
 * Validates different schemas based on request conditions
 *
 * @param {Function|Object} condition - Function that returns condition or condition object
 * @param {Object} schemaMap - Map of condition values to schemas
 * @param {string} dataSource - Data source to validate
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware function
 *
 * Example usage:
 * validateConditional(
 *   (req) => req.body.type,
 *   {
 *     'admin': 'auth.adminLogin',
 *     'user': 'auth.login',
 *     'api': 'auth.apiLogin'
 *   },
 *   'body'
 * )
 */
const validateConditional = (condition, schemaMap, dataSource = 'body', options = {}) => {
  return async (req, res, next) => {
    try {
      // Determine condition value
      let conditionValue;
      if (typeof condition === 'function') {
        conditionValue = condition(req);
      } else if (typeof condition === 'string') {
        // Use dot notation to get nested values
        conditionValue = condition.split('.').reduce((obj, key) => obj?.[key], req);
      } else {
        conditionValue = condition;
      }

      // Get schema based on condition
      const schemaKey = conditionValue;
      const schemaPath = schemaMap[schemaKey];

      if (!schemaPath) {
        return res.status(400).json({
          success: false,
          message: 'Invalid request type',
          error: `Unknown condition value: ${conditionValue}`,
          validTypes: Object.keys(schemaMap)
        });
      }

      // Use the regular validation middleware
      const middleware = createValidationMiddleware(schemaPath, dataSource, options);
      return middleware(req, res, next);

    } catch (error) {
      console.error('❌ Conditional validation middleware error:', error);

      return res.status(500).json({
        success: false,
        message: 'Internal validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      });
    }
  };
};

/**
 * File upload validation middleware
 * Validates file uploads with size and type restrictions
 *
 * @param {Object} options - File validation options
 * @returns {Function} Express middleware function
 */
const validateFileUpload = (options = {}) => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    required = false,
    multiple = false,
    fieldName = 'file'
  } = options;

  return (req, res, next) => {
    try {
      const files = multiple ? req.files : [req.file];
      const fileField = req.files?.[fieldName] || req.file;

      // Check if file is required
      if (required && !fileField) {
        return res.status(400).json({
          success: false,
          message: 'File upload required',
          errors: { [fieldName]: ['File is required'] }
        });
      }

      // If no file and not required, continue
      if (!fileField) {
        return next();
      }

      const filesToValidate = Array.isArray(fileField) ? fileField : [fileField];

      // Validate each file
      for (const file of filesToValidate) {
        // Check file size
        if (file.size > maxSize) {
          return res.status(400).json({
            success: false,
            message: 'File too large',
            errors: {
              [fieldName]: [`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`]
            }
          });
        }

        // Check file type
        if (!allowedTypes.includes(file.mimetype)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid file type',
            errors: {
              [fieldName]: [`File type must be one of: ${allowedTypes.join(', ')}`]
            }
          });
        }
      }

      next();
    } catch (error) {
      console.error('❌ File upload validation error:', error);

      return res.status(500).json({
        success: false,
        message: 'File validation error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Server error'
      });
    }
  };
};

/**
 * Rate limiting validation middleware
 * Validates requests aren't exceeding rate limits
 *
 * @param {Object} options - Rate limiting options
 * @returns {Function} Express middleware function
 */
const validateRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxRequests = 100,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = options;

  const requestCounts = new Map();

  return (req, res, next) => {
    try {
      const key = keyGenerator(req);
      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean old entries
      for (const [storedKey, data] of requestCounts) {
        if (data.resetTime <= now) {
          requestCounts.delete(storedKey);
        }
      }

      // Get current count for this key
      let requestData = requestCounts.get(key);

      if (!requestData || requestData.resetTime <= now) {
        // Initialize or reset counter
        requestData = {
          count: 0,
          resetTime: now + windowMs
        };
        requestCounts.set(key, requestData);
      }

      // Check if limit exceeded
      if (requestData.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((requestData.resetTime - now) / 1000),
          limit: maxRequests,
          window: windowMs / 1000
        });
      }

      // Increment counter
      requestData.count++;

      // Add rate limit headers
      res.set({
        'X-RateLimit-Limit': maxRequests,
        'X-RateLimit-Remaining': Math.max(0, maxRequests - requestData.count),
        'X-RateLimit-Reset': Math.ceil(requestData.resetTime / 1000)
      });

      next();
    } catch (error) {
      console.error('❌ Rate limit validation error:', error);

      // Don't block on rate limit errors, just log them
      next();
    }
  };
};

/**
 * Pre-built validation middleware for common schemas
 * Ready-to-use middleware for standard operations
 */
const commonValidators = {
  // Authentication validators
  login: validateBody('auth.login'),
  register: validateBody('auth.register'),
  changePassword: validateBody('auth.changePassword'),
  resetPassword: validateBody('auth.passwordResetRequest'),

  // Admin validators
  adminLogin: validateBody('auth.adminLogin'),
  createRole: validateBody('rbac.createRole'),
  assignRole: validateBody('rbac.assignRole'),

  // Query validators
  pagination: validateQuery(yup.object().shape({
    page: schemas.common.page,
    pageSize: schemas.common.pageSize,
    sortOrder: schemas.common.sortOrder
  })),

  idParam: validateParams(yup.object().shape({
    id: schemas.common.id
  })),

  // File upload validators
  imageUpload: validateFileUpload({
    maxSize: 2 * 1024 * 1024, // 2MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif'],
    fieldName: 'image'
  }),

  documentUpload: validateFileUpload({
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    fieldName: 'document'
  })
};

module.exports = {
  // Main validation functions
  createValidationMiddleware,
  validateBody,
  validateQuery,
  validateParams,
  validateHeaders,

  // Advanced validation
  validateMultiple,
  validateConditional,

  // Specialized validators
  validateFileUpload,
  validateRateLimit,

  // Pre-built common validators
  commonValidators,

  // Direct access to schema utilities
  utils: schemaUtils,
  schemas
};
