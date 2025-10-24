/**
 * File: src/schemas/auth/passwordSchema.js
 * Password Management Validation Schemas
 *
 * This file contains Yup validation schemas for password-related operations.
 * It validates password changes, resets, and security operations.
 *
 * For beginners:
 * - These schemas validate operations like changing password, resetting password, etc.
 * - We ensure current passwords are correct and new passwords meet security requirements
 * - We validate password reset tokens and expiration times
 * - This maintains security while allowing legitimate password operations
 */

const yup = require('yup');
const { emailSchema, passwordSchema, passwordConfirmSchema, idSchema } = require('../common/baseSchema');

/**
 * Change password validation schema
 * For users changing their own passwords while logged in
 */
const changePasswordSchema = yup.object().shape({
  // Current password verification
  currentPassword: yup
    .string()
    .min(1, 'Current password is required')
    .max(128, 'Password is too long')
    .required('Current password is required')
    .label('Current Password'),

  // New password with strength requirements
  newPassword: passwordSchema
    .label('New Password')
    .test('different-from-current', 'New password must be different from current password', function (value) {
      const { currentPassword } = this.parent;
      return !value || !currentPassword || value !== currentPassword;
    }),

  // New password confirmation
  confirmNewPassword: yup
    .string()
    .required('Password confirmation is required')
    .oneOf([yup.ref('newPassword')], 'Password confirmation must match new password')
    .label('Confirm New Password'),

  // Optional: User ID (for admin-initiated password changes)
  userId: yup
    .number()
    .integer('User ID must be a whole number')
    .positive('User ID must be positive')
    .nullable()
    .label('User ID'),

  // Security: Require session validation for sensitive operation
  sessionToken: yup
    .string()
    .min(32, 'Invalid session token')
    .nullable()
    .label('Session Token')
});

/**
 * Password reset request validation schema
 * For initiating password reset via email
 */
const passwordResetRequestSchema = yup.object().shape({
  // Email address to send reset link to
  email: emailSchema
    .label('Email'),

  // Optional: Captcha token for bot protection
  captchaToken: yup
    .string()
    .nullable()
    .label('Captcha Token'),

  // Client information for security tracking
  clientInfo: yup
    .object()
    .shape({
      ipAddress: yup
        .string()
        .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address')
        .required('IP address is required'),

      userAgent: yup
        .string()
        .trim()
        .max(500, 'User agent must be less than 500 characters')
        .nullable()
    })
    .nullable()
    .label('Client Information')
});

/**
 * Password reset completion validation schema
 * For completing password reset with token
 */
const passwordResetCompleteSchema = yup.object().shape({
  // Reset token from email link
  token: yup
    .string()
    .min(32, 'Invalid reset token')
    .max(255, 'Reset token is too long')
    .required('Reset token is required')
    .label('Reset Token'),

  // Email address (for additional verification)
  email: emailSchema
    .label('Email'),

  // New password
  newPassword: passwordSchema
    .label('New Password'),

  // Password confirmation
  confirmNewPassword: passwordConfirmSchema
    .label('Confirm New Password'),

  // Client information for security
  clientInfo: yup
    .object()
    .shape({
      ipAddress: yup
        .string()
        .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address')
        .required('IP address is required'),

      userAgent: yup
        .string()
        .trim()
        .max(500, 'User agent must be less than 500 characters')
        .nullable()
    })
    .required('Client information is required')
    .label('Client Information')
});

/**
 * Password reset token validation schema
 * For validating reset tokens before showing reset form
 */
const passwordResetTokenValidationSchema = yup.object().shape({
  // Reset token to validate
  token: yup
    .string()
    .min(32, 'Invalid reset token format')
    .max(255, 'Reset token is too long')
    .required('Reset token is required')
    .label('Reset Token'),

  // Optional email for additional verification
  email: emailSchema
    .nullable()
    .label('Email')
});

/**
 * Admin password reset validation schema
 * For administrators resetting user passwords
 */
const adminPasswordResetSchema = yup.object().shape({
  // Target user ID
  userId: idSchema
    .label('User ID'),

  // New password (optional - can be generated)
  newPassword: passwordSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('New Password'),

  // Whether to generate a temporary password
  generateTemporaryPassword: yup
    .boolean()
    .default(false)
    .label('Generate Temporary Password'),

  // Whether user must change password on next login
  forcePasswordChange: yup
    .boolean()
    .default(true)
    .label('Force Password Change'),

  // Whether to send email notification to user
  notifyUser: yup
    .boolean()
    .default(true)
    .label('Notify User'),

  // Admin reason for password reset
  reason: yup
    .string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(500, 'Reason must be less than 500 characters')
    .required('Reason for password reset is required')
    .label('Reset Reason'),

  // Admin performing the reset
  adminUserId: idSchema
    .label('Admin User ID')
});

/**
 * Password strength validation schema
 * For checking password strength without full validation
 */
const passwordStrengthSchema = yup.object().shape({
  // Password to check
  password: yup
    .string()
    .required('Password is required for strength check')
    .label('Password'),

  // Optional: Current user ID to check against password history
  userId: yup
    .number()
    .integer('User ID must be a whole number')
    .positive('User ID must be positive')
    .nullable()
    .label('User ID')
});

/**
 * Password policy validation schema
 * For validating against organizational password policies
 */
const passwordPolicySchema = yup.object().shape({
  // Password to validate
  password: yup
    .string()
    .required('Password is required')
    .label('Password'),

  // Policy settings
  policy: yup
    .object()
    .shape({
      minLength: yup
        .number()
        .integer()
        .min(8, 'Minimum length must be at least 8')
        .max(64, 'Minimum length cannot exceed 64')
        .default(8),

      maxLength: yup
        .number()
        .integer()
        .min(64, 'Maximum length must be at least 64')
        .max(256, 'Maximum length cannot exceed 256')
        .default(128),

      requireUppercase: yup.boolean().default(true),
      requireLowercase: yup.boolean().default(true),
      requireNumbers: yup.boolean().default(true),
      requireSpecialChars: yup.boolean().default(true),

      minSpecialChars: yup
        .number()
        .integer()
        .min(0)
        .max(10)
        .default(1),

      preventCommonPasswords: yup.boolean().default(true),
      preventPersonalInfo: yup.boolean().default(true),
      preventRepeatingChars: yup.boolean().default(true),

      maxRepeatingChars: yup
        .number()
        .integer()
        .min(2)
        .max(5)
        .default(3)
    })
    .default({})
    .label('Password Policy'),

  // Optional user information for personal info checking
  userInfo: yup
    .object()
    .shape({
      firstName: yup.string().trim().nullable(),
      lastName: yup.string().trim().nullable(),
      email: yup.string().email().nullable(),
      username: yup.string().trim().nullable(),
      birthDate: yup.date().nullable()
    })
    .nullable()
    .label('User Information')
});

/**
 * Bulk password reset validation schema
 * For resetting passwords for multiple users
 */
const bulkPasswordResetSchema = yup.object().shape({
  // Array of user IDs or emails
  users: yup
    .array()
    .of(
      yup.object().shape({
        userId: yup
          .number()
          .integer('User ID must be a whole number')
          .positive('User ID must be positive')
          .nullable(),

        email: emailSchema
          .nullable(),

        // At least one identifier required
        test: yup.mixed().test('has-identifier', 'Either userId or email is required', function () {
          const { userId, email } = this.parent;
          return userId || email;
        })
      })
    )
    .min(1, 'At least one user is required')
    .max(100, 'Cannot reset passwords for more than 100 users at once')
    .required('Users array is required')
    .label('Users'),

  // Whether to generate temporary passwords
  generateTemporaryPasswords: yup
    .boolean()
    .default(true)
    .label('Generate Temporary Passwords'),

  // Whether users must change password on next login
  forcePasswordChange: yup
    .boolean()
    .default(true)
    .label('Force Password Change'),

  // Whether to send email notifications
  notifyUsers: yup
    .boolean()
    .default(true)
    .label('Notify Users'),

  // Reason for bulk reset
  reason: yup
    .string()
    .trim()
    .min(10, 'Reason must be at least 10 characters')
    .max(1000, 'Reason must be less than 1000 characters')
    .required('Reason for bulk password reset is required')
    .label('Reset Reason'),

  // Admin performing the bulk reset
  adminUserId: idSchema
    .label('Admin User ID')
});

/**
 * Password expiration validation schema
 * For handling password expiration policies
 */
const passwordExpirationSchema = yup.object().shape({
  // User ID
  userId: idSchema
    .label('User ID'),

  // Days until expiration
  daysUntilExpiration: yup
    .number()
    .integer('Days must be a whole number')
    .min(0, 'Days cannot be negative')
    .max(365, 'Days cannot exceed 365')
    .nullable()
    .label('Days Until Expiration'),

  // Whether to extend expiration
  extendExpiration: yup
    .boolean()
    .default(false)
    .label('Extend Expiration'),

  // Extension period in days
  extensionDays: yup
    .number()
    .integer('Extension days must be a whole number')
    .min(1, 'Extension must be at least 1 day')
    .max(90, 'Extension cannot exceed 90 days')
    .when('extendExpiration', {
      is: true,
      then: (schema) => schema.required('Extension days required when extending expiration'),
      otherwise: (schema) => schema.nullable()
    })
    .label('Extension Days')
});

/**
 * Password history validation schema
 * For preventing password reuse
 */
const passwordHistorySchema = yup.object().shape({
  // User ID
  userId: idSchema
    .label('User ID'),

  // New password to check against history
  newPassword: passwordSchema
    .label('New Password'),

  // Number of previous passwords to check against
  historyCount: yup
    .number()
    .integer('History count must be a whole number')
    .min(1, 'History count must be at least 1')
    .max(24, 'History count cannot exceed 24')
    .default(5)
    .label('History Count')
});

/**
 * Password validation helpers and utilities
 */
const passwordValidationHelpers = {
  /**
     * Calculate password strength score (0-100)
     */
  calculatePasswordStrength: (password) => {
    if (!password) return 0;

    let score = 0;

    // Length scoring
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // Character type scoring
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/\d/.test(password)) score += 15;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;

    // Complexity bonuses
    const charTypes = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    ].filter(Boolean).length;

    if (charTypes >= 3) score += 5;
    if (charTypes === 4) score += 5;

    // Penalty for common patterns
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeating characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Sequential characters
    if (/password|admin|login/i.test(password)) score -= 20; // Common words

    return Math.max(0, Math.min(100, score));
  },

  /**
     * Get password strength label
     */
  getPasswordStrengthLabel: (score) => {
    if (score < 30) return { label: 'Weak', color: 'red' };
    if (score < 60) return { label: 'Fair', color: 'orange' };
    if (score < 80) return { label: 'Good', color: 'yellow' };
    if (score < 95) return { label: 'Strong', color: 'green' };
    return { label: 'Very Strong', color: 'darkgreen' };
  },

  /**
     * Check if password contains personal information
     */
  containsPersonalInfo: (password, userInfo = {}) => {
    if (!password || !userInfo) return false;

    const lowerPassword = password.toLowerCase();
    const { firstName, lastName, email, username, birthDate } = userInfo;

    // Check name components
    if (firstName && lowerPassword.includes(firstName.toLowerCase())) return true;
    if (lastName && lowerPassword.includes(lastName.toLowerCase())) return true;

    // Check email parts
    if (email) {
      const emailParts = email.toLowerCase().split('@')[0];
      if (lowerPassword.includes(emailParts)) return true;
    }

    // Check username
    if (username && lowerPassword.includes(username.toLowerCase())) return true;

    // Check birth year
    if (birthDate) {
      const birthYear = new Date(birthDate).getFullYear().toString();
      if (lowerPassword.includes(birthYear)) return true;
    }

    return false;
  },

  /**
     * Generate temporary password
     */
  generateTemporaryPassword: (length = 12) => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '!@#$%&*';

    let password = '';

    // Ensure at least one of each type
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // Fill remaining length
    const allChars = uppercase + lowercase + numbers + symbols;
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  },

  /**
     * Validate password against policy
     */
  validatePasswordPolicy: (password, policy = {}) => {
    const errors = [];

    const {
      minLength = 8,
      maxLength = 128,
      requireUppercase = true,
      requireLowercase = true,
      requireNumbers = true,
      requireSpecialChars = true,
      minSpecialChars = 1,
      preventCommonPasswords = true,
      maxRepeatingChars = 3
    } = policy;

    // Length checks
    if (password.length < minLength) {
      errors.push(`Password must be at least ${minLength} characters long`);
    }

    if (password.length > maxLength) {
      errors.push(`Password must be less than ${maxLength} characters long`);
    }

    // Character type checks
    if (requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (requireSpecialChars) {
      const specialCharCount = (password.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
      if (specialCharCount < minSpecialChars) {
        errors.push(`Password must contain at least ${minSpecialChars} special character(s)`);
      }
    }

    // Common password check
    if (preventCommonPasswords) {
      const commonPasswords = [
        'password', '12345678', 'qwerty123', 'abc123456', 'password123',
        'admin123', 'letmein123', 'welcome123', '123456789', 'password1'
      ];

      if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more secure password');
      }
    }

    // Repeating characters check
    const repeatingRegex = new RegExp(`(.)\\1{${maxRepeatingChars - 1},}`, 'g');
    if (repeatingRegex.test(password)) {
      errors.push(`Password cannot contain more than ${maxRepeatingChars} consecutive identical characters`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  },

  /**
     * Check if password reset token is valid format
     */
  isValidResetToken: (token) => {
    if (!token || typeof token !== 'string') return false;

    // Check for common token formats
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const base64Regex = /^[A-Za-z0-9+/]{32,}={0,2}$/;
    const hexRegex = /^[0-9a-fA-F]{32,}$/;

    return uuidRegex.test(token) || base64Regex.test(token) || hexRegex.test(token);
  }
};

module.exports = {
  // Password change schemas
  changePasswordSchema,
  adminPasswordResetSchema,
  bulkPasswordResetSchema,

  // Password reset schemas
  passwordResetRequestSchema,
  passwordResetCompleteSchema,
  passwordResetTokenValidationSchema,

  // Policy and validation schemas
  passwordStrengthSchema,
  passwordPolicySchema,
  passwordHistorySchema,
  passwordExpirationSchema,

  // Helper functions
  passwordValidationHelpers
};
