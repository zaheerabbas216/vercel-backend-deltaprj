/**
 * File: src/schemas/common/baseSchema.js
 * Base Yup Validation Schemas
 *
 * This file contains common validation rules that can be reused across the application.
 * These are building blocks for more complex validation schemas.
 *
 * For beginners:
 * - Yup is a schema validation library that checks if data matches expected formats
 * - These base schemas define common rules like email format, password strength, etc.
 * - Other validation files will import and use these base rules
 * - This prevents code duplication and ensures consistent validation across the app
 */

const yup = require('yup');

/**
 * Email validation schema
 * Validates email format and common requirements
 */
const emailSchema = yup
  .string()
  .trim()
  .lowercase() // Convert to lowercase automatically
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .required('Email is required')
  .test('no-disposable', 'Disposable email addresses are not allowed', (value) => {
    if (!value) return true; // Let required() handle empty values

    // List of common disposable email domains to block
    const disposableDomains = [
      '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
      'mailinator.com', 'throwaway.email', 'temp-mail.org'
    ];

    const domain = value.split('@')[1];
    return !disposableDomains.includes(domain?.toLowerCase());
  });

/**
 * Password validation schema
 * Enforces strong password requirements
 */
const passwordSchema = yup
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(128, 'Password must be less than 128 characters')
  .required('Password is required')
  .test('password-strength', 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character', (value) => {
    if (!value) return true; // Let required() handle empty values

    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);

    return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  })
  .test('no-common-passwords', 'Password is too common. Please choose a more secure password', (value) => {
    if (!value) return true;

    // List of common passwords to reject
    const commonPasswords = [
      'password', '12345678', 'qwerty123', 'abc123456', 'password123',
      'admin123', 'letmein123', 'welcome123', '123456789', 'password1'
    ];

    return !commonPasswords.includes(value.toLowerCase());
  });

/**
 * Password confirmation schema
 * Validates that password confirmation matches the original password
 */
const passwordConfirmSchema = yup
  .string()
  .required('Password confirmation is required')
  .oneOf([yup.ref('password')], 'Passwords must match');

/**
 * Name validation schema (for first name, last name, etc.)
 * Validates human names with reasonable constraints
 */
const nameSchema = yup
  .string()
  .trim()
  .min(1, 'Name must be at least 1 character')
  .max(100, 'Name must be less than 100 characters')
  .matches(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods')
  .test('no-only-spaces', 'Name cannot contain only spaces', (value) => {
    return !value || value.trim().length > 0;
  });

/**
 * Username validation schema
 * Validates username format and availability
 */
const usernameSchema = yup
  .string()
  .trim()
  .lowercase()
  .min(3, 'Username must be at least 3 characters')
  .max(50, 'Username must be less than 50 characters')
  .matches(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
  .test('no-leading-underscore', 'Username cannot start with an underscore', (value) => {
    return !value || !value.startsWith('_');
  })
  .test('no-trailing-underscore', 'Username cannot end with an underscore', (value) => {
    return !value || !value.endsWith('_');
  })
  .test('no-double-underscore', 'Username cannot contain consecutive underscores', (value) => {
    return !value || !value.includes('__');
  });

/**
 * Phone number validation schema
 * Validates international phone number formats
 */
const phoneSchema = yup
  .string()
  .trim()
  .matches(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters');

/**
 * URL validation schema
 * Validates URL format for things like avatar URLs, website links, etc.
 */
const urlSchema = yup
  .string()
  .trim()
  .url('Please enter a valid URL')
  .max(500, 'URL must be less than 500 characters');

/**
 * ID validation schema
 * Validates database ID fields (positive integers)
 */
const idSchema = yup
  .number()
  .integer('ID must be a whole number')
  .positive('ID must be a positive number')
  .required('ID is required');

/**
 * Optional ID validation schema
 * For cases where ID might be null/undefined
 */
const optionalIdSchema = yup
  .number()
  .integer('ID must be a whole number')
  .positive('ID must be a positive number')
  .nullable()
  .transform((value, originalValue) => {
    // Transform empty string to null
    return originalValue === '' ? null : value;
  });

/**
 * Boolean validation schema
 * Validates boolean fields with proper transformation
 */
const booleanSchema = yup
  .boolean()
  .transform((value, originalValue) => {
    // Handle string boolean values from forms
    if (typeof originalValue === 'string') {
      return originalValue.toLowerCase() === 'true';
    }
    return value;
  });

/**
 * Date validation schema
 * Validates date inputs with reasonable constraints
 */
const dateSchema = yup
  .date()
  .max(new Date(), 'Date cannot be in the future')
  .min(new Date('1900-01-01'), 'Date must be after 1900');

/**
 * Future date validation schema
 * For dates that should be in the future (like expiration dates)
 */
const futureDateSchema = yup
  .date()
  .min(new Date(), 'Date must be in the future');

/**
 * Search query validation schema
 * For search inputs and query parameters
 */
const searchQuerySchema = yup
  .string()
  .trim()
  .min(1, 'Search query must be at least 1 character')
  .max(100, 'Search query must be less than 100 characters')
  .matches(/^[a-zA-Z0-9\s\-_.@]+$/, 'Search query contains invalid characters');

/**
 * Pagination validation schemas
 * For page number and page size validation
 */
const pageSchema = yup
  .number()
  .integer('Page must be a whole number')
  .min(1, 'Page must be at least 1')
  .default(1)
  .transform((value, originalValue) => {
    return originalValue === '' ? 1 : value;
  });

const pageSizeSchema = yup
  .number()
  .integer('Page size must be a whole number')
  .min(1, 'Page size must be at least 1')
  .max(100, 'Page size must be 100 or less')
  .default(10)
  .transform((value, originalValue) => {
    return originalValue === '' ? 10 : value;
  });

/**
 * Sort order validation schema
 * For sorting parameters (asc/desc)
 */
const sortOrderSchema = yup
  .string()
  .oneOf(['asc', 'desc'], 'Sort order must be either "asc" or "desc"')
  .default('asc');

/**
 * Color code validation schema
 * For hex color codes like #FF5722
 */
const colorCodeSchema = yup
  .string()
  .trim()
  .matches(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #FF5722)')
  .uppercase(); // Convert to uppercase

/**
 * JSON validation schema
 * For validating JSON string inputs
 */
const jsonSchema = yup
  .string()
  .test('is-json', 'Must be valid JSON', (value) => {
    if (!value) return true; // Allow empty values

    try {
      JSON.parse(value);
      return true;
    } catch (error) {
      return false;
    }
  })
  .transform((value) => {
    // Parse JSON string to object
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  });

/**
 * Text content validation schema
 * For longer text content like descriptions, comments, etc.
 */
const textContentSchema = yup
  .string()
  .trim()
  .max(1000, 'Text must be less than 1000 characters')
  .test('no-only-spaces', 'Text cannot contain only spaces', (value) => {
    return !value || value.trim().length > 0;
  });

/**
 * Timezone validation schema
 * Validates timezone identifiers
 */
const timezoneSchema = yup
  .string()
  .oneOf([
    'UTC', 'America/New_York', 'America/Los_Angeles', 'America/Chicago',
    'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai',
    'Asia/Kolkata', 'Australia/Sydney', 'Pacific/Auckland'
  ], 'Please select a valid timezone')
  .default('UTC');

/**
 * Language code validation schema
 * Validates ISO language codes
 */
const languageSchema = yup
  .string()
  .oneOf(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi'], 'Please select a valid language')
  .default('en');

/**
 * Common validation messages
 * Standardized error messages for consistency
 */
const validationMessages = {
  required: 'This field is required',
  invalid: 'This field is invalid',
  tooShort: 'This field is too short',
  tooLong: 'This field is too long',
  invalidFormat: 'This field has an invalid format',
  mustMatch: 'Fields must match',
  notAllowed: 'This value is not allowed'
};

/**
 * Custom validation methods
 * Reusable validation functions for complex scenarios
 */
const customValidations = {
  /**
     * Check if a string is a strong password
     */
  isStrongPassword: (password) => {
    if (!password) return false;

    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  },

  /**
     * Check if an email domain is allowed
     */
  isAllowedEmailDomain: (email, allowedDomains = []) => {
    if (!email || allowedDomains.length === 0) return true;

    const domain = email.split('@')[1]?.toLowerCase();
    return allowedDomains.includes(domain);
  },

  /**
     * Sanitize input string (remove potentially harmful content)
     */
  sanitizeString: (str) => {
    if (!str) return str;

    return str
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }
};

module.exports = {
  // Basic validation schemas
  emailSchema,
  passwordSchema,
  passwordConfirmSchema,
  nameSchema,
  usernameSchema,
  phoneSchema,
  urlSchema,

  // ID and number schemas
  idSchema,
  optionalIdSchema,
  booleanSchema,

  // Date schemas
  dateSchema,
  futureDateSchema,

  // Search and pagination schemas
  searchQuerySchema,
  pageSchema,
  pageSizeSchema,
  sortOrderSchema,

  // Content schemas
  textContentSchema,
  colorCodeSchema,
  jsonSchema,

  // Localization schemas
  timezoneSchema,
  languageSchema,

  // Utilities
  validationMessages,
  customValidations
};
