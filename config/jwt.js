/**
 * JWT Configuration for Delta-2 Backend
 *
 * Centralized JWT token configuration and utilities for authentication.
 * Provides token generation, verification, and management functions.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
const config = require('./environment');

/**
 * JWT Configuration Object
 */
const jwtConfig = {
  // Access token configuration
  accessToken: {
    secret: config.jwt.secret,
    expiresIn: config.jwt.expiresIn,
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  },

  // Refresh token configuration
  refreshToken: {
    secret: config.jwt.refreshSecret,
    expiresIn: config.jwt.refreshExpiresIn,
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  },

  // Password reset token configuration
  passwordReset: {
    secret: config.jwt.secret,
    expiresIn: config.auth.passwordResetExpiresIn,
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  },

  // Email verification token configuration
  emailVerification: {
    secret: config.jwt.secret,
    expiresIn: config.auth.emailVerificationExpiresIn,
    algorithm: config.jwt.algorithm,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience
  }
};

/**
 * Generate JWT Access Token
 * @param {Object} payload - Token payload (user data)
 * @param {Object} options - Additional token options
 * @returns {string} Generated JWT token
 */
const generateAccessToken = (payload, options = {}) => {
  const tokenOptions = {
    expiresIn: options.expiresIn || jwtConfig.accessToken.expiresIn,
    algorithm: jwtConfig.accessToken.algorithm,
    issuer: jwtConfig.accessToken.issuer,
    audience: jwtConfig.accessToken.audience,
    ...options
  };

  return jwt.sign(payload, jwtConfig.accessToken.secret, tokenOptions);
};

/**
 * Generate JWT Refresh Token
 * @param {Object} payload - Token payload (user data)
 * @param {Object} options - Additional token options
 * @returns {string} Generated refresh token
 */
const generateRefreshToken = (payload, options = {}) => {
  const tokenOptions = {
    expiresIn: options.expiresIn || jwtConfig.refreshToken.expiresIn,
    algorithm: jwtConfig.refreshToken.algorithm,
    issuer: jwtConfig.refreshToken.issuer,
    audience: jwtConfig.refreshToken.audience,
    ...options
  };

  return jwt.sign(payload, jwtConfig.refreshToken.secret, tokenOptions);
};

/**
 * Generate Password Reset Token
 * @param {Object} payload - Token payload (user data)
 * @param {Object} options - Additional token options
 * @returns {string} Generated password reset token
 */
const generatePasswordResetToken = (payload, options = {}) => {
  const tokenOptions = {
    expiresIn: options.expiresIn || jwtConfig.passwordReset.expiresIn,
    algorithm: jwtConfig.passwordReset.algorithm,
    issuer: jwtConfig.passwordReset.issuer,
    audience: jwtConfig.passwordReset.audience,
    ...options
  };

  return jwt.sign(payload, jwtConfig.passwordReset.secret, tokenOptions);
};

/**
 * Generate Email Verification Token
 * @param {Object} payload - Token payload (user data)
 * @param {Object} options - Additional token options
 * @returns {string} Generated email verification token
 */
const generateEmailVerificationToken = (payload, options = {}) => {
  const tokenOptions = {
    expiresIn: options.expiresIn || jwtConfig.emailVerification.expiresIn,
    algorithm: jwtConfig.emailVerification.algorithm,
    issuer: jwtConfig.emailVerification.issuer,
    audience: jwtConfig.emailVerification.audience,
    ...options
  };

  return jwt.sign(payload, jwtConfig.emailVerification.secret, tokenOptions);
};

/**
 * Verify JWT Access Token
 * @param {string} token - JWT token to verify
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token, options = {}) => {
  const verifyOptions = {
    algorithms: [jwtConfig.accessToken.algorithm],
    issuer: jwtConfig.accessToken.issuer,
    audience: jwtConfig.accessToken.audience,
    ...options
  };

  return jwt.verify(token, jwtConfig.accessToken.secret, verifyOptions);
};

/**
 * Verify JWT Refresh Token
 * @param {string} token - Refresh token to verify
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token, options = {}) => {
  const verifyOptions = {
    algorithms: [jwtConfig.refreshToken.algorithm],
    issuer: jwtConfig.refreshToken.issuer,
    audience: jwtConfig.refreshToken.audience,
    ...options
  };

  return jwt.verify(token, jwtConfig.refreshToken.secret, verifyOptions);
};

/**
 * Verify Password Reset Token
 * @param {string} token - Password reset token to verify
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyPasswordResetToken = (token, options = {}) => {
  const verifyOptions = {
    algorithms: [jwtConfig.passwordReset.algorithm],
    issuer: jwtConfig.passwordReset.issuer,
    audience: jwtConfig.passwordReset.audience,
    ...options
  };

  return jwt.verify(token, jwtConfig.passwordReset.secret, verifyOptions);
};

/**
 * Verify Email Verification Token
 * @param {string} token - Email verification token to verify
 * @param {Object} options - Verification options
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyEmailVerificationToken = (token, options = {}) => {
  const verifyOptions = {
    algorithms: [jwtConfig.emailVerification.algorithm],
    issuer: jwtConfig.emailVerification.issuer,
    audience: jwtConfig.emailVerification.audience,
    ...options
  };

  return jwt.verify(token, jwtConfig.emailVerification.secret, verifyOptions);
};

/**
 * Decode JWT token without verification (useful for extracting payload)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token or null if invalid
 */
const decodeToken = (token) => {
  try {
    return jwt.decode(token, { complete: true });
  } catch (error) {
    return null;
  }
};

/**
 * Get token expiration time
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
const getTokenExpiration = (token) => {
  const decoded = decodeToken(token);
  if (decoded && decoded.payload && decoded.payload.exp) {
    return new Date(decoded.payload.exp * 1000);
  }
  return null;
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
const isTokenExpired = (token) => {
  const expiration = getTokenExpiration(token);
  if (!expiration) return true;
  return new Date() > expiration;
};

/**
 * Extract token from Authorization header
 * @param {string} authHeader - Authorization header value
 * @returns {string|null} Extracted token or null
 */
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - User payload for tokens
 * @param {Object} options - Token generation options
 * @returns {Object} Object containing access and refresh tokens
 */
const generateTokenPair = (payload, options = {}) => {
  const accessToken = generateAccessToken(payload, options.accessToken);
  const refreshToken = generateRefreshToken(payload, options.refreshToken);

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: jwtConfig.accessToken.expiresIn,
    refreshExpiresIn: jwtConfig.refreshToken.expiresIn
  };
};

/**
 * Create standard JWT payload for user
 * @param {Object} user - User object
 * @returns {Object} Standardized JWT payload
 */
const createUserPayload = (user) => {
  return {
    userId: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roles || [],
    permissions: user.permissions || [],
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    tokenType: 'access'
  };
};

/**
 * Create refresh token payload
 * @param {Object} user - User object
 * @returns {Object} Refresh token payload
 */
const createRefreshPayload = (user) => {
  return {
    userId: user.id,
    email: user.email,
    tokenType: 'refresh'
  };
};

/**
 * Create password reset payload
 * @param {Object} user - User object
 * @returns {Object} Password reset token payload
 */
const createPasswordResetPayload = (user) => {
  return {
    userId: user.id,
    email: user.email,
    tokenType: 'password_reset',
    purpose: 'password_reset'
  };
};

/**
 * Create email verification payload
 * @param {Object} user - User object
 * @returns {Object} Email verification token payload
 */
const createEmailVerificationPayload = (user) => {
  return {
    userId: user.id,
    email: user.email,
    tokenType: 'email_verification',
    purpose: 'email_verification'
  };
};

/**
 * JWT Error Types
 */
const JWT_ERRORS = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_MALFORMED: 'TOKEN_MALFORMED',
  INVALID_SIGNATURE: 'INVALID_SIGNATURE',
  TOKEN_NOT_FOUND: 'TOKEN_NOT_FOUND',
  INVALID_AUDIENCE: 'INVALID_AUDIENCE',
  INVALID_ISSUER: 'INVALID_ISSUER'
};

/**
 * Handle JWT errors and return standardized error info
 * @param {Error} error - JWT error
 * @returns {Object} Standardized error object
 */
const handleJWTError = (error) => {
  switch (error.name) {
    case 'TokenExpiredError':
      return {
        type: JWT_ERRORS.TOKEN_EXPIRED,
        message: 'Token has expired',
        expiredAt: error.expiredAt
      };

    case 'JsonWebTokenError':
      return {
        type: JWT_ERRORS.INVALID_TOKEN,
        message: 'Invalid token'
      };

    case 'NotBeforeError':
      return {
        type: JWT_ERRORS.TOKEN_MALFORMED,
        message: 'Token not active',
        date: error.date
      };

    default:
      return {
        type: JWT_ERRORS.INVALID_TOKEN,
        message: 'Token validation failed'
      };
  }
};

/**
 * Validate JWT configuration
 * @throws {Error} If configuration is invalid
 */
const validateJWTConfig = () => {
  if (!jwtConfig.accessToken.secret || jwtConfig.accessToken.secret.length < 32) {
    throw new Error('JWT access token secret must be at least 32 characters long');
  }

  if (!jwtConfig.refreshToken.secret || jwtConfig.refreshToken.secret.length < 32) {
    throw new Error('JWT refresh token secret must be at least 32 characters long');
  }

  if (jwtConfig.accessToken.secret === jwtConfig.refreshToken.secret) {
    throw new Error('Access token and refresh token secrets must be different');
  }
};

/**
 * Get JWT configuration summary (for debugging)
 * @returns {Object} Configuration summary
 */
const getConfigSummary = () => {
  return {
    accessToken: {
      expiresIn: jwtConfig.accessToken.expiresIn,
      algorithm: jwtConfig.accessToken.algorithm,
      issuer: jwtConfig.accessToken.issuer,
      audience: jwtConfig.accessToken.audience,
      secretLength: jwtConfig.accessToken.secret.length
    },
    refreshToken: {
      expiresIn: jwtConfig.refreshToken.expiresIn,
      algorithm: jwtConfig.refreshToken.algorithm,
      issuer: jwtConfig.refreshToken.issuer,
      audience: jwtConfig.refreshToken.audience,
      secretLength: jwtConfig.refreshToken.secret.length
    },
    passwordReset: {
      expiresIn: jwtConfig.passwordReset.expiresIn
    },
    emailVerification: {
      expiresIn: jwtConfig.emailVerification.expiresIn
    }
  };
};

// Validate configuration on module load
if (process.env.NODE_ENV !== 'test') {
  try {
    validateJWTConfig();
  } catch (error) {
    console.error('❌ JWT Configuration Error:', error.message);
    process.exit(1);
  }
}

module.exports = {
  // Configuration
  config: jwtConfig,
  JWT_ERRORS,

  // Token Generation
  generateAccessToken,
  generateRefreshToken,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  generateTokenPair,

  // Token Verification
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  verifyEmailVerificationToken,

  // Token Utilities
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  extractTokenFromHeader,

  // Payload Creation
  createUserPayload,
  createRefreshPayload,
  createPasswordResetPayload,
  createEmailVerificationPayload,

  // Error Handling
  handleJWTError,

  // Configuration Management
  validateJWTConfig,
  getConfigSummary
};
