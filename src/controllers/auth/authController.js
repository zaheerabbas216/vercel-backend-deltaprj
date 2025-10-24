/**
 * File: src/controllers/auth/authController.js
 * Authentication Controller - HTTP Request Handlers
 *
 * This file handles HTTP requests for authentication endpoints.
 * It processes requests, calls services, and returns responses.
 *
 * For beginners:
 * - Controllers handle HTTP requests and responses
 * - They validate input, call services, and format responses
 * - Uses functional programming approach with individual handler functions
 * - Each function handles one specific endpoint
 */

const authService = require('../../services/auth/authService');
const { validateRequest } = require('../../middleware/validation');
const { Auth: AuthSchemas } = require('../../schemas');
const { success, error, created, unauthorized, badRequest, notFound } = require('../../utils/apiResponse');
const { logError, logAuth, logHttp } = require('../../utils/logger');
const { ERROR_CODES, createError } = require('../../utils/errorCodes');
const { calculatePagination } = require('../../utils/helpers');

/**
 * Register a new user
 * POST /api/auth/register
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const register = async (req, res) => {
  try {
    const { body } = req;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Call authentication service
    const result = await authService.registerUser(body, {
      ipAddress,
      userAgent
    });

    if (result.success) {
      logAuth('User registration successful', null, { email: body.email, ipAddress });
      return created(res, result.data, result.message);
    }

    logAuth('User registration failed', null, { email: body.email, reason: result.message, ipAddress });
    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in register controller', error, { body: req.body, ipAddress: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const login = async (req, res) => {
  try {
    const { body } = req;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const rememberMe = body.rememberMe || false;

    // Call authentication service
    const result = await authService.loginUser(body, {
      ipAddress,
      userAgent,
      rememberMe
    });

    if (result.success) {
      // Set HTTP-only cookie for refresh token (optional)
      if (result.data.tokens.refreshToken) {
        res.cookie('refreshToken', result.data.tokens.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
        });
      }

      logAuth('User login successful', result.data.user.userId, { email: body.email, ipAddress });
      return success(res, {
        user: result.data.user,
        tokens: {
          accessToken: result.data.tokens.accessToken,
          expiresIn: result.data.tokens.expiresIn
        },
        session: result.data.session
      }, result.message);
    }

    logAuth('User login failed', null, { email: body.email, reason: result.message, ipAddress });
    return unauthorized(res, result.message, createError(ERROR_CODES.INVALID_CREDENTIALS.code, {
      requiresEmailVerification: result.requiresEmailVerification
    }));

  } catch (error) {
    logError('Error in login controller', error, { body: req.body, ipAddress: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const logout = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const ipAddress = req.ip || req.connection.remoteAddress;
    const logoutAllSessions = req.body.logoutAllSessions || false;

    if (!userId || !sessionToken) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.TOKEN_MISSING.code));
    }

    // Call authentication service
    const result = await authService.logoutUser(userId, sessionToken, {
      logoutAllSessions,
      ipAddress
    });

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    if (result.success) {
      logAuth('User logout successful', userId, { logoutAllSessions, ipAddress });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in logout controller', error, { userId: req.user?.userId, ipAddress: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during logout',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Refresh authentication tokens
 * POST /api/auth/refresh
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const refreshTokens = async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    if (!refreshToken) {
      return unauthorized(res, 'Refresh token is required', createError(ERROR_CODES.TOKEN_MISSING.code));
    }

    // Call authentication service
    const result = await authService.refreshTokens(refreshToken, {
      ipAddress,
      userAgent
    });

    if (result.success) {
      logAuth('Token refresh successful', result.data.user?.userId, { ipAddress });
      return success(res, result.data, result.message);
    }

    // Clear invalid refresh token cookie
    res.clearCookie('refreshToken');

    logAuth('Token refresh failed', null, { reason: result.message, ipAddress });
    return unauthorized(res, result.message, createError(ERROR_CODES.TOKEN_INVALID.code));

  } catch (error) {
    logError('Error in refreshTokens controller', error, { ipAddress: req.ip });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during token refresh',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Verify email address
 * POST /api/auth/verify-email
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return badRequest(res, 'Verification token is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'token',
        details: 'Token is required for email verification'
      }));
    }

    // Call authentication service
    const result = await authService.verifyEmail(token);

    if (result.success) {
      logAuth('Email verification successful', result.data.userId, { token: token.substring(0, 10) + '...' });
      return success(res, result.data, result.message);
    }

    logAuth('Email verification failed', null, { reason: result.message, token: token.substring(0, 10) + '...' });
    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field
    }));

  } catch (error) {
    logError('Error in verifyEmail controller', error, { token: req.body.token?.substring(0, 10) + '...' });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during email verification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * GET /api/auth/profile
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const includeStats = req.query.includeStats === 'true';

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call authentication service
    const result = await authService.getUserProfile(userId, {
      includeStats
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.USER_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getProfile controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const updateProfile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { body } = req;

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call authentication service
    const result = await authService.updateUserProfile(userId, body);

    if (result.success) {
      logAuth('Profile update successful', userId, { updatedFields: Object.keys(body) });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in updateProfile controller', error, { userId: req.user?.userId, body: req.body });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user sessions
 * GET /api/auth/sessions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getSessions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const includeInactive = req.query.includeInactive === 'true';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call authentication service
    const result = await authService.getUserSessions(userId, {
      includeInactive,
      page,
      limit
    });

    if (result.success) {
      // Calculate pagination metadata if the service doesn't provide it
      const pagination = result.data.pagination || calculatePagination(page, limit, result.data.totalCount || 0);

      return success(res, result.data, result.message, 200, { pagination });
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in getSessions controller', error, { userId: req.user?.userId, query: req.query });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check authentication status
 * GET /api/auth/me
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const checkAuth = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return unauthorized(res, 'Not authenticated', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Get basic profile information
    const result = await authService.getUserProfile(userId, {
      includeStats: false
    });

    if (result.success) {
      return success(res, {
        authenticated: true,
        user: result.data.profile
      }, 'Authenticated');
    }

    return unauthorized(res, 'Authentication invalid', createError(ERROR_CODES.TOKEN_INVALID.code));

  } catch (error) {
    logError('Error in checkAuth controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while checking authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  verifyEmail,
  getProfile,
  updateProfile,
  getSessions,
  checkAuth
};
