/**
 * File: src/controllers/auth/sessionController.js
 * Session Controller - HTTP Request Handlers
 *
 * This file handles HTTP requests for session management endpoints.
 * It processes session operations and user session tracking.
 *
 * For beginners:
 * - Controllers handle HTTP requests and responses for session operations
 * - They manage user sessions, device tracking, and session security
 * - Uses functional programming approach with individual handler functions
 * - Each function handles one specific session endpoint
 */

const authService = require('../../services/auth/authService');
const { success, error, badRequest, unauthorized } = require('../../utils/apiResponse');
const { logError, logAuth, logSecurity } = require('../../utils/logger');
const { ERROR_CODES, createError } = require('../../utils/errorCodes');
const { calculatePagination, getCurrentTimestamp } = require('../../utils/helpers');
const { isEmpty } = require('../../utils/stringUtils');

/**
 * Get current user sessions
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

    // Call authentication service to get sessions
    const result = await authService.getUserSessions(userId, {
      includeInactive,
      page,
      limit
    });

    if (result.success) {
      // Calculate pagination metadata if not provided by service
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
 * Revoke a specific session
 * DELETE /api/auth/sessions/:sessionId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const revokeSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { sessionId } = req.params;
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    if (isEmpty(sessionId)) {
      return badRequest(res, 'Session ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'sessionId',
        details: 'Session ID parameter is required'
      }));
    }

    // For session revocation, we'll need to extend the auth service
    // This is a placeholder implementation
    const { SessionModel } = require('../../models');
    const result = await SessionModel.revokeSessionById(sessionId, userId, ipAddress);

    if (result.success) {
      logAuth('Session revoked', userId, { sessionId, ipAddress });
      logSecurity('Session manually revoked by user', { userId, sessionId, ipAddress });
      return success(res, {
        sessionId,
        revokedAt: getCurrentTimestamp()
      }, 'Session revoked successfully');
    }

    return badRequest(res, result.message || 'Failed to revoke session');

  } catch (error) {
    logError('Error in revokeSession controller', error, { userId: req.user?.userId, sessionId: req.params.sessionId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while revoking session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Revoke all user sessions (except current)
 * DELETE /api/auth/sessions/all
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const revokeAllSessions = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const currentSessionToken = req.headers.authorization?.replace('Bearer ', '');
    const ipAddress = req.ip || req.connection.remoteAddress;
    const keepCurrent = req.body.keepCurrent !== false; // Default to true

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call authentication service to logout from all sessions
    const result = await authService.logoutUser(userId, currentSessionToken, {
      logoutAllSessions: true,
      ipAddress
    });

    if (result.success) {
      logAuth('All sessions revoked', userId, { keepCurrent, ipAddress });
      logSecurity('All sessions revoked by user', { userId, keepCurrent, ipAddress });
      return success(res, result.data, 'All sessions revoked successfully');
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in revokeAllSessions controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while revoking all sessions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current session information
 * GET /api/auth/sessions/current
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getCurrentSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!userId || !sessionToken) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.TOKEN_MISSING.code));
    }

    // Get current session details
    const { SessionModel } = require('../../models');
    const session = await SessionModel.findByToken(sessionToken);

    if (!session || !session.isActive) {
      return unauthorized(res, 'Invalid or expired session', createError(ERROR_CODES.TOKEN_INVALID.code));
    }

    // Format session response (exclude sensitive data)
    const sessionData = {
      id: session.id,
      userId: session.userId,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      location: session.location,
      device: session.device,
      browser: session.browser,
      isActive: session.isActive,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      expiresAt: session.expiresAt
    };

    return success(res, { session: sessionData }, 'Current session retrieved successfully');

  } catch (error) {
    logError('Error in getCurrentSession controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving current session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update current session (refresh activity)
 * PUT /api/auth/sessions/current
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const updateCurrentSession = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');
    const ipAddress = req.ip || req.connection.remoteAddress;

    if (!userId || !sessionToken) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.TOKEN_MISSING.code));
    }

    // Update session activity
    const { SessionModel } = require('../../models');
    const result = await SessionModel.updateActivity(sessionToken, ipAddress);

    if (result.success) {
      logAuth('Session activity updated', userId, { sessionId: result.data.sessionId });
      return success(res, {
        sessionId: result.data.sessionId,
        lastActivityAt: getCurrentTimestamp()
      }, 'Session activity updated successfully');
    }

    return badRequest(res, result.message || 'Failed to update session');

  } catch (error) {
    logError('Error in updateCurrentSession controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating session',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get session statistics for current user
 * GET /api/auth/sessions/stats
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getSessionStats = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Get session statistics
    const { SessionModel } = require('../../models');
    const stats = await SessionModel.getUserStatistics(userId);

    if (stats.success) {
      return success(res, stats.data, 'Session statistics retrieved successfully');
    }

    return badRequest(res, stats.message || 'Failed to get session statistics');

  } catch (error) {
    logError('Error in getSessionStats controller', error, { userId: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving session statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getSessions,
  revokeSession,
  revokeAllSessions,
  getCurrentSession,
  updateCurrentSession,
  getSessionStats
};
