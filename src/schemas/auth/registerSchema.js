/**
 * File: src/schemas/auth/registerSchema.js
 * User Registration Validation Schemas
 *
 * This file contains Yup validation schemas for user registration operations.
 * It validates user signup data, profile information, and account creation fields.
 *
 * For beginners:
 * - These schemas validate the data when new users sign up for accounts
 * - We check that all required fields are provided and properly formatted
 * - We validate password strength, email uniqueness, and terms acceptance
 * - This ensures only valid user data gets stored in our database
 */

const yup = require('yup');
const {
  emailSchema,
  passwordSchema,
  passwordConfirmSchema,
  nameSchema,
  usernameSchema,
  phoneSchema,
  booleanSchema,
  timezoneSchema,
  languageSchema
} = require('../common/baseSchema');

/**
 * Basic user registration validation schema
 * For standard user account creation
 */
const registerSchema = yup.object().shape({
  // Required personal information
  firstName: nameSchema
    .required('First name is required')
    .label('First Name'),

  lastName: nameSchema
    .required('Last name is required')
    .label('Last Name'),

  // Email address (must be unique)
  email: emailSchema
    .label('Email'),

  // Optional username (must be unique if provided)
  username: usernameSchema
    .nullable()
    .transform((value, originalValue) => {
      // Transform empty string to null
      return originalValue === '' ? null : value;
    })
    .test('username-availability', 'This username is already taken', (value) => {
      if (!value) return true; // Username is optional

      // TODO: This would integrate with database check
      // For now, we'll check against some reserved usernames
      const reservedUsernames = [
        'admin', 'administrator', 'root', 'system', 'support',
        'help', 'info', 'contact', 'sales', 'marketing',
        'api', 'www', 'mail', 'email', 'test', 'demo'
      ];

      return !reservedUsernames.includes(value.toLowerCase());
    })
    .label('Username'),

  // Strong password requirement
  password: passwordSchema
    .label('Password'),

  // Password confirmation
  passwordConfirm: passwordConfirmSchema
    .label('Confirm Password'),

  // Optional phone number
  phone: phoneSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Phone Number'),

  // User preferences
  timezone: timezoneSchema
    .label('Timezone'),

  language: languageSchema
    .label('Language'),

  // Legal agreements
  agreeToTerms: booleanSchema
    .oneOf([true], 'You must agree to the Terms of Service')
    .required('You must agree to the Terms of Service')
    .label('Terms of Service Agreement'),

  agreeToPrivacy: booleanSchema
    .oneOf([true], 'You must agree to the Privacy Policy')
    .required('You must agree to the Privacy Policy')
    .label('Privacy Policy Agreement'),

  // Optional marketing consent
  agreeToMarketing: booleanSchema
    .default(false)
    .label('Marketing Communications'),

  // Registration source tracking
  source: yup
    .string()
    .oneOf(['website', 'mobile_app', 'referral', 'social', 'advertisement', 'other'], 'Invalid registration source')
    .default('website')
    .label('Registration Source'),

  // Optional referral code
  referralCode: yup
    .string()
    .trim()
    .matches(/^[A-Z0-9]{6,12}$/, 'Referral code must be 6-12 characters and contain only letters and numbers')
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Referral Code')
});

/**
 * Quick registration schema
 * For simplified signup flows (social login, minimal info)
 */
const quickRegisterSchema = yup.object().shape({
  // Basic required info
  email: emailSchema
    .label('Email'),

  firstName: nameSchema
    .required('First name is required')
    .label('First Name'),

  lastName: nameSchema
    .required('Last name is required')
    .label('Last Name'),

  // Optional password (might be generated or set later)
  password: passwordSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Password'),

  // Required legal agreements
  agreeToTerms: booleanSchema
    .oneOf([true], 'You must agree to the Terms of Service')
    .required('You must agree to the Terms of Service')
    .label('Terms Agreement'),

  // Registration source
  source: yup
    .string()
    .oneOf(['social', 'invitation', 'quick_signup'], 'Invalid registration source')
    .default('quick_signup')
    .label('Registration Source'),

  // Social provider info (if applicable)
  socialProvider: yup
    .string()
    .oneOf(['google', 'facebook', 'github', 'linkedin'], 'Invalid social provider')
    .nullable()
    .label('Social Provider'),

  socialId: yup
    .string()
    .trim()
    .max(100, 'Social ID must be less than 100 characters')
    .nullable()
    .when('socialProvider', {
      is: (value) => value !== null,
      then: (schema) => schema.required('Social ID is required when using social login'),
      otherwise: (schema) => schema.nullable()
    })
    .label('Social ID')
});

/**
 * Admin registration schema
 * For creating administrative accounts
 */
const adminRegisterSchema = yup.object().shape({
  // Admin personal info
  firstName: nameSchema
    .required('First name is required')
    .label('First Name'),

  lastName: nameSchema
    .required('Last name is required')
    .label('Last Name'),

  // Admin email (restricted domains)
  email: emailSchema
    .test('admin-domain', 'Admin accounts must use organizational email addresses', (value) => {
      if (!value) return true;

      const allowedDomains = [
        'company.com', 'admin.company.com', 'internal.company.com'
      ];

      const domain = value.split('@')[1]?.toLowerCase();
      return allowedDomains.includes(domain);
    })
    .label('Admin Email'),

  // Strong password required for admins
  password: passwordSchema
    .min(12, 'Admin password must be at least 12 characters')
    .test('admin-password-complexity', 'Admin password must contain at least 2 special characters', (value) => {
      if (!value) return true;

      const specialCharCount = (value.match(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/g) || []).length;
      return specialCharCount >= 2;
    })
    .label('Admin Password'),

  passwordConfirm: passwordConfirmSchema
    .label('Confirm Password'),

  // Admin role assignment
  adminRole: yup
    .string()
    .oneOf(['super_admin', 'admin', 'moderator'], 'Invalid admin role')
    .required('Admin role is required')
    .label('Admin Role'),

  // Department/team assignment
  department: yup
    .string()
    .trim()
    .min(2, 'Department must be at least 2 characters')
    .max(50, 'Department must be less than 50 characters')
    .required('Department is required')
    .label('Department'),

  // Employee ID or staff number
  employeeId: yup
    .string()
    .trim()
    .matches(/^[A-Z0-9]{4,10}$/, 'Employee ID must be 4-10 characters and contain only letters and numbers')
    .required('Employee ID is required')
    .label('Employee ID'),

  // Legal agreements
  agreeToTerms: booleanSchema
    .oneOf([true], 'You must agree to the Terms of Service')
    .required('Terms agreement is required')
    .label('Terms Agreement'),

  agreeToAdminPolicy: booleanSchema
    .oneOf([true], 'You must agree to the Admin Policy')
    .required('Admin policy agreement is required')
    .label('Admin Policy Agreement'),

  // Creator information
  createdBy: yup
    .number()
    .integer('Creator ID must be a whole number')
    .positive('Creator ID must be positive')
    .required('Creator information is required')
    .label('Created By')
});

/**
 * Employee registration schema
 * For creating employee accounts
 */
const employeeRegisterSchema = yup.object().shape({
  // Personal information
  firstName: nameSchema
    .required('First name is required')
    .label('First Name'),

  lastName: nameSchema
    .required('Last name is required')
    .label('Last Name'),

  email: emailSchema
    .label('Work Email'),

  phone: phoneSchema
    .required('Phone number is required for employees')
    .label('Phone Number'),

  // Employment information
  employeeId: yup
    .string()
    .trim()
    .matches(/^[A-Z0-9]{4,10}$/, 'Employee ID must be 4-10 characters')
    .required('Employee ID is required')
    .label('Employee ID'),

  department: yup
    .string()
    .trim()
    .min(2, 'Department must be at least 2 characters')
    .max(50, 'Department must be less than 50 characters')
    .required('Department is required')
    .label('Department'),

  position: yup
    .string()
    .trim()
    .min(2, 'Position must be at least 2 characters')
    .max(100, 'Position must be less than 100 characters')
    .required('Position is required')
    .label('Position'),

  startDate: yup
    .date()
    .max(new Date(), 'Start date cannot be in the future')
    .required('Start date is required')
    .label('Start Date'),

  // Manager information
  managerId: yup
    .number()
    .integer('Manager ID must be a whole number')
    .positive('Manager ID must be positive')
    .nullable()
    .label('Manager ID'),

  // Optional password (might be set later or generated)
  password: passwordSchema
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === '' ? null : value;
    })
    .label('Password'),

  // Temporary password flag
  useTemporaryPassword: booleanSchema
    .default(false)
    .label('Use Temporary Password'),

  // Legal agreements
  agreeToTerms: booleanSchema
    .oneOf([true], 'Employee must agree to terms')
    .required('Terms agreement is required')
    .label('Terms Agreement'),

  agreeToEmployeeHandbook: booleanSchema
    .oneOf([true], 'Employee must agree to handbook')
    .required('Employee handbook agreement is required')
    .label('Employee Handbook Agreement')
});

/**
 * Bulk user registration schema
 * For importing multiple users at once
 */
const bulkRegisterSchema = yup.object().shape({
  // Array of user data
  users: yup
    .array()
    .of(
      yup.object().shape({
        firstName: nameSchema.required('First name is required'),
        lastName: nameSchema.required('Last name is required'),
        email: emailSchema,
        phone: phoneSchema.nullable(),
        department: yup.string().trim().max(50).nullable(),
        position: yup.string().trim().max(100).nullable(),
        employeeId: yup.string().trim().matches(/^[A-Z0-9]{4,10}$/).nullable(),
        role: yup.string().oneOf(['employee', 'admin', 'manager']).default('employee')
      })
    )
    .min(1, 'At least one user is required')
    .max(100, 'Cannot import more than 100 users at once')
    .required('Users array is required')
    .test('unique-emails', 'All email addresses must be unique', (users) => {
      if (!users) return true;

      const emails = users.map(user => user.email?.toLowerCase()).filter(Boolean);
      const uniqueEmails = new Set(emails);

      return emails.length === uniqueEmails.size;
    })
    .label('Users'),

  // Default settings for all users
  defaultTimezone: timezoneSchema
    .label('Default Timezone'),

  defaultLanguage: languageSchema
    .label('Default Language'),

  sendWelcomeEmails: booleanSchema
    .default(true)
    .label('Send Welcome Emails'),

  requirePasswordChange: booleanSchema
    .default(true)
    .label('Require Password Change')
});

/**
 * Registration validation with captcha
 * For scenarios requiring bot protection
 */
const registerWithCaptchaSchema = registerSchema.shape({
  // Google reCAPTCHA token
  captchaToken: yup
    .string()
    .min(1, 'Captcha verification is required')
    .required('Please complete the captcha verification')
    .label('Captcha Token')
});

/**
 * Email verification schema
 * For validating email verification tokens
 */
const emailVerificationSchema = yup.object().shape({
  // Verification token
  token: yup
    .string()
    .min(32, 'Invalid verification token')
    .required('Verification token is required')
    .label('Verification Token'),

  // Email being verified
  email: emailSchema
    .label('Email')
});

/**
 * Registration validation helpers
 */
const registrationValidationHelpers = {
  /**
     * Check if email domain is allowed for registration
     */
  isAllowedEmailDomain: (email, allowedDomains = []) => {
    if (allowedDomains.length === 0) return true;

    const domain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(domain);
  },

  /**
     * Check if username is available
     * This would integrate with database check
     */
  isUsernameAvailable: async (username) => {
    // TODO: Implement database check
    const reservedUsernames = [
      'admin', 'administrator', 'root', 'system', 'support',
      'help', 'info', 'contact', 'sales', 'marketing'
    ];

    return !reservedUsernames.includes(username.toLowerCase());
  },

  /**
     * Generate temporary password for employee accounts
     */
  generateTemporaryPassword: () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let result = '';

    // Ensure at least one of each type
    result += 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(Math.random() * 23)]; // uppercase
    result += 'abcdefghijkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]; // lowercase
    result += '23456789'[Math.floor(Math.random() * 8)]; // number
    result += '!@#$%'[Math.floor(Math.random() * 5)]; // special

    // Add remaining characters
    for (let i = 4; i < 12; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    // Shuffle the result
    return result.split('').sort(() => Math.random() - 0.5).join('');
  },

  /**
     * Validate referral code format and existence
     */
  validateReferralCode: async (code) => {
    if (!code) return { valid: true };

    // TODO: Implement database check for referral code
    return {
      valid: /^[A-Z0-9]{6,12}$/.test(code),
      exists: true, // This would come from database
      referrerId: null // This would come from database
    };
  }
};

module.exports = {
  // Main registration schemas
  registerSchema,
  quickRegisterSchema,
  adminRegisterSchema,
  employeeRegisterSchema,
  bulkRegisterSchema,

  // Specialized schemas
  registerWithCaptchaSchema,
  emailVerificationSchema,

  // Helper functions
  registrationValidationHelpers
};
