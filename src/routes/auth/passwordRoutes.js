// src/routes/auth/passwordRoutes.js
const express = require('express');
const passwordController = require('../../controllers/auth/passwordController');
const authMiddleware = require('../../middleware/auth');
const validation = require('../../middleware/validation');
const rateLimiter = require('../../middleware/rateLimiter');

// Import validators
const {
  passwordResetRequestValidator,
  passwordResetValidator,
  changePasswordValidator,
  passwordValidator
} = require('../../validators/auth/loginValidator');

const router = express.Router();

// Public routes (no authentication required)

/**
 * @route   POST /api/auth/password/forgot
 * @desc    Request password reset link
 * @access  Public
 * @body    { email }
 */
router.post('/forgot',
  rateLimiter.passwordResetRequestLimiter, // Rate limiting for reset requests
  passwordResetRequestValidator, // Email validation
  validation.handleValidationErrors,
  passwordController.requestPasswordReset
);

/**
 * @route   POST /api/auth/password/reset
 * @desc    Reset password using token
 * @access  Public
 * @body    { token, password, confirmPassword }
 */
router.post('/reset',
  rateLimiter.passwordResetLimiter, // Rate limiting for reset attempts
  passwordResetValidator, // Token and password validation
  validation.handleValidationErrors,
  passwordController.resetPassword
);

/**
 * @route   GET /api/auth/password/reset/:token/verify
 * @desc    Verify password reset token validity
 * @access  Public
 * @params  { token }
 */
router.get('/reset/:token/verify',
  rateLimiter.tokenVerificationLimiter,
  passwordController.verifyResetToken
);

/**
 * @route   POST /api/auth/password/validate
 * @desc    Validate password strength (utility endpoint)
 * @access  Public
 * @body    { password, userInfo? }
 */
router.post('/validate',
  rateLimiter.generalLimiter,
  passwordValidator,
  validation.handleValidationErrors,
  passwordController.validatePasswordStrength
);

// Protected routes (authentication required)

/**
 * @route   POST /api/auth/password/change
 * @desc    Change password for authenticated user
 * @access  Private
 * @body    { currentPassword, newPassword, confirmPassword }
 */
router.post('/change',
  authMiddleware.authenticate, // Require authentication
  authMiddleware.requireEmailVerification, // Require verified email
  rateLimiter.passwordChangeLimiter, // Rate limiting
  changePasswordValidator, // Password validation
  validation.handleValidationErrors,
  passwordController.changePassword
);

/**
 * @route   GET /api/auth/password/history
 * @desc    Get user's password change history (metadata only)
 * @access  Private
 * @query   { limit?, offset? }
 */
router.get('/history',
  authMiddleware.authenticate,
  passwordController.getPasswordHistory
);

/**
 * @route   POST /api/auth/password/generate
 * @desc    Generate secure password suggestion
 * @access  Private
 * @body    { length?, options? }
 */
router.post('/generate',
  authMiddleware.authenticate,
  rateLimiter.generalLimiter,
  passwordController.generateSecurePassword
);

/**
 * @route   GET /api/auth/password/policy
 * @desc    Get current password policy
 * @access  Private
 */
router.get('/policy',
  authMiddleware.authenticate,
  passwordController.getPasswordPolicy
);

/**
 * @route   POST /api/auth/password/revoke-reset
 * @desc    Revoke all active password reset requests
 * @access  Private
 * @body    { reason? }
 */
router.post('/revoke-reset',
  authMiddleware.authenticate,
  rateLimiter.generalLimiter,
  passwordController.revokePasswordResets
);

// Admin routes (require admin privileges)

/**
 * @route   POST /api/auth/password/admin/force-reset
 * @desc    Force password reset for user (admin only)
 * @access  Private (Admin)
 * @body    { userId, reason, notifyUser? }
 */
router.post('/admin/force-reset',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  rateLimiter.adminLimiter,
  passwordController.forcePasswordReset
);

/**
 * @route   GET /api/auth/password/admin/reset-stats
 * @desc    Get password reset statistics (admin only)
 * @access  Private (Admin)
 * @query   { days?, granularity? }
 */
router.get('/admin/reset-stats',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  passwordController.getPasswordResetStats
);

/**
 * @route   GET /api/auth/password/admin/weak-passwords
 * @desc    Get users with potentially weak passwords (admin only)
 * @access  Private (Admin)
 * @query   { limit?, offset? }
 */
router.get('/admin/weak-passwords',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  passwordController.getWeakPasswordUsers
);

/**
 * @route   POST /api/auth/password/admin/bulk-expire
 * @desc    Expire passwords for multiple users (admin only)
 * @access  Private (Admin)
 * @body    { userIds, reason, gracePeriodDays? }
 */
router.post('/admin/bulk-expire',
  authMiddleware.authenticate,
  authMiddleware.requireAdmin,
  rateLimiter.adminLimiter,
  passwordController.bulkExpirePasswords
);

// Route parameter validation
router.param('token', (req, res, next, token) => {
  // Validate token format
  if (!token || token.length < 32 || token.length > 128) {
    return res.status(400).json({
      success: false,
      message: 'Invalid password reset token format',
      error: 'INVALID_TOKEN_FORMAT'
    });
  }

  // Check for valid hex characters
  if (!/^[a-f0-9]+$/i.test(token)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid token characters',
      error: 'INVALID_TOKEN_CHARACTERS'
    });
  }

  next();
});

// Error handling middleware for password routes
router.use((error, req, res, next) => {
  // Log password-related errors with context
  console.error('Password route error:', {
    error: error.message,
    route: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Handle specific password-related errors
  if (error.name === 'PasswordValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Password validation failed',
      error: 'PASSWORD_VALIDATION_ERROR',
      details: error.details
    });
  }

  if (error.name === 'PasswordResetError') {
    return res.status(400).json({
      success: false,
      message: 'Password reset failed',
      error: 'PASSWORD_RESET_ERROR',
      details: error.details
    });
  }

  next(error);
});

module.exports = router;
