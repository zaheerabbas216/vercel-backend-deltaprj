// src/validators/auth/loginValidator.js
const { body, param, query } = require('express-validator');

// User registration validator
const registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .isAlphanumeric()
    .withMessage('Username must contain only letters and numbers')
    .toLowerCase(),

  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    }),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('firstName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phoneNumber')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters')
];

// User login validator
const loginValidator = [
  body('identifier')
    .trim()
    .notEmpty()
    .withMessage('Username or email is required')
    .isLength({ min: 3, max: 255 })
    .withMessage('Username or email must be between 3 and 255 characters'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 1, max: 128 })
    .withMessage('Password must be between 1 and 128 characters'),

  body('rememberMe')
    .optional()
    .isBoolean()
    .withMessage('Remember me must be a boolean value'),

  body('deviceName')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Device name must be less than 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_()]+$/)
    .withMessage('Device name contains invalid characters')
];

// Email validator (for resend verification, password reset, etc.)
const emailValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
];

// Token validator (for URL parameters)
const tokenValidator = [
  param('token')
    .trim()
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid token format')
    .matches(/^[a-zA-Z0-9\-._]+$/)
    .withMessage('Token contains invalid characters')
];

// Password validator (for password reset, change password)
const passwordValidator = [
  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

// Password reset request validator
const passwordResetRequestValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    })
];

// Password reset validator
const passwordResetValidator = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Invalid token format'),

  body('password')
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

// Change password validator (for authenticated users)
const changePasswordValidator = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8, max: 128 })
    .withMessage('New password must be between 8 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Refresh token validator
const refreshTokenValidator = [
  body('refreshToken')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Refresh token cannot be empty if provided')
    .isLength({ min: 10 })
    .withMessage('Invalid refresh token format')
];

// Query parameters validator for pagination and filtering
const queryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'username', 'email', 'firstName', 'lastName'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
    .toLowerCase(),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must be less than 100 characters')
    .escape() // Sanitize for safety
];

// User profile update validator
const updateProfileValidator = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phoneNumber')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number')
    .isLength({ max: 20 })
    .withMessage('Phone number must be less than 20 characters'),

  body('dateOfBirth')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Date of birth must be a valid date')
    .isBefore()
    .withMessage('Date of birth must be in the past')
    .toDate(),

  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer_not_to_say'])
    .withMessage('Invalid gender value'),

  body('timezone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must be less than 50 characters'),

  body('language')
    .optional()
    .isLength({ min: 2, max: 10 })
    .withMessage('Language code must be between 2 and 10 characters')
    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
    .withMessage('Invalid language code format')
];

// Two-factor authentication validators
const twoFactorValidator = [
  body('code')
    .trim()
    .isLength({ min: 6, max: 6 })
    .withMessage('Two-factor code must be 6 digits')
    .isNumeric()
    .withMessage('Two-factor code must contain only numbers')
];

// Session management validators
const sessionValidator = [
  param('sessionId')
    .trim()
    .isUUID()
    .withMessage('Invalid session ID format'),

  query('includeExpired')
    .optional()
    .isBoolean()
    .withMessage('Include expired must be a boolean value')
    .toBoolean()
];

// Stats query validator
const statsQueryValidator = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
    .toInt(),

  query('granularity')
    .optional()
    .isIn(['hour', 'day', 'week', 'month'])
    .withMessage('Granularity must be hour, day, week, or month')
];

// Device management validator
const deviceValidator = [
  body('deviceName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Device name must be between 1 and 255 characters')
    .matches(/^[a-zA-Z0-9\s\-_()]+$/)
    .withMessage('Device name contains invalid characters'),

  body('deviceId')
    .optional()
    .trim()
    .isLength({ min: 10, max: 255 })
    .withMessage('Device ID must be between 10 and 255 characters')
    .matches(/^[a-zA-Z0-9\-_.]+$/)
    .withMessage('Device ID contains invalid characters')
];

// Custom validation helpers
const customValidators = {
  // Check if password meets custom strength requirements
  isStrongPassword: (value) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumbers = /\d/.test(value);
    const hasSpecialChar = /[@$!%*?&]/.test(value);

    return value.length >= minLength &&
            hasUpperCase &&
            hasLowerCase &&
            hasNumbers &&
            hasSpecialChar;
  },

  // Check if username is not an email format
  isNotEmail: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(value);
  },

  // Check if value doesn't contain common patterns
  noCommonPatterns: (value) => {
    const commonPatterns = [
      /123456/,
      /password/i,
      /qwerty/i,
      /abc123/i,
      /admin/i
    ];

    return !commonPatterns.some(pattern => pattern.test(value));
  }
};

// Username validator (standalone)
const usernameValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_.-]+$/)
    .withMessage('Username can only contain letters, numbers, dots, hyphens, and underscores')
    .custom(customValidators.isNotEmail)
    .withMessage('Username cannot be an email address')
    .toLowerCase()
];

// Email change validator
const emailChangeValidator = [
  body('newEmail')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .isLength({ max: 255 })
    .withMessage('Email must be less than 255 characters')
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false
    }),

  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required to change email')
];

// Account deactivation validator
const accountDeactivationValidator = [
  body('password')
    .notEmpty()
    .withMessage('Password is required to deactivate account'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
    .escape(),

  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must be less than 1000 characters')
    .escape()
];

// Rate limiting bypass validator (for admin use)
const rateLimitBypassValidator = [
  body('bypassKey')
    .trim()
    .notEmpty()
    .withMessage('Bypass key is required')
    .isLength({ min: 32, max: 128 })
    .withMessage('Invalid bypass key format')
];

// Batch operations validator
const batchValidator = [
  body('userIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('User IDs must be an array with 1-100 items'),

  body('userIds.*')
    .isUUID()
    .withMessage('Each user ID must be a valid UUID'),

  body('action')
    .isIn(['activate', 'deactivate', 'verify_email', 'force_logout'])
    .withMessage('Invalid batch action'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
    .escape()
];

// Advanced security validators
const securityValidator = {
  // IP whitelist validator
  ipWhitelist: [
    body('ipAddresses')
      .isArray({ min: 1, max: 10 })
      .withMessage('IP addresses must be an array with 1-10 items'),

    body('ipAddresses.*')
      .isIP()
      .withMessage('Each item must be a valid IP address')
  ],

  // Security question validator
  securityQuestion: [
    body('question')
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage('Security question must be between 10 and 200 characters')
      .escape(),

    body('answer')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Security answer must be between 3 and 100 characters')
      .escape()
  ]
};

// Export all validators
module.exports = {
  // Basic authentication validators
  registerValidator,
  loginValidator,
  emailValidator,
  tokenValidator,
  passwordValidator,

  // Password management validators
  passwordResetRequestValidator,
  passwordResetValidator,
  changePasswordValidator,

  // Token management validators
  refreshTokenValidator,

  // Profile management validators
  updateProfileValidator,
  usernameValidator,
  emailChangeValidator,

  // Session management validators
  sessionValidator,
  deviceValidator,

  // Query validators
  queryValidator,
  statsQueryValidator,

  // Two-factor authentication validators
  twoFactorValidator,

  // Account management validators
  accountDeactivationValidator,

  // Admin validators
  rateLimitBypassValidator,
  batchValidator,

  // Security validators
  securityValidator,

  // Custom validation helpers
  customValidators
};
