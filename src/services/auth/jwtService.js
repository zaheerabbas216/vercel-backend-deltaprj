/**
 * File: src/services/auth/jwtService.js
 * JWT Service - Token Management
 *
 * This file handles all JWT token operations including generation,
 * verification, and token management for authentication.
 *
 * For beginners:
 * - JWT (JSON Web Token) is used for secure authentication
 * - Tokens contain user information and expire after a set time
 * - Access tokens are short-lived, refresh tokens are longer-lived
 * - This service uses functional programming approach
 */

const jwt = require('jsonwebtoken');
const config = require('../../../config/environment');

/**
 * Generate access token for user authentication
 *
 * @param {Object} payload - Token payload (user data)
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  try {
    const tokenPayload = {
      ...payload,
      type: 'access',
      iat: Math.floor(Date.now() / 1000) // Issued at
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

  } catch (error) {
    console.error('Error generating access token:', error);
    throw new Error(`Failed to generate access token: ${error.message}`);
  }
};

/**
 * Generate refresh token for token renewal
 *
 * @param {Object} payload - Token payload (user data)
 * @returns {string} JWT refresh token
 */
const generateRefreshToken = (payload) => {
  try {
    const tokenPayload = {
      ...payload,
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000) // Issued at
    };

    return jwt.sign(tokenPayload, config.jwt.refreshSecret || config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw new Error(`Failed to generate refresh token: ${error.message}`);
  }
};

/**
 * Verify access token
 *
 * @param {string} token - JWT access token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyAccessToken = (token) => {
  try {
    if (!token) {
      return null;
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    const decoded = jwt.verify(cleanToken, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    // Check token type
    if (decoded.type !== 'access') {
      console.warn('Invalid token type for access token verification');
      return null;
    }

    return decoded;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Access token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid access token');
    } else if (error.name === 'NotBeforeError') {
      console.log('Access token not active yet');
    } else {
      console.error('Error verifying access token:', error);
    }

    return null;
  }
};

/**
 * Verify refresh token
 *
 * @param {string} token - JWT refresh token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const verifyRefreshToken = (token) => {
  try {
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, config.jwt.refreshSecret || config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    // Check token type
    if (decoded.type !== 'refresh') {
      console.warn('Invalid token type for refresh token verification');
      return null;
    }

    return decoded;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Refresh token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid refresh token');
    } else if (error.name === 'NotBeforeError') {
      console.log('Refresh token not active yet');
    } else {
      console.error('Error verifying refresh token:', error);
    }

    return null;
  }
};

/**
 * Decode token without verification (for inspection)
 *
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token or null if invalid
 */
const decodeToken = (token) => {
  try {
    if (!token) {
      return null;
    }

    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    return jwt.decode(cleanToken, { complete: true });

  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Get token expiration date
 *
 * @param {string} token - JWT token
 * @returns {Date|null} Expiration date or null if invalid
 */
const getTokenExpiration = (token) => {
  try {
    const decoded = decodeToken(token);

    if (!decoded || !decoded.payload || !decoded.payload.exp) {
      return null;
    }

    // Convert Unix timestamp to Date
    return new Date(decoded.payload.exp * 1000);

  } catch (error) {
    console.error('Error getting token expiration:', error);
    return null;
  }
};

/**
 * Check if token is expired
 *
 * @param {string} token - JWT token
 * @returns {boolean} True if expired, false otherwise
 */
const isTokenExpired = (token) => {
  try {
    const expiration = getTokenExpiration(token);

    if (!expiration) {
      return true; // Consider invalid tokens as expired
    }

    return new Date() >= expiration;

  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true; // Consider error case as expired
  }
};

/**
 * Get token time remaining in seconds
 *
 * @param {string} token - JWT token
 * @returns {number} Time remaining in seconds (0 if expired)
 */
const getTokenTimeRemaining = (token) => {
  try {
    const expiration = getTokenExpiration(token);

    if (!expiration) {
      return 0;
    }

    const timeRemaining = Math.max(0, Math.floor((expiration - new Date()) / 1000));
    return timeRemaining;

  } catch (error) {
    console.error('Error getting token time remaining:', error);
    return 0;
  }
};

/**
 * Extract user ID from token
 *
 * @param {string} token - JWT token
 * @returns {string|null} User ID or null if not found
 */
const getUserIdFromToken = (token) => {
  try {
    const decoded = decodeToken(token);

    if (!decoded || !decoded.payload) {
      return null;
    }

    return decoded.payload.userId || decoded.payload.sub || null;

  } catch (error) {
    console.error('Error extracting user ID from token:', error);
    return null;
  }
};

/**
 * Extract user email from token
 *
 * @param {string} token - JWT token
 * @returns {string|null} User email or null if not found
 */
const getUserEmailFromToken = (token) => {
  try {
    const decoded = decodeToken(token);

    if (!decoded || !decoded.payload) {
      return null;
    }

    return decoded.payload.email || null;

  } catch (error) {
    console.error('Error extracting user email from token:', error);
    return null;
  }
};

/**
 * Generate token pair (access + refresh)
 *
 * @param {Object} payload - User payload
 * @returns {Object} Token pair object
 */
const generateTokenPair = (payload) => {
  try {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: config.jwt.expiresIn,
      refreshExpiresIn: config.jwt.refreshExpiresIn
    };

  } catch (error) {
    console.error('Error generating token pair:', error);
    throw new Error(`Failed to generate token pair: ${error.message}`);
  }
};

/**
 * Validate token format
 *
 * @param {string} token - Token to validate
 * @returns {boolean} True if format is valid
 */
const isValidTokenFormat = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Remove Bearer prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.slice(7) : token;

    // JWT should have 3 parts separated by dots
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Each part should be base64url encoded
    const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
    return parts.every(part => base64UrlRegex.test(part));

  } catch (error) {
    return false;
  }
};

/**
 * Get token information
 *
 * @param {string} token - JWT token
 * @returns {Object} Token information
 */
const getTokenInfo = (token) => {
  try {
    const decoded = decodeToken(token);

    if (!decoded) {
      return {
        valid: false,
        expired: true,
        info: null
      };
    }

    const payload = decoded.payload;
    const expiration = getTokenExpiration(token);
    const expired = isTokenExpired(token);
    const timeRemaining = getTokenTimeRemaining(token);

    return {
      valid: true,
      expired,
      info: {
        userId: payload.userId,
        email: payload.email,
        type: payload.type,
        issuer: payload.iss,
        audience: payload.aud,
        issuedAt: new Date(payload.iat * 1000),
        expiresAt: expiration,
        timeRemaining: timeRemaining
      }
    };

  } catch (error) {
    console.error('Error getting token info:', error);
    return {
      valid: false,
      expired: true,
      info: null,
      error: error.message
    };
  }
};

/**
 * Create password reset token
 *
 * @param {Object} payload - Reset token payload
 * @returns {string} Password reset token
 */
const generatePasswordResetToken = (payload) => {
  try {
    const tokenPayload = {
      ...payload,
      type: 'password_reset',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.auth.passwordResetExpiresIn,
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

  } catch (error) {
    console.error('Error generating password reset token:', error);
    throw new Error(`Failed to generate password reset token: ${error.message}`);
  }
};

/**
 * Verify password reset token
 *
 * @param {string} token - Password reset token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyPasswordResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    // Check token type
    if (decoded.type !== 'password_reset') {
      console.warn('Invalid token type for password reset verification');
      return null;
    }

    return decoded;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Password reset token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid password reset token');
    } else {
      console.error('Error verifying password reset token:', error);
    }

    return null;
  }
};

/**
 * Create email verification token
 *
 * @param {Object} payload - Verification token payload
 * @returns {string} Email verification token
 */
const generateEmailVerificationToken = (payload) => {
  try {
    const tokenPayload = {
      ...payload,
      type: 'email_verification',
      iat: Math.floor(Date.now() / 1000)
    };

    return jwt.sign(tokenPayload, config.jwt.secret, {
      expiresIn: config.auth.emailVerificationExpiresIn,
      algorithm: config.jwt.algorithm,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

  } catch (error) {
    console.error('Error generating email verification token:', error);
    throw new Error(`Failed to generate email verification token: ${error.message}`);
  }
};

/**
 * Verify email verification token
 *
 * @param {string} token - Email verification token
 * @returns {Object|null} Decoded payload or null if invalid
 */
const verifyEmailVerificationToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      algorithms: [config.jwt.algorithm],
      issuer: config.jwt.issuer,
      audience: config.jwt.audience
    });

    // Check token type
    if (decoded.type !== 'email_verification') {
      console.warn('Invalid token type for email verification');
      return null;
    }

    return decoded;

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.log('Email verification token has expired');
    } else if (error.name === 'JsonWebTokenError') {
      console.log('Invalid email verification token');
    } else {
      console.error('Error verifying email verification token:', error);
    }

    return null;
  }
};

module.exports = {
  // Token generation
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  generatePasswordResetToken,
  generateEmailVerificationToken,

  // Token verification
  verifyAccessToken,
  verifyRefreshToken,
  verifyPasswordResetToken,
  verifyEmailVerificationToken,

  // Token utilities
  decodeToken,
  getTokenExpiration,
  isTokenExpired,
  getTokenTimeRemaining,
  getUserIdFromToken,
  getUserEmailFromToken,
  getTokenInfo,
  isValidTokenFormat
};
