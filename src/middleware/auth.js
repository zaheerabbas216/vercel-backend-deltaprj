/**
 * File: src/middleware/auth.js
 * Authentication Middleware - JWT Token Validation
 *
 * This file contains middleware functions for authentication and authorization.
 * It validates JWT tokens and manages user authentication state.
 *
 * For beginners:
 * - Middleware functions run between request and response
 * - They check if users are authenticated before allowing access
 * - Uses functional programming approach with individual middleware functions
 * - Integrates with MySQL2 models for user verification
 */

const { jwtService } = require('../services/auth/jwtService');
const { UserModel, SessionModel } = require('../models');
const { unauthorized, forbidden, internalServerError, tooManyRequests } = require('../utils/apiResponse');
const { ERROR_CODES, createError } = require('../utils/errorCodes');
const { logError, logAuth, logSecurity } = require('../utils/logger');
const { isEmpty, getCurrentTimestamp } = require('../utils/helpers');

/**
 * Authenticate JWT token middleware
 * Validates JWT token and sets user in request object
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (isEmpty(token)) {
      return unauthorized(res, 'Access token is required', createError(ERROR_CODES.TOKEN_MISSING.code, 'Authorization header with Bearer token is required'));
    }

    // Verify JWT token
    const decoded = jwtService.verifyAccessToken(token);

    if (!decoded) {
      logSecurity('Invalid token attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: token.substring(0, 20) + '...'
      });
      return unauthorized(res, 'Invalid or expired token', createError(ERROR_CODES.TOKEN_INVALID.code, 'The provided token is invalid or has expired'));
    }

    // Check if user exists and is active
    const user = await UserModel.findById(decoded.userId);

    if (!user || !user.isActive) {
      logSecurity('Authentication attempt with inactive user', {
        userId: decoded.userId,
        userExists: !!user,
        userActive: user?.isActive,
        ip: req.ip
      });
      return unauthorized(res, 'User not found or inactive', createError(ERROR_CODES.USER_NOT_FOUND.code, 'User account is not active or does not exist'));
    }

    // Verify session is still active
    const session = await SessionModel.findByToken(token);

    if (!session || !session.isActive) {
      logSecurity('Invalid session attempt', {
        userId: decoded.userId,
        sessionExists: !!session,
        sessionActive: session?.isActive,
        ip: req.ip
      });
      return unauthorized(res, 'Session expired or invalid', createError(ERROR_CODES.TOKEN_EXPIRED.code, 'User session has expired or is invalid'));
    }

    // Update session activity
    await SessionModel.updateActivity(token, req.ip);

    // Set user information in request
    req.user = {
      userId: user.id,
      email: user.email,
      isVerified: user.isVerified,
      sessionId: session.id
    };

    logAuth('Token authenticated', decoded.userId, {
      sessionId: session.id,
      ip: req.ip
    });

    next();

  } catch (error) {
    logError('Error in authenticateToken middleware', error, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    return internalServerError(res, 'Authentication error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Authentication system error', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Optional authentication middleware
 * Sets user in request if token is valid, but doesn't require authentication
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (isEmpty(token)) {
      return next(); // No token provided, continue without authentication
    }

    // Try to verify token, but don't fail if invalid
    const decoded = jwtService.verifyAccessToken(token);

    if (decoded) {
      const user = await UserModel.findById(decoded.userId);

      if (user && user.isActive) {
        const session = await SessionModel.findByToken(token);

        if (session && session.isActive) {
          req.user = {
            userId: user.id,
            email: user.email,
            isVerified: user.isVerified,
            sessionId: session.id
          };

          logAuth('Optional auth successful', decoded.userId, {
            sessionId: session.id,
            ip: req.ip
          });
        }
      }
    }

    next();

  } catch (error) {
    // Log error but continue without authentication
    logError('Error in optionalAuth middleware', error, {
      ip: req.ip,
      continueWithoutAuth: true
    });
    next();
  }
};

/**
 * Require email verification middleware
 * Ensures user has verified their email address
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const requireEmailVerification = async (req, res, next) => {
  try {
    if (!req.user) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required'));
    }

    if (!req.user.isVerified) {
      logSecurity('Unverified email access attempt', {
        userId: req.user.userId,
        email: req.user.email,
        ip: req.ip
      });
      return forbidden(res, 'Email verification required', createError(ERROR_CODES.EMAIL_NOT_VERIFIED.code, 'Email address must be verified to access this resource', {
        requiresEmailVerification: true
      }));
    }

    next();

  } catch (error) {
    logError('Error in requireEmailVerification middleware', error, {
      userId: req.user?.userId
    });
    return internalServerError(res, 'Email verification check error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Email verification system error', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Check if user is authenticated (no database calls)
 * Simple check for existing user in request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {void}
 */
const requireAuth = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to access this resource'));
  }
  next();
};

/**
 * Refresh token validation middleware
 * Validates refresh token for token renewal endpoints
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const validateRefreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

    if (isEmpty(refreshToken)) {
      return unauthorized(res, 'Refresh token is required', createError(ERROR_CODES.TOKEN_MISSING.code, 'Refresh token must be provided in request body or cookies'));
    }

    const decoded = jwtService.verifyRefreshToken(refreshToken);

    if (!decoded) {
      logSecurity('Invalid refresh token attempt', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        token: refreshToken.substring(0, 20) + '...'
      });
      return unauthorized(res, 'Invalid or expired refresh token', createError(ERROR_CODES.TOKEN_INVALID.code, 'The provided refresh token is invalid or has expired'));
    }

    // Verify session exists
    const session = await SessionModel.findByRefreshToken(refreshToken);

    if (!session || !session.isActive) {
      logSecurity('Refresh token session not found', {
        userId: decoded.userId,
        sessionExists: !!session,
        sessionActive: session?.isActive,
        ip: req.ip
      });
      return unauthorized(res, 'Refresh token session not found or expired', createError(ERROR_CODES.TOKEN_EXPIRED.code, 'Refresh token session has expired or is invalid'));
    }

    req.refreshTokenPayload = decoded;
    req.sessionId = session.id;

    logAuth('Refresh token validated', decoded.userId, {
      sessionId: session.id,
      ip: req.ip
    });

    next();

  } catch (error) {
    logError('Error in validateRefreshToken middleware', error, {
      ip: req.ip
    });
    return internalServerError(res, 'Refresh token validation error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Refresh token validation system error', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Rate limiting for authentication endpoints
 * Limits login attempts per IP address
 *
 * @param {number} maxAttempts - Maximum attempts per window
 * @param {number} windowMinutes - Time window in minutes
 * @returns {Function} Middleware function
 */
const createAuthRateLimit = (maxAttempts = 5, windowMinutes = 15) => {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Clean up old entries
    for (const [key, value] of attempts.entries()) {
      if (now - value.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }

    // Get current attempts for this IP
    let ipAttempts = attempts.get(ip) || { count: 0, firstAttempt: now };

    // Reset if window has passed
    if (now - ipAttempts.firstAttempt > windowMs) {
      ipAttempts = { count: 0, firstAttempt: now };
    }

    // Check if limit exceeded
    if (ipAttempts.count >= maxAttempts) {
      const resetTime = new Date(ipAttempts.firstAttempt + windowMs);

      logSecurity('Rate limit exceeded for authentication', {
        ip,
        attempts: ipAttempts.count,
        maxAttempts,
        windowMinutes
      });

      return tooManyRequests(res, `Too many authentication attempts. Try again after ${resetTime.toLocaleTimeString()}`, Math.ceil((ipAttempts.firstAttempt + windowMs - now) / 1000), {
        retryAfter: Math.ceil((ipAttempts.firstAttempt + windowMs - now) / 1000),
        resetTime: resetTime.toISOString()
      });
    }

    // Increment attempt count
    ipAttempts.count++;
    attempts.set(ip, ipAttempts);

    next();
  };
};

/**
 * Check for account lockout middleware
 * Prevents access for locked accounts
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const checkAccountLock = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // Skip if no user authenticated
    }

    const user = await UserModel.findById(req.user.userId);

    if (!user) {
      return unauthorized(res, 'User not found', createError(ERROR_CODES.USER_NOT_FOUND.code, 'User account not found'));
    }

    if (user.isLocked) {
      const lockUntil = new Date(user.lockUntil);

      logSecurity('Access attempt on locked account', {
        userId: user.id,
        email: user.email,
        lockUntil: lockUntil.toISOString(),
        ip: req.ip
      });

      return forbidden(res, 'Account is temporarily locked due to too many failed login attempts', createError(ERROR_CODES.ACCOUNT_LOCKED.code, 'Account access is temporarily restricted', {
        lockedUntil: lockUntil.toISOString(),
        canRetryAt: lockUntil.toLocaleString()
      }));
    }

    next();

  } catch (error) {
    logError('Error in checkAccountLock middleware', error, {
      userId: req.user?.userId
    });
    return internalServerError(res, 'Account lock check error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Account lock verification system error', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Log authentication events middleware
 * Logs authentication attempts and activities
 *
 * @param {string} eventType - Type of authentication event
 * @returns {Function} Middleware function
 */
const logAuthEvent = (eventType) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Parse response data
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;

      // Log authentication event with enhanced context
      logAuth(`Auth Event: ${eventType}`, req.user?.userId || null, {
        eventType,
        email: req.body?.email || req.user?.email || null,
        ip: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        timestamp: getCurrentTimestamp(),
        success: responseData.success,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode
      });

      // Log security events for failed attempts
      if (!responseData.success && (eventType === 'login' || eventType === 'token_refresh')) {
        logSecurity(`Failed ${eventType} attempt`, {
          eventType,
          email: req.body?.email,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          errorMessage: responseData.message
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireEmailVerification,
  requireAuth,
  validateRefreshToken,
  createAuthRateLimit,
  checkAccountLock,
  logAuthEvent
};
