/**
 * File: src/schemas/auth/loginSchema.js
 * Login Validation Schemas
 *
 * This file contains Yup validation schemas for user login operations.
 * It validates login credentials, remember me options, and related fields.
 *
 * For beginners:
 * - These schemas validate the data users send when trying to log in
 * - We check that email and password are provided and in correct format
 * - We also validate optional fields like "remember me" and device information
 * - This prevents invalid data from reaching our database and improves security
 */

const yup = require('yup');
const { emailSchema, booleanSchema, textContentSchema } = require('../common/baseSchema');

/**
 * Basic login validation schema
 * Validates email and password for user authentication
 */
const loginSchema = yup.object().shape({
  // User email address
  email: emailSchema
    .label('Email'),

  // User password (we don't validate strength on login - only format)
  password: yup
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long')
    .required('Password is required')
    .label('Password'),

  // Remember me option (extends session duration)
  rememberMe: booleanSchema
    .default(false)
    .label('Remember Me'),

  // Optional device information for session tracking
  deviceName: yup
    .string()
    .trim()
    .max(100, 'Device name must be less than 100 characters')
    .nullable()
    .transform((value, originalValue) => {
      // Transform empty string to null
      return originalValue === '' ? null : value;
    })
    .label('Device Name'),

  // Device type for session categorization
  deviceType: yup
    .string()
    .oneOf(['web', 'mobile', 'tablet', 'desktop', 'api'], 'Invalid device type')
    .default('web')
    .label('Device Type')
});

/**
 * Admin login validation schema
 * Enhanced validation for administrative logins
 */
const adminLoginSchema = yup.object().shape({
  // Admin email (must be from allowed domains)
  email: emailSchema
    .test('admin-domain', 'Only organizational email addresses are allowed for admin login', (value) => {
      if (!value) return true; // Let required validation handle this

      // List of allowed admin email domains
      const allowedDomains = [
        'company.com', 'admin.company.com', 'internal.company.com'
      ];


      const domain = value.split('@')[1]?.toLowerCase();
      return allowedDomains.includes(domain);
    })
    .label('Admin Email'),

  // Admin password
  password: yup
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long')
    .required('Password is required')
    .label('Password'),

  // Admin logins don't support remember me for security
  rememberMe: yup
    .boolean()
    .test('no-remember-admin', 'Remember me is not allowed for admin accounts', (value) => {
      return !value; // Must be false
    })
    .default(false)
    .label('Remember Me'),

  // Security token for admin 2FA (if implemented)
  securityToken: yup
    .string()
    .trim()
    .matches(/^\d{6}$/, 'Security token must be 6 digits')
    .nullable()
    .label('Security Token'),

  deviceName: yup
    .string()
    .trim()
    .max(100, 'Device name must be less than 100 characters')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Device Name'),

  deviceType: yup
    .string()
    .oneOf(['web', 'desktop', 'api'], 'Admin login only supports web, desktop, or API access')
    .default('web')
    .label('Device Type')
});

/**
 * API login validation schema
 * For API-based authentication (service accounts, integrations)
 */
const apiLoginSchema = yup.object().shape({
  // API key or service account email
  apiKey: yup
    .string()
    .trim()
    .matches(/^[a-zA-Z0-9_-]{32,}$/, 'Invalid API key format')
    .required('API key is required')
    .label('API Key'),

  // API secret
  apiSecret: yup
    .string()
    .min(32, 'API secret must be at least 32 characters')
    .required('API secret is required')
    .label('API Secret'),

  // Optional scope for API access
  scope: yup
    .string()
    .trim()
    .max(200, 'Scope must be less than 200 characters')
    .matches(/^[a-zA-Z0-9:_\-\s,]+$/, 'Scope contains invalid characters')
    .nullable()
    .label('Scope')
});

/**
 * Login rate limiting validation schema
 * Validates data for login attempt tracking
 */
const loginAttemptSchema = yup.object().shape({
  // Email address attempting login
  email: emailSchema
    .label('Email'),

  // IP address making the attempt
  ipAddress: yup
    .string()
    .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address format')
    .required('IP address is required')
    .label('IP Address'),

  // Success or failure
  success: booleanSchema
    .required('Success status is required')
    .label('Success'),

  // Failure reason (if applicable)
  failureReason: yup
    .string()
    .oneOf([
      'invalid_credentials',
      'account_locked',
      'account_disabled',
      'email_not_verified',
      'too_many_attempts',
      'invalid_2fa',
      'expired_password'
    ], 'Invalid failure reason')
    .when('success', {
      is: false,
      then: (schema) => schema.required('Failure reason is required when login fails'),
      otherwise: (schema) => schema.nullable()
    })
    .label('Failure Reason'),

  // User agent string
  userAgent: textContentSchema
    .nullable()
    .label('User Agent')
});

/**
 * Session validation schema
 * For validating session data during login
 */
const sessionValidationSchema = yup.object().shape({
  // Session token
  sessionToken: yup
    .string()
    .min(32, 'Session token must be at least 32 characters')
    .required('Session token is required')
    .label('Session Token'),

  // User ID
  userId: yup
    .number()
    .integer('User ID must be a whole number')
    .positive('User ID must be positive')
    .required('User ID is required')
    .label('User ID'),

  // Session expiration
  expiresAt: yup
    .date()
    .min(new Date(), 'Session must expire in the future')
    .required('Session expiration is required')
    .label('Expires At'),

  // IP address
  ipAddress: yup
    .string()
    .matches(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address format')
    .required('IP address is required')
    .label('IP Address')
});

/**
 * Password-only validation schema
 * For scenarios where we only need to validate password (password change, etc.)
 */
const passwordOnlySchema = yup.object().shape({
  password: yup
    .string()
    .min(1, 'Password is required')
    .max(128, 'Password is too long')
    .required('Password is required')
    .label('Current Password')
});

/**
 * Login context validation schema
 * For additional context information during login
 */
const loginContextSchema = yup.object().shape({
  // Optional login context (mobile app, web browser, etc.)
  context: yup
    .string()
    .oneOf(['web', 'mobile_app', 'desktop_app', 'api', 'admin_panel'], 'Invalid login context')
    .default('web')
    .label('Login Context'),

  // Optional client version
  clientVersion: yup
    .string()
    .trim()
    .max(50, 'Client version must be less than 50 characters')
    .matches(/^[\d\.]+$/, 'Client version must be in format like 1.2.3')
    .nullable()
    .label('Client Version'),

  // Optional referrer URL
  referrer: yup
    .string()
    .trim()
    .url('Referrer must be a valid URL')
    .max(500, 'Referrer URL must be less than 500 characters')
    .nullable()
    .label('Referrer')
});

/**
 * Login validation with captcha
 * For scenarios requiring captcha verification
 */
const loginWithCaptchaSchema = loginSchema.shape({
  // Google reCAPTCHA token
  captchaToken: yup
    .string()
    .min(1, 'Captcha verification is required')
    .required('Please complete the captcha verification')
    .label('Captcha Token')
});

/**
 * Logout validation schema
 * For validating logout requests
 */
const logoutSchema = yup.object().shape({
  // Session token to invalidate
  sessionToken: yup
    .string()
    .min(32, 'Invalid session token')
    .required('Session token is required')
    .label('Session Token'),

  // Logout from all devices option
  logoutFromAllDevices: booleanSchema
    .default(false)
    .label('Logout From All Devices'),

  // Optional logout reason
  logoutReason: yup
    .string()
    .oneOf(['user_request', 'security', 'admin_action', 'session_expired'], 'Invalid logout reason')
    .default('user_request')
    .label('Logout Reason')
});

/**
 * Custom validation functions for login scenarios
 */
const loginValidationHelpers = {
  /**
     * Validate if login attempt should be allowed based on rate limiting
     */
  validateLoginAttempt: async (email, ipAddress) => {
    // This would integrate with rate limiting logic
    // For now, it's a placeholder for the validation structure
    return {
      allowed: true,
      remainingAttempts: 5,
      lockoutTime: null
    };
  },

  /**
     * Validate session token format
     */
  isValidSessionToken: (token) => {
    if (!token || typeof token !== 'string') return false;

    // JWT tokens or UUID-based tokens
    const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return jwtRegex.test(token) || uuidRegex.test(token);
  },

  /**
     * Sanitize device name input
     */
  sanitizeDeviceName: (deviceName) => {
    if (!deviceName) return null;

    return deviceName
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML
      .substring(0, 100); // Limit length
  }
};

module.exports = {
  // Main login schemas
  loginSchema,
  adminLoginSchema,
  apiLoginSchema,

  // Specialized schemas
  loginAttemptSchema,
  sessionValidationSchema,
  passwordOnlySchema,
  loginContextSchema,
  loginWithCaptchaSchema,
  logoutSchema,

  // Helper functions
  loginValidationHelpers
};
