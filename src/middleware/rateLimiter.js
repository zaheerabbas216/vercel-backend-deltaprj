/**
 * Rate Limiting Middleware for Delta-2 Backend
 *
 * Configurable rate limiting middleware using express-rate-limit
 * with custom stores, key generators, and security features.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const { apiResponse } = require('../utils/apiResponse');
const { ERROR_CODES } = require('../utils/errorCodes');
const logger = require('../utils/logger');
const config = require('../../config/environment');

// =============================================================================
// RATE LIMIT CONFIGURATIONS
// =============================================================================

/**
 * Default rate limit configuration
 */
const defaultConfig = {
  windowMs: config.rateLimiting.window * 60 * 1000, // Convert minutes to milliseconds
  max: config.rateLimiting.maxRequests,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => {
    // Skip for health checks
    return req.path === '/health' || req.path === '/api/health';
  },
  keyGenerator: (req) => {
    // Use IP address as default key
    return req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('Rate limit exceeded', {
      ip: req.ip,
      path: req.originalUrl,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id
    });

    return apiResponse.tooManyRequests(res, 'Too many requests, please try again later',
      Math.ceil(req.rateLimit.resetTime / 1000));
  }
};

/**
 * Authentication endpoints rate limit (more restrictive)
 */
const authConfig = {
  windowMs: config.rateLimiting.authWindow * 60 * 1000,
  max: config.rateLimiting.authMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful login attempts
  keyGenerator: (req) => {
    // Combine IP and email for auth endpoints
    const email = req.body?.email || req.ip;
    return `${req.ip}:${email}`;
  },
  handler: (req, res) => {
    logger.logSecurity('Authentication rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
      path: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    return apiResponse.tooManyRequests(res,
      'Too many authentication attempts, please try again later',
      Math.ceil(req.rateLimit.resetTime / 1000));
  }
};

/**
 * Password reset rate limit (very restrictive)
 */
const passwordResetConfig = {
  windowMs: config.rateLimiting.passwordResetWindow * 60 * 1000,
  max: config.rateLimiting.passwordResetMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use email for password reset requests
    return req.body?.email || req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('Password reset rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email,
      path: req.originalUrl
    });

    return apiResponse.tooManyRequests(res,
      'Too many password reset attempts, please try again later',
      Math.ceil(req.rateLimit.resetTime / 1000));
  }
};

/**
 * API endpoints rate limit (moderate)
 */
const apiConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // More generous for API calls
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('API rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.originalUrl,
      userAgent: req.get('User-Agent')
    });

    return apiResponse.tooManyRequests(res,
      'API rate limit exceeded, please try again later',
      Math.ceil(req.rateLimit.resetTime / 1000));
  }
};

/**
 * File upload rate limit
 */
const uploadConfig = {
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('Upload rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.originalUrl
    });

    return apiResponse.tooManyRequests(res,
      'Upload rate limit exceeded, please try again later',
      Math.ceil(req.rateLimit.resetTime / 1000));
  }
};


// =============================================================================
// SLOW DOWN CONFIGURATIONS (Progressive Delays)
// =============================================================================

/**
 * Progressive slowdown for repeated requests
 */
const progressiveSlowDown = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 10, // Allow 10 requests per windowMs without delay
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  skip: (req) => {
    return req.path === '/health' || req.path === '/api/health';
  }
});

// =============================================================================
// RATE LIMITER INSTANCES
// =============================================================================

/**
 * General rate limiter for all routes
 */
const generalLimiter = rateLimit(defaultConfig);

/**
 * Authentication rate limiter
 */
const authLimiter = rateLimit(authConfig);

/**
 * Password reset rate limiter
 */
const passwordResetLimiter = rateLimit(passwordResetConfig);

/**
 * API rate limiter
 */
const apiLimiter = rateLimit(apiConfig);

/**
 * Upload rate limiter
 */
const uploadLimiter = rateLimit(uploadConfig);

/**
 * Strict rate limiter for sensitive operations
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    logger.logSecurity('Strict rate limit exceeded', {
      ip: req.ip,
      userId: req.user?.id,
      path: req.originalUrl
    });

    return apiResponse.tooManyRequests(res,
      'Rate limit exceeded for sensitive operations',
      Math.ceil(req.rateLimit.resetTime / 1000));
  }
});

// =============================================================================
// CUSTOM RATE LIMITERS
// =============================================================================

/**
 * Create custom rate limiter with specific configuration
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware function
 */
const createCustomLimiter = (options = {}) => {
  const config = {
    ...defaultConfig,
    ...options,
    handler: options.handler || ((req, res) => {
      logger.logSecurity('Custom rate limit exceeded', {
        ip: req.ip,
        userId: req.user?.id,
        path: req.originalUrl,
        limiterName: options.name || 'custom'
      });

      return apiResponse.tooManyRequests(res,
        options.message || 'Rate limit exceeded',
        Math.ceil(req.rateLimit.resetTime / 1000));
    })
  };

  return rateLimit(config);
};

/**
 * User-specific rate limiter
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Window size in milliseconds
 * @returns {Function} Express middleware function
 */
const createUserLimiter = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return rateLimit({
    windowMs,
    max: maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      if (!req.user) {
        throw new Error('User authentication required for user-specific rate limiting');
      }
      return req.user.id.toString();
    },
    handler: (req, res) => {
      logger.logSecurity('User-specific rate limit exceeded', {
        userId: req.user.id,
        ip: req.ip,
        path: req.originalUrl
      });

      return apiResponse.tooManyRequests(res,
        'User rate limit exceeded, please try again later',
        Math.ceil(req.rateLimit.resetTime / 1000));
    }
  });
};

/**
 * IP-based rate limiter with whitelist
 * @param {Array} whitelist - Array of whitelisted IP addresses
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware function
 */
const createIPLimiter = (whitelist = [], options = {}) => {
  const config = {
    ...defaultConfig,
    ...options,
    skip: (req) => {
      // Skip whitelisted IPs
      if (whitelist.includes(req.ip)) {
        return true;
      }

      // Skip health checks
      return req.path === '/health' || req.path === '/api/health';
    }
  };

  return rateLimit(config);
};

/**
 * Endpoint-specific rate limiter
 * @param {string} endpoint - Endpoint path
 * @param {Object} options - Rate limiter options
 * @returns {Function} Express middleware function
 */
const createEndpointLimiter = (endpoint, options = {}) => {
  return rateLimit({
    ...defaultConfig,
    ...options,
    keyGenerator: (req) => {
      // Combine endpoint and IP/user for unique keys
      const identifier = req.user?.id || req.ip;
      return `${endpoint}:${identifier}`;
    },
    handler: (req, res) => {
      logger.logSecurity('Endpoint rate limit exceeded', {
        endpoint,
        ip: req.ip,
        userId: req.user?.id,
        path: req.originalUrl
      });

      return apiResponse.tooManyRequests(res,
                `Rate limit exceeded for ${endpoint}`,
                Math.ceil(req.rateLimit.resetTime / 1000));
    }
  });
};

// =============================================================================
// DYNAMIC RATE LIMITING
// =============================================================================

/**
 * Dynamic rate limiter based on user role
 * @param {Object} roleLimits - Limits per role
 * @returns {Function} Express middleware function
 */
const createRoleBasisLimiter = (roleLimits = {}) => {
  const defaultLimits = {
    guest: { max: 10, windowMs: 15 * 60 * 1000 },
    user: { max: 100, windowMs: 15 * 60 * 1000 },
    admin: { max: 1000, windowMs: 15 * 60 * 1000 }
  };

  const limits = { ...defaultLimits, ...roleLimits };

  return (req, res, next) => {
    const userRole = req.user?.roles?.[0]?.name || 'guest';
    const roleConfig = limits[userRole] || limits.guest;

    const limiter = rateLimit({
      windowMs: roleConfig.windowMs,
      max: roleConfig.max,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return `${userRole}:${req.user?.id || req.ip}`;
      },
      handler: (req, res) => {
        logger.logSecurity('Role-based rate limit exceeded', {
          userRole,
          userId: req.user?.id,
          ip: req.ip,
          path: req.originalUrl
        });

        return apiResponse.tooManyRequests(res,
                    `Rate limit exceeded for ${userRole} role`,
                    Math.ceil(req.rateLimit.resetTime / 1000));
      }
    });

    return limiter(req, res, next);
  };
};

/**
 * Adaptive rate limiter that adjusts based on system load
 * @param {Object} options - Adaptive options
 * @returns {Function} Express middleware function
 */
const createAdaptiveLimiter = (options = {}) => {
  const {
    baseMax = 100,
    baseWindowMs = 15 * 60 * 1000,
    loadThreshold = 80, // CPU/memory threshold percentage
    reductionFactor = 0.5 // Reduce limits by this factor when under load
  } = options;

  return (req, res, next) => {
    // Simple load check (in production, use proper monitoring)
    const isUnderLoad = process.cpuUsage().user > loadThreshold * 1000000; // Simplified check

    const adjustedMax = isUnderLoad ? Math.floor(baseMax * reductionFactor) : baseMax;

    const limiter = rateLimit({
      windowMs: baseWindowMs,
      max: adjustedMax,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => {
        return req.user?.id || req.ip;
      },
      handler: (req, res) => {
        logger.logSecurity('Adaptive rate limit exceeded', {
          isUnderLoad,
          adjustedMax,
          userId: req.user?.id,
          ip: req.ip,
          path: req.originalUrl
        });

        return apiResponse.tooManyRequests(res,
          'Rate limit exceeded due to high system load',
          Math.ceil(req.rateLimit.resetTime / 1000));
      }
    });

    return limiter(req, res, next);
  };
};

// =============================================================================
// RATE LIMIT BYPASS
// =============================================================================

/**
 * Bypass rate limiting for specific conditions
 * @param {Function} condition - Function that returns true to bypass
 * @param {Function} limiter - Rate limiter to bypass
 * @returns {Function} Express middleware function
 */
const createBypassLimiter = (condition, limiter) => {
  return (req, res, next) => {
    if (condition(req)) {
      logger.debug('Rate limiting bypassed', {
        userId: req.user?.id,
        ip: req.ip,
        path: req.originalUrl
      });
      return next();
    }

    return limiter(req, res, next);
  };
};

// =============================================================================
// RATE LIMIT MONITORING
// =============================================================================

/**
 * Middleware to log rate limit usage
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const logRateLimitUsage = (req, res, next) => {
  // Add response header listener
  res.on('finish', () => {
    if (req.rateLimit) {
      const usage = {
        limit: req.rateLimit.limit,
        current: req.rateLimit.current,
        remaining: req.rateLimit.remaining,
        resetTime: new Date(req.rateLimit.resetTime),
        userId: req.user?.id,
        ip: req.ip,
        path: req.originalUrl
      };

      // Log when approaching limit
      if (req.rateLimit.remaining < req.rateLimit.limit * 0.1) {
        logger.logSecurity('Rate limit approaching threshold', usage);
      }
    }
  });

  next();
};

/**
 * Get rate limit status for user/IP
 * @param {Object} req - Express request object
 * @returns {Object} Rate limit status
 */
const getRateLimitStatus = (req) => {
  if (!req.rateLimit) {
    return null;
  }

  return {
    limit: req.rateLimit.limit,
    current: req.rateLimit.current,
    remaining: req.rateLimit.remaining,
    resetTime: new Date(req.rateLimit.resetTime),
    retryAfter: req.rateLimit.resetTime ? Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000) : null
  };
};

// =============================================================================
// SECURITY FEATURES
// =============================================================================

/**
 * Detect and handle suspicious patterns
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
const detectSuspiciousActivity = (req, res, next) => {
  const suspicious = [];

  // Check for rapid requests from same IP
  if (req.rateLimit && req.rateLimit.current > req.rateLimit.limit * 0.8) {
    suspicious.push('high_request_rate');
  }

  // Check for unusual user agents
  const userAgent = req.get('User-Agent');
  if (!userAgent || userAgent.length < 10 || /bot|crawler|spider/i.test(userAgent)) {
    suspicious.push('suspicious_user_agent');
  }

  // Check for missing common headers
  if (!req.get('Accept') || !req.get('Accept-Language')) {
    suspicious.push('missing_headers');
  }

  if (suspicious.length > 0) {
    logger.logSecurity('Suspicious activity detected', {
      patterns: suspicious,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl,
      userId: req.user?.id
    });

    // Could implement additional restrictions here
  }

  next();
};

module.exports = {
  // Pre-configured limiters
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  apiLimiter,
  uploadLimiter,
  strictLimiter,
  progressiveSlowDown,

  // Custom limiter creators
  createCustomLimiter,
  createUserLimiter,
  createIPLimiter,
  createEndpointLimiter,
  createRoleBasisLimiter,
  createAdaptiveLimiter,
  createBypassLimiter,

  // Monitoring and utilities
  logRateLimitUsage,
  getRateLimitStatus,
  detectSuspiciousActivity
};
// ============================================================================
// RATE LIMIT CONFIGURATIONS
// =============================================================================

/**
 * Default rate limit configuration
 */
