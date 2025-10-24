// src/routes/auth/authRoutes.js
const express = require('express');
const authController = require('../../controllers/auth/authController');
const authMiddleware = require('../../middleware/auth');
const validation = require('../../middleware/validation');
const rateLimiter = require('../../middleware/rateLimiter');

// Import validators
const {
  registerValidator,
  loginValidator,
  emailValidator,
  tokenValidator
} = require('../../validators/auth/loginValidator');

const router = express.Router();

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 * @body    { username, email, password, firstName, lastName, phoneNumber? }
 */
router.post('/register',
  rateLimiter.createAccountLimiter, // Rate limiting for account creation
  registerValidator, // Input validation
  validation.handleValidationErrors, // Handle validation errors
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get tokens
 * @access  Public
 * @body    { identifier, password, rememberMe?, deviceName? }
 */
router.post('/login',
  rateLimiter.loginLimiter, // Rate limiting for login attempts
  loginValidator, // Input validation
  validation.handleValidationErrors,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires refresh token)
 * @body    { refreshToken? } or uses HTTP-only cookie
 */
router.post('/refresh',
  rateLimiter.refreshTokenLimiter, // Rate limiting for token refresh
  authController.refreshToken
);

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify email address using token
 * @access  Public
 * @params  { token }
 */
router.get('/verify-email/:token',
  rateLimiter.emailVerificationLimiter, // Rate limiting for email verification
  tokenValidator, // Token validation
  validation.handleValidationErrors,
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 * @body    { email }
 */
router.post('/resend-verification',
  rateLimiter.emailVerificationLimiter, // Rate limiting
  emailValidator, // Email validation
  validation.handleValidationErrors,
  authController.resendEmailVerification
);

/**
 * @route   GET /api/auth/status
 * @desc    Check authentication status
 * @access  Public (optional auth)
 */
router.get('/status',
  authController.checkAuthStatus
);

/**
 * @route   GET /api/auth/health
 * @desc    Authentication service health check
 * @access  Public
 */
router.get('/health',
  authController.healthCheck
);

// Protected routes (authentication required)

/**
 * @route   POST /api/auth/logout
 * @desc    Logout current session
 * @access  Private
 */
router.post('/logout',
  authMiddleware.authenticate, // Require authentication
  authController.logout
);

/**
 * @route   POST /api/auth/logout-all
 * @desc    Logout from all devices/sessions
 * @access  Private
 */
router.post('/logout-all',
  authMiddleware.authenticate, // Require authentication
  authController.logoutAllDevices
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authMiddleware.authenticate, // Require authentication
  authController.getCurrentUser
);

/**
 * @route   GET /api/auth/sessions
 * @desc    Get user's active sessions
 * @access  Private
 */
router.get('/sessions',
  authMiddleware.authenticate, // Require authentication
  authController.getUserSessions
);

/**
 * @route   DELETE /api/auth/sessions/:sessionId
 * @desc    Terminate specific session
 * @access  Private
 * @params  { sessionId }
 */
router.delete('/sessions/:sessionId',
  authMiddleware.authenticate, // Require authentication
  authController.terminateSession
);

/**
 * @route   GET /api/auth/stats
 * @desc    Get authentication statistics
 * @access  Private
 * @query   { days? }
 */
router.get('/stats',
  authMiddleware.authenticate, // Require authentication
  // authMiddleware.requirePermission('auth:read'), // Require specific permission (to be implemented)
  authController.getAuthStats
);

// Route parameter validation middleware
router.param('token', (req, res, next, token) => {
  // Validate token format
  if (!token || token.length < 10) {
    return res.status(400).json({
      success: false,
      message: 'Invalid token format',
      error: 'TOKEN_INVALID_FORMAT'
    });
  }
  next();
});

router.param('sessionId', (req, res, next, sessionId) => {
  // Validate UUID format for session ID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!sessionId || !uuidRegex.test(sessionId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid session ID format',
      error: 'SESSION_ID_INVALID_FORMAT'
    });
  }
  next();
});

module.exports = router;
