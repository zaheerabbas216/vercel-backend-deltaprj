/**
 * CORS Middleware for Delta-2 Backend
 *
 * Cross-Origin Resource Sharing configuration with security controls,
 * dynamic origin validation, and environment-specific settings.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const cors = require('cors');
const config = require('../../config/environment');
const logger = require('../utils/logger');
const { apiResponse } = require('../utils/apiResponse');

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

/**
 * Default allowed origins for different environments
 */
const getDefaultOrigins = () => {
  switch (process.env.NODE_ENV) {
    case 'production':
      return [
        config.frontend.url,
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'https://yourdomain.com',
        'https://www.yourdomain.com',
        'https://api.yourdomain.com'
      ];

    case 'staging':
      return [
        config.frontend.url,
        'http://localhost:5173',
        'https://staging.yourdomain.com',
        'https://staging-api.yourdomain.com'
      ];

    case 'development':
    default:
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'http://127.0.0.1:5173',
        config.frontend.url
      ];
  }
};

/**
 * Parse origins from environment or use defaults
 */
const getAllowedOrigins = () => {
  const envOrigins = config.cors.origin;

  if (Array.isArray(envOrigins) && envOrigins.length > 0) {
    return envOrigins;
  }

  return getDefaultOrigins();
};

/**
 * Dynamic origin validation function
 * @param {string} origin - Origin to validate
 * @param {Function} callback - Callback function
 */
const originValidator = (origin, callback) => {
  const allowedOrigins = getAllowedOrigins();

  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    // In production, you might want to be more restrictive
    const allowNoOrigin = process.env.NODE_ENV !== 'production' ||
            process.env.ALLOW_NO_ORIGIN === 'true';

    if (allowNoOrigin) {
      return callback(null, true);
    } else {
      logger.logSecurity('CORS: Request blocked - no origin header', {
        userAgent: 'unknown'
      });
      return callback(new Error('Not allowed by CORS policy - origin required'), false);
    }
  }

  // Check if origin is in allowed list
  const isAllowed = allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === '*') {
      return true;
    }

    // Exact match
    if (allowedOrigin === origin) {
      return true;
    }

    // Wildcard subdomain matching
    if (allowedOrigin.startsWith('*.')) {
      const domain = allowedOrigin.substring(2);
      return origin.endsWith(domain);
    }

    // Regex pattern matching
    if (allowedOrigin.startsWith('/') && allowedOrigin.endsWith('/')) {
      const pattern = new RegExp(allowedOrigin.slice(1, -1));
      return pattern.test(origin);
    }

    return false;
  });

  if (isAllowed) {
    logger.debug('CORS: Origin allowed', { origin });
    callback(null, true);
  } else {
    logger.logSecurity('CORS: Origin blocked', {
      origin,
      allowedOrigins,
      userAgent: 'unknown'
    });
    callback(new Error(`Not allowed by CORS policy - origin '${origin}' not allowed`), false);
  }
};

/**
 * Dynamic methods validation
 * @param {string} method - HTTP method
 * @param {Object} req - Express request object
 * @returns {boolean} True if method is allowed
 */
const isMethodAllowed = (method, req) => {
  const allowedMethods = config.cors.methods;

  // Check if method is in allowed list
  if (!allowedMethods.includes(method)) {
    logger.logSecurity('CORS: Method blocked', {
      method,
      origin: req.get('Origin'),
      ip: req.ip
    });
    return false;
  }

  return true;
};

/**
 * Dynamic headers validation
 * @param {Array} headers - Requested headers
 * @param {Object} req - Express request object
 * @returns {boolean} True if headers are allowed
 */
const areHeadersAllowed = (headers, req) => {
  const allowedHeaders = config.cors.allowedHeaders.map(h => h.toLowerCase());

  // Check each requested header
  for (const header of headers) {
    const headerLower = header.toLowerCase();

    // Allow standard headers
    if (['origin', 'content-type', 'accept', 'authorization'].includes(headerLower)) {
      continue;
    }

    // Check against allowed headers
    if (!allowedHeaders.includes(headerLower)) {
      logger.logSecurity('CORS: Header blocked', {
        header: headerLower,
        origin: req.get('Origin'),
        ip: req.ip
      });
      return false;
    }
  }

  return true;
};

/**
 * Main CORS configuration
 */
const corsOptions = {
  origin: originValidator,

  methods: config.cors.methods,

  allowedHeaders: (req, callback) => {
    const requestedHeaders = req.get('Access-Control-Request-Headers');

    if (!requestedHeaders) {
      return callback(null, config.cors.allowedHeaders);
    }

    const headers = requestedHeaders.split(',').map(h => h.trim());

    if (areHeadersAllowed(headers, req)) {
      callback(null, config.cors.allowedHeaders);
    } else {
      callback(new Error('Headers not allowed by CORS policy'), false);
    }
  },

  credentials: config.cors.credentials,

  optionsSuccessStatus: config.cors.optionsSuccessStatus,

  // Maximum age for preflight cache (24 hours)
  maxAge: 24 * 60 * 60,

  // Preflight continue flag
  preflightContinue: false
};

// =============================================================================
// CORS MIDDLEWARE INSTANCES
// =============================================================================

/**
 * Default CORS middleware
 */
const defaultCorsMiddleware = cors(corsOptions);

/**
 * Strict CORS middleware for sensitive endpoints
 */
const strictCorsOptions = {
  ...corsOptions,
  credentials: true,
  origin: (origin, callback) => {
    // Only allow specific trusted origins for sensitive endpoints
    const trustedOrigins = [
      config.frontend.url,
      ...(process.env.TRUSTED_ORIGINS ? process.env.TRUSTED_ORIGINS.split(',') : [])
    ];

    if (!origin) {
      return callback(new Error('Origin required for sensitive endpoints'), false);
    }

    if (trustedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.logSecurity('CORS: Sensitive endpoint access blocked', {
        origin,
        trustedOrigins
      });
      callback(new Error('Origin not allowed for sensitive operations'), false);
    }
  }
};

const strictCorsMiddleware = cors(strictCorsOptions);

/**
 * Public CORS middleware (more permissive for public endpoints)
 */
const publicCorsOptions = {
  ...corsOptions,
  credentials: false,
  origin: '*',
  methods: ['GET', 'HEAD', 'OPTIONS']
};

const publicCorsMiddleware = cors(publicCorsOptions);

// =============================================================================
// CUSTOM CORS MIDDLEWARE
// =============================================================================

/**
 * Create custom CORS middleware with specific options
 * @param {Object} customOptions - Custom CORS options
 * @returns {Function} Express middleware function
 */
const createCustomCors = (customOptions = {}) => {
  const options = {
    ...corsOptions,
    ...customOptions
  };

  return cors(options);
};

/**
 * API-specific CORS middleware
 * @param {Array} allowedOrigins - Allowed origins for this API
 * @returns {Function} Express middleware function
 */
const createApiCors = (allowedOrigins = []) => {
  return cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.logSecurity('API CORS: Origin blocked', {
          origin,
          allowedOrigins
        });
        callback(new Error('Not allowed by API CORS policy'), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: config.cors.allowedHeaders
  });
};

/**
 * WebSocket CORS validation
 * @param {Object} info - WebSocket connection info
 * @returns {boolean} True if connection is allowed
 */
const validateWebSocketCors = (info) => {
  const origin = info.origin || info.req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    logger.logSecurity('WebSocket CORS: No origin provided');
    return process.env.NODE_ENV !== 'production';
  }

  const isAllowed = allowedOrigins.includes(origin) || allowedOrigins.includes('*');

  if (!isAllowed) {
    logger.logSecurity('WebSocket CORS: Origin blocked', {
      origin,
      allowedOrigins
    });
  }

  return isAllowed;
};

// =============================================================================
// CORS ERROR HANDLING
// =============================================================================

/**
 * CORS error handler middleware
 * @param {Error} error - CORS error
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const corsErrorHandler = (error, req, res, next) => {
  if (error && error.message && error.message.includes('CORS')) {
    logger.logSecurity('CORS error occurred', {
      error: error.message,
      origin: req.get('Origin'),
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return apiResponse.forbidden(res, 'CORS policy violation', {
      code: 'CORS_ERROR',
      message: 'Request blocked by CORS policy'
    });
  }

  next(error);
};

// =============================================================================
// CORS UTILITIES
// =============================================================================

/**
 * Check if request origin is allowed
 * @param {Object} req - Express request object
 * @returns {boolean} True if origin is allowed
 */
const isOriginAllowed = (req) => {
  const origin = req.get('Origin');
  const allowedOrigins = getAllowedOrigins();

  if (!origin) {
    return process.env.NODE_ENV !== 'production';
  }

  return allowedOrigins.includes(origin) || allowedOrigins.includes('*');
};

/**
 * Get CORS headers for manual implementation
 * @param {Object} req - Express request object
 * @returns {Object} CORS headers
 */
const getCorsHeaders = (req) => {
  const origin = req.get('Origin');
  const headers = {};

  if (isOriginAllowed(req)) {
    headers['Access-Control-Allow-Origin'] = origin || '*';
    headers['Access-Control-Allow-Methods'] = config.cors.methods.join(', ');
    headers['Access-Control-Allow-Headers'] = config.cors.allowedHeaders.join(', ');

    if (config.cors.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    headers['Access-Control-Max-Age'] = '86400'; // 24 hours
  }

  return headers;
};

/**
 * Add CORS headers manually to response
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const addCorsHeaders = (req, res) => {
  const headers = getCorsHeaders(req);

  Object.keys(headers).forEach(key => {
    res.setHeader(key, headers[key]);
  });
};

/**
 * Preflight request handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const handlePreflight = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.get('Origin');
    const requestMethod = req.get('Access-Control-Request-Method');
    const requestHeaders = req.get('Access-Control-Request-Headers');

    logger.debug('CORS preflight request', {
      origin,
      requestMethod,
      requestHeaders,
      ip: req.ip
    });

    if (isOriginAllowed(req)) {
      addCorsHeaders(req, res);
      res.status(204).send();
    } else {
      res.status(403).json({
        error: 'Origin not allowed'
      });
    }

    return;
  }

  next();
};

module.exports = {
  // Main CORS middleware (use this as default)
  default: defaultCorsMiddleware,

  // Specialized CORS middleware
  strict: strictCorsMiddleware,
  public: publicCorsMiddleware,

  // Custom CORS creators
  createCustomCors,
  createApiCors,

  // WebSocket support
  validateWebSocketCors,

  // Error handling
  corsErrorHandler,

  // Utilities
  isOriginAllowed,
  getCorsHeaders,
  addCorsHeaders,
  handlePreflight,
  getAllowedOrigins
};
