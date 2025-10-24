/**
 * File: src/controllers/auth/passwordController.js
 * Password Controller - HTTP Request Handlers
 *
 * This file handles HTTP requests for password-related endpoints.
 * It processes password changes, resets, and security operations.
 *
 * For beginners:
 * - Controllers handle HTTP requests and responses for password operations
 * - They validate input, call password services, and format responses
 * - Uses functional programming approach with individual handler functions
 * - Each function handles one specific password endpoint
 */

const passwordService = require('../../services/auth/passwordService');
const { success, error, badRequest, unauthorized } = require('../../utils/apiResponse');
const { logError, logAuth, logSecurity } = require('../../utils/logger');
const { ERROR_CODES, createError } = require('../../utils/errorCodes');
const { validatePassword } = require('../../utils/helpers');
const { isEmpty } = require('../../utils/stringUtils');

/**
 * Change user password (authenticated users)
 * PUT /api/auth/password/change
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const changePassword = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { body } = req;

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call password service
    const result = await passwordService.changePassword(userId, body);

    if (result.success) {
      logAuth('Password change successful', userId, { ipAddress: req.ip });
      logSecurity('Password changed by user', { userId, ipAddress: req.ip });
      return success(res, result.data, result.message);
    }

    logSecurity('Password change attempt failed', { userId, reason: result.message, ipAddress: req.ip });
    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in changePassword controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during password change',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Request password reset
 * POST /api/auth/password/reset-request
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const requestReset = async (req, res) => {
  try {
    const { body } = req;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Call password service
    const result = await passwordService.requestPasswordReset(body, {
      ipAddress,
      userAgent
    });

    if (result.success) {
      logAuth('Password reset requested', null, { email: body.email, ipAddress });
      logSecurity('Password reset request', { email: body.email, ipAddress });
      return success(res, {
        email: result.data.email,
        requestedAt: result.data.requestedAt
      }, result.message);
    }

    logSecurity('Password reset request failed', { email: body.email, reason: result.message, ipAddress });
    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in requestReset controller', error, { body: req.body, ipAddress: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during reset request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password using token
 * POST /api/auth/password/reset
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const resetPassword = async (req, res) => {
  try {
    const { body } = req;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Call password service
    const result = await passwordService.resetPassword(body, {
      ipAddress
    });

    if (result.success) {
      logAuth('Password reset successful', result.data.userId, { ipAddress });
      logSecurity('Password reset completed', { userId: result.data.userId, ipAddress });
      return success(res, result.data, result.message);
    }

    logSecurity('Password reset attempt failed', { reason: result.message, ipAddress, token: body.token?.substring(0, 10) + '...' });
    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in resetPassword controller', error, { ipAddress: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during password reset',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Validate password reset token
 * POST /api/auth/password/validate-token
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const validateResetToken = async (req, res) => {
  try {
    const { body } = req;

    // Call password service
    const result = await passwordService.validateResetToken(body);

    if (result.success) {
      logAuth('Password reset token validated', null, { token: body.token?.substring(0, 10) + '...' });
      return success(res, result.data, result.message);
    }

    logSecurity('Invalid password reset token used', { token: body.token?.substring(0, 10) + '...', ipAddress: req.ip });
    return badRequest(res, result.message, createError(ERROR_CODES.TOKEN_INVALID.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in validateResetToken controller', error, { token: req.body.token?.substring(0, 10) + '...' });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during token validation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get password reset history for user's email
 * GET /api/auth/password/reset-history
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getResetHistory = async (req, res) => {
  try {
    const email = req.query.email;
    const limit = parseInt(req.query.limit) || 10;
    const timeframe = parseInt(req.query.timeframe) || 24;

    if (isEmpty(email)) {
      return badRequest(res, 'Email parameter is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'email',
        details: 'Email is required to retrieve reset history'
      }));
    }

    // Call password service
    const result = await passwordService.getResetHistory(email, {
      limit,
      timeframe
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field
    }));

  } catch (error) {
    logError('Error in getResetHistory controller', error, { email: req.query.email });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving reset history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Validate password strength
 * POST /api/auth/password/validate-strength
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const validatePasswordStrength = async (req, res) => {
  try {
    const { password } = req.body;

    if (isEmpty(password)) {
      return badRequest(res, 'Password is required for validation', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'password',
        details: 'Password is required for strength validation'
      }));
    }

    // Use helper utility for password validation
    const validationResult = validatePassword(password);

    // Also call password service for additional validation
    const serviceResult = passwordService.validatePasswordStrength(password);

    // Combine results (prioritize helper utility structure)
    const result = {
      ...validationResult,
      serviceValidation: serviceResult
    };

    return success(res, result, 'Password strength validation completed');

  } catch (error) {
    logError('Error in validatePasswordStrength controller', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during password validation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Generate secure password
 * POST /api/auth/password/generate
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const generatePassword = async (req, res) => {
  try {
    const options = req.body;

    // Call password service
    const result = passwordService.generateSecurePassword(options);

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in generatePassword controller', error, { options: req.body });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during password generation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check password security (compromise check)
 * POST /api/auth/password/security-check
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const checkPasswordSecurity = async (req, res) => {
  try {
    const { password } = req.body;

    if (isEmpty(password)) {
      return badRequest(res, 'Password is required for security check', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'password',
        details: 'Password is required for security validation'
      }));
    }

    // Call password service
    const result = await passwordService.checkPasswordCompromise(password);

    if (result.success) {
      logSecurity('Password security check performed', { isCompromised: result.data.isCompromised, ipAddress: req.ip });
      return success(res, result.data, 'Password security check completed');
    }

    return error(res, result.message, 500, createError(ERROR_CODES.EXTERNAL_API_ERROR.code));

  } catch (error) {
    logError('Error in checkPasswordSecurity controller', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during security check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get password requirements and policies
 * GET /api/auth/password/requirements
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getPasswordRequirements = async (req, res) => {
  try {
    const config = require('../../../config/environment');

    const requirements = {
      minLength: config.security?.password?.minLength || 8,
      requireUppercase: config.security?.password?.requireUppercase || false,
      requireLowercase: config.security?.password?.requireLowercase || false,
      requireNumbers: config.security?.password?.requireNumbers || false,
      requireSpecialChars: config.security?.password?.requireSpecial || false,
      resetExpirationTime: config.auth?.passwordResetExpiresIn || '15m',
      maxResetAttempts: 3,
      resetCooldownPeriod: '15m'
    };

    return success(res, {
      requirements,
      examples: {
        validPassword: 'MyStr0ng!Pass',
        invalidPasswords: [
          'weak',
          '12345678',
          'password'
        ]
      }
    }, 'Password requirements retrieved successfully');

  } catch (error) {
    logError('Error in getPasswordRequirements controller', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving requirements',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  changePassword,
  requestReset,
  resetPassword,
  validateResetToken,
  getResetHistory,
  validatePasswordStrength,
  generatePassword,
  checkPasswordSecurity,
  getPasswordRequirements
};
