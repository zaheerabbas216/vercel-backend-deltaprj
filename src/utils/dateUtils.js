/**
 * Helper Utilities for Delta-2 Backend
 *
 * Collection of utility functions for common operations throughout the application.
 * Includes validation, formatting, encryption, and other helper methods.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const { REGEX_PATTERNS, VALIDATION_RULES } = require('./constants');

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Generate a random string
 * @param {number} length - Length of the string
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
const generateRandomString = (length = 32, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Convert string to slug format
 * @param {string} text - Text to convert
 * @returns {string} Slug format string
 */
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

/**
 * Capitalize first letter of each word
 * @param {string} text - Text to capitalize
 * @returns {string} Title case string
 */
const toTitleCase = (text) => {
  return text.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
};

/**
 * Truncate text to specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to append
 * @returns {string} Truncated text
 */
const truncateText = (text, maxLength = 100, suffix = '...') => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Remove HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} Plain text
 */
const stripHtmlTags = (html) => {
  return html.replace(/<[^>]*>/g, '');
};

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
const isValidEmail = (email) => {
  return REGEX_PATTERNS.EMAIL.test(email);
};

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone
 */
const isValidPhone = (phone) => {
  return REGEX_PATTERNS.PHONE.test(phone);
};

/**
 * Validate UUID format
 * @param {string} uuid - UUID to validate
 * @returns {boolean} True if valid UUID
 */
const isValidUUID = (uuid) => {
  return REGEX_PATTERNS.UUID.test(uuid);
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
const isValidURL = (url) => {
  return REGEX_PATTERNS.URL.test(url);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {Object} Validation result with strength score
 */
const validatePassword = (password) => {
  const result = {
    isValid: false,
    score: 0,
    requirements: {
      minLength: password.length >= VALIDATION_RULES.PASSWORD.MIN_LENGTH,
      maxLength: password.length <= VALIDATION_RULES.PASSWORD.MAX_LENGTH,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSymbols: /[^A-Za-z0-9]/.test(password)
    },
    feedback: []
  };

  // Calculate score
  Object.values(result.requirements).forEach(req => {
    if (req) result.score++;
  });

  // Check if valid based on requirements
  result.isValid = result.requirements.minLength &&
        result.requirements.maxLength &&
        (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE ? result.requirements.hasUppercase : true) &&
        (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE ? result.requirements.hasLowercase : true) &&
        (VALIDATION_RULES.PASSWORD.REQUIRE_NUMBERS ? result.requirements.hasNumbers : true) &&
        (VALIDATION_RULES.PASSWORD.REQUIRE_SYMBOLS ? result.requirements.hasSymbols : true);

  // Generate feedback
  if (!result.requirements.minLength) {
    result.feedback.push(`Password must be at least ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} characters long`);
  }
  if (!result.requirements.hasUppercase && VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE) {
    result.feedback.push('Password must contain at least one uppercase letter');
  }
  if (!result.requirements.hasLowercase && VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE) {
    result.feedback.push('Password must contain at least one lowercase letter');
  }
  if (!result.requirements.hasNumbers && VALIDATION_RULES.PASSWORD.REQUIRE_NUMBERS) {
    result.feedback.push('Password must contain at least one number');
  }
  if (!result.requirements.hasSymbols && VALIDATION_RULES.PASSWORD.REQUIRE_SYMBOLS) {
    result.feedback.push('Password must contain at least one special character');
  }

  return result;
};

// =============================================================================
// ENCRYPTION AND HASHING
// =============================================================================

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @param {number} rounds - Salt rounds
 * @returns {Promise<string>} Hashed password
 */
const hashPassword = async (password, rounds = 12) => {
  return await bcrypt.hash(password, rounds);
};

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if passwords match
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate secure random token
 * @param {number} bytes - Number of bytes
 * @returns {string} Random token
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Encrypt text using AES-256-GCM
 * @param {string} text - Text to encrypt
 * @param {string} key - Encryption key
 * @returns {Object} Encrypted data with iv and tag
 */
const encryptText = (text, key) => {
  const algorithm = 'aes-256-gcm';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipher(algorithm, key);
  cipher.setAAD(Buffer.from('additional-data'));

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  };
};

/**
 * Decrypt text using AES-256-GCM
 * @param {Object} encryptedData - Encrypted data object
 * @param {string} key - Decryption key
 * @returns {string} Decrypted text
 */
const decryptText = (encryptedData, key) => {
  const algorithm = 'aes-256-gcm';
  const decipher = crypto.createDecipher(algorithm, key);
  decipher.setAAD(Buffer.from('additional-data'));
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};

// =============================================================================
// DATE AND TIME UTILITIES
// =============================================================================

/**
 * Get current timestamp in ISO format
 * @returns {string} ISO timestamp
 */
const getCurrentTimestamp = () => {
  return new Date().toISOString();
};

/**
 * Format date to specified format
 * @param {Date|string} date - Date to format
 * @param {string} format - Moment.js format string
 * @returns {string} Formatted date
 */
const formatDate = (date, format = 'YYYY-MM-DD HH:mm:ss') => {
  return moment(date).format(format);
};

/**
 * Get date difference in specified unit
 * @param {Date|string} date1 - First date
 * @param {Date|string} date2 - Second date
 * @param {string} unit - Unit of difference (days, hours, minutes, etc.)
 * @returns {number} Difference in specified unit
 */
const getDateDifference = (date1, date2, unit = 'days') => {
  return moment(date1).diff(moment(date2), unit);
};

/**
 * Check if date is in the past
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in the past
 */
const isDateInPast = (date) => {
  return moment(date).isBefore(moment());
};

/**
 * Add time to date
 * @param {Date|string} date - Base date
 * @param {number} amount - Amount to add
 * @param {string} unit - Unit of time to add
 * @returns {Date} New date
 */
const addTimeToDate = (date, amount, unit) => {
  return moment(date).add(amount, unit).toDate();
};

// =============================================================================
// ARRAY AND OBJECT UTILITIES
// =============================================================================

/**
 * Remove duplicates from array
 * @param {Array} array - Array with potential duplicates
 * @param {string} key - Key to use for object arrays
 * @returns {Array} Array without duplicates
 */
const removeDuplicates = (array, key = null) => {
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
  }
  return [...new Set(array)];
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Check if object is empty
 * @param {Object} obj - Object to check
 * @returns {boolean} True if object is empty
 */
const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (typeof obj === 'string' || Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

/**
 * Get nested object value safely
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Value at path or default value
 */
const getNestedValue = (obj, path, defaultValue = null) => {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === null || current === undefined || !current.hasOwnProperty(key)) {
      return defaultValue;
    }
    current = current[key];
  }

  return current;
};

/**
 * Set nested object value
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 * @returns {Object} Modified object
 */
const setNestedValue = (obj, path, value) => {
  const keys = path.split('.');
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return obj;
};

// =============================================================================
// FILE SYSTEM UTILITIES
// =============================================================================

/**
 * Create directories recursively
 * @param {Array|string} directories - Directory paths to create
 */
const createDirectories = (directories) => {
  const dirs = Array.isArray(directories) ? directories : [directories];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
};

/**
 * Check if file exists
 * @param {string} filePath - Path to file
 * @returns {boolean} True if file exists
 */
const fileExists = (filePath) => {
  return fs.existsSync(filePath);
};

/**
 * Get file extension
 * @param {string} filename - Filename
 * @returns {string} File extension
 */
const getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @param {string} directory - Target directory
 * @returns {string} Unique filename
 */
const generateUniqueFilename = (originalName, directory = '') => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName);
  const baseName = path.basename(originalName, extension);

  return `${baseName}_${timestamp}_${random}${extension}`;
};

// =============================================================================
// PAGINATION UTILITIES
// =============================================================================

/**
 * Calculate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @returns {Object} Pagination metadata
 */
const calculatePagination = (page, limit, totalItems) => {
  const currentPage = Math.max(1, parseInt(page) || 1);
  const itemsPerPage = Math.max(1, parseInt(limit) || 10);
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const offset = (currentPage - 1) * itemsPerPage;

  return {
    currentPage,
    itemsPerPage,
    totalItems,
    totalPages,
    offset,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    nextPage: currentPage < totalPages ? currentPage + 1 : null,
    previousPage: currentPage > 1 ? currentPage - 1 : null
  };
};

// =============================================================================
// MISCELLANEOUS UTILITIES
// =============================================================================

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after specified time
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Result of function or throws last error
 */
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }
};

/**
 * Generate UUID v4
 * @returns {string} UUID v4
 */
const generateUUID = () => {
  return uuidv4();
};

/**
 * Mask sensitive data
 * @param {string} data - Data to mask
 * @param {number} visibleChars - Number of visible characters at start/end
 * @param {string} maskChar - Character to use for masking
 * @returns {string} Masked data
 */
const maskSensitiveData = (data, visibleChars = 4, maskChar = '*') => {
  if (data.length <= visibleChars * 2) {
    return maskChar.repeat(data.length);
  }

  const start = data.substring(0, visibleChars);
  const end = data.substring(data.length - visibleChars);
  const middle = maskChar.repeat(data.length - visibleChars * 2);

  return `${start}${middle}${end}`;
};

module.exports = {
  // String utilities
  generateRandomString,
  slugify,
  toTitleCase,
  truncateText,
  stripHtmlTags,
  escapeHtml,

  // Validation utilities
  isValidEmail,
  isValidPhone,
  isValidUUID,
  isValidURL,
  validatePassword,

  // Encryption and hashing
  hashPassword,
  comparePassword,
  generateSecureToken,
  encryptText,
  decryptText,

  // Date and time utilities
  getCurrentTimestamp,
  formatDate,
  getDateDifference,
  isDateInPast,
  addTimeToDate,

  // Array and object utilities
  removeDuplicates,
  deepClone,
  isEmpty,
  getNestedValue,
  setNestedValue,

  // File system utilities
  createDirectories,
  fileExists,
  getFileExtension,
  generateUniqueFilename,

  // Pagination utilities
  calculatePagination,

  // Miscellaneous utilities
  sleep,
  retryWithBackoff,
  generateUUID,
  maskSensitiveData
};
