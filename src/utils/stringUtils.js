/**
 * String Utilities for Delta-2 Backend
 *
 * Comprehensive string manipulation and formatting utilities
 * for consistent text processing across the application.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const crypto = require('crypto');

// =============================================================================
// CASE CONVERSION
// =============================================================================

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string} camelCase string
 */
const toCamelCase = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * Convert string to PascalCase
 * @param {string} str - Input string
 * @returns {string} PascalCase string
 */
const toPascalCase = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => {
      return word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

/**
 * Convert string to snake_case
 * @param {string} str - Input string
 * @returns {string} snake_case string
 */
const toSnakeCase = (str) => {
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('_');
};

/**
 * Convert string to kebab-case
 * @param {string} str - Input string
 * @returns {string} kebab-case string
 */
const toKebabCase = (str) => {
  return str
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .join('-');
};

/**
 * Convert string to CONSTANT_CASE
 * @param {string} str - Input string
 * @returns {string} CONSTANT_CASE string
 */
const toConstantCase = (str) => {
  return toSnakeCase(str).toUpperCase();
};

/**
 * Convert string to Title Case
 * @param {string} str - Input string
 * @returns {string} Title Case string
 */
const toTitleCase = (str) => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * Convert string to Sentence case
 * @param {string} str - Input string
 * @returns {string} Sentence case string
 */
const toSentenceCase = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

// =============================================================================
// STRING MANIPULATION
// =============================================================================

/**
 * Truncate string to specified length
 * @param {string} str - Input string
 * @param {number} maxLength - Maximum length
 * @param {string} suffix - Suffix to append
 * @returns {string} Truncated string
 */
const truncate = (str, maxLength = 100, suffix = '...') => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Truncate string by words
 * @param {string} str - Input string
 * @param {number} maxWords - Maximum number of words
 * @param {string} suffix - Suffix to append
 * @returns {string} Truncated string
 */
const truncateWords = (str, maxWords = 20, suffix = '...') => {
  const words = str.split(' ');
  if (words.length <= maxWords) {
    return str;
  }
  return words.slice(0, maxWords).join(' ') + suffix;
};

/**
 * Pad string to specified length
 * @param {string} str - Input string
 * @param {number} length - Target length
 * @param {string} padChar - Character to pad with
 * @param {string} direction - Padding direction ('left', 'right', 'both')
 * @returns {string} Padded string
 */
const pad = (str, length, padChar = ' ', direction = 'right') => {
  const padLength = length - str.length;
  if (padLength <= 0) return str;

  const padding = padChar.repeat(Math.ceil(padLength / padChar.length));

  switch (direction) {
    case 'left':
      return padding.substring(0, padLength) + str;
    case 'both':
      const leftPadLength = Math.floor(padLength / 2);
      const rightPadLength = padLength - leftPadLength;
      return padding.substring(0, leftPadLength) + str + padding.substring(0, rightPadLength);
    default: // 'right'
      return str + padding.substring(0, padLength);
  }
};

/**
 * Reverse a string
 * @param {string} str - Input string
 * @returns {string} Reversed string
 */
const reverse = (str) => {
  return str.split('').reverse().join('');
};

/**
 * Repeat string specified number of times
 * @param {string} str - Input string
 * @param {number} count - Number of repetitions
 * @param {string} separator - Separator between repetitions
 * @returns {string} Repeated string
 */
const repeat = (str, count, separator = '') => {
  return Array(count).fill(str).join(separator);
};

/**
 * Remove whitespace from both ends
 * @param {string} str - Input string
 * @returns {string} Trimmed string
 */
const trim = (str) => {
  return str.trim();
};

/**
 * Remove whitespace from left end
 * @param {string} str - Input string
 * @returns {string} Left-trimmed string
 */
const trimLeft = (str) => {
  return str.replace(/^\s+/, '');
};

/**
 * Remove whitespace from right end
 * @param {string} str - Input string
 * @returns {string} Right-trimmed string
 */
const trimRight = (str) => {
  return str.replace(/\s+$/, '');
};

/**
 * Remove extra whitespace between words
 * @param {string} str - Input string
 * @returns {string} Normalized string
 */
const normalizeWhitespace = (str) => {
  return str.replace(/\s+/g, ' ').trim();
};

// =============================================================================
// STRING VALIDATION AND CHECKING
// =============================================================================

/**
 * Check if string is empty or only whitespace
 * @param {string} str - Input string
 * @returns {boolean} True if empty or whitespace only
 */
const isEmpty = (str) => {
  return !str || str.trim().length === 0;
};

/**
 * Check if string is alphanumeric
 * @param {string} str - Input string
 * @returns {boolean} True if alphanumeric
 */
const isAlphanumeric = (str) => {
  return /^[a-zA-Z0-9]+$/.test(str);
};

/**
 * Check if string is alpha only
 * @param {string} str - Input string
 * @returns {boolean} True if alpha only
 */
const isAlpha = (str) => {
  return /^[a-zA-Z]+$/.test(str);
};

/**
 * Check if string is numeric
 * @param {string} str - Input string
 * @returns {boolean} True if numeric
 */
const isNumeric = (str) => {
  return /^\d+$/.test(str);
};

/**
 * Check if string is a valid integer
 * @param {string} str - Input string
 * @returns {boolean} True if valid integer
 */
const isInteger = (str) => {
  return /^-?\d+$/.test(str);
};

/**
 * Check if string is a valid float
 * @param {string} str - Input string
 * @returns {boolean} True if valid float
 */
const isFloat = (str) => {
  return /^-?\d+(\.\d+)?$/.test(str);
};

/**
 * Check if string contains only uppercase letters
 * @param {string} str - Input string
 * @returns {boolean} True if all uppercase
 */
const isUpperCase = (str) => {
  return str === str.toUpperCase();
};

/**
 * Check if string contains only lowercase letters
 * @param {string} str - Input string
 * @returns {boolean} True if all lowercase
 */
const isLowerCase = (str) => {
  return str === str.toLowerCase();
};

/**
 * Check if string starts with specified substring
 * @param {string} str - Input string
 * @param {string} searchString - Substring to search for
 * @param {boolean} ignoreCase - Ignore case comparison
 * @returns {boolean} True if starts with substring
 */
const startsWith = (str, searchString, ignoreCase = false) => {
  const haystack = ignoreCase ? str.toLowerCase() : str;
  const needle = ignoreCase ? searchString.toLowerCase() : searchString;
  return haystack.startsWith(needle);
};

/**
 * Check if string ends with specified substring
 * @param {string} str - Input string
 * @param {string} searchString - Substring to search for
 * @param {boolean} ignoreCase - Ignore case comparison
 * @returns {boolean} True if ends with substring
 */
const endsWith = (str, searchString, ignoreCase = false) => {
  const haystack = ignoreCase ? str.toLowerCase() : str;
  const needle = ignoreCase ? searchString.toLowerCase() : searchString;
  return haystack.endsWith(needle);
};

/**
 * Check if string contains substring
 * @param {string} str - Input string
 * @param {string} searchString - Substring to search for
 * @param {boolean} ignoreCase - Ignore case comparison
 * @returns {boolean} True if contains substring
 */
const contains = (str, searchString, ignoreCase = false) => {
  const haystack = ignoreCase ? str.toLowerCase() : str;
  const needle = ignoreCase ? searchString.toLowerCase() : searchString;
  return haystack.includes(needle);
};

// =============================================================================
// STRING FORMATTING
// =============================================================================

/**
 * Create slug from string (URL-friendly)
 * @param {string} str - Input string
 * @param {Object} options - Slug options
 * @returns {string} Slug string
 */
const slugify = (str, options = {}) => {
  const defaults = {
    replacement: '-',
    remove: /[*+~.()'"!:@]/g,
    lower: true,
    strict: false,
    locale: 'en'
  };

  const opts = { ...defaults, ...options };

  let slug = str
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-zA-Z0-9\s-]/g, opts.strict ? '' : opts.replacement)
    .replace(/\s+/g, opts.replacement)
    .replace(new RegExp(`\\${opts.replacement}+`, 'g'), opts.replacement);

  if (opts.remove) {
    slug = slug.replace(opts.remove, '');
  }

  if (opts.lower) {
    slug = slug.toLowerCase();
  }

  return slug.replace(/^-+|-+$/g, ''); // Trim dashes
};

/**
 * Format string with placeholders
 * @param {string} template - Template string with {key} placeholders
 * @param {Object} values - Values to replace placeholders
 * @returns {string} Formatted string
 */
const format = (template, values) => {
  return template.replace(/{([^}]+)}/g, (match, key) => {
    return values.hasOwnProperty(key) ? values[key] : match;
  });
};

/**
 * Format number with thousands separator
 * @param {number|string} num - Number to format
 * @param {string} separator - Thousands separator
 * @returns {string} Formatted number string
 */
const formatNumber = (num, separator = ',') => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, separator);
};

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted currency string
 */
const formatCurrency = (amount, currency = 'INR', decimals = 2) => {
  const formatted = amount.toFixed(decimals);
  return `${currency}${formatNumber(formatted)}`;
};

/**
 * Format percentage
 * @param {number} value - Value to format as percentage
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
const formatPercentage = (value, decimals = 1) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @param {number} decimals - Number of decimal places
 * @returns {string} Human readable file size
 */
const formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// =============================================================================
// STRING EXTRACTION AND PARSING
// =============================================================================

/**
 * Extract all URLs from string
 * @param {string} str - Input string
 * @returns {Array} Array of URLs found
 */
const extractUrls = (str) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return str.match(urlRegex) || [];
};

/**
 * Extract all email addresses from string
 * @param {string} str - Input string
 * @returns {Array} Array of email addresses found
 */
const extractEmails = (str) => {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  return str.match(emailRegex) || [];
};

/**
 * Extract all phone numbers from string
 * @param {string} str - Input string
 * @returns {Array} Array of phone numbers found
 */
const extractPhoneNumbers = (str) => {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  return str.match(phoneRegex) || [];
};

/**
 * Extract hashtags from string
 * @param {string} str - Input string
 * @returns {Array} Array of hashtags found
 */
const extractHashtags = (str) => {
  const hashtagRegex = /#\w+/g;
  return str.match(hashtagRegex) || [];
};

/**
 * Extract mentions from string
 * @param {string} str - Input string
 * @returns {Array} Array of mentions found
 */
const extractMentions = (str) => {
  const mentionRegex = /@\w+/g;
  return str.match(mentionRegex) || [];
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string
 * @returns {Object} Parsed query object
 */
const parseQueryString = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params) {
    result[key] = value;
  }
  return result;
};

/**
 * Convert object to query string
 * @param {Object} obj - Object to convert
 * @returns {string} Query string
 */
const objectToQueryString = (obj) => {
  return Object.keys(obj)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(obj[key])}`)
    .join('&');
};

// =============================================================================
// HTML AND ENCODING
// =============================================================================

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped HTML string
 */
const escapeHtml = (str) => {
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;'
  };

  return str.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char]);
};

/**
 * Unescape HTML entities
 * @param {string} str - String to unescape
 * @returns {string} Unescaped string
 */
const unescapeHtml = (str) => {
  const htmlUnescapes = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x2F;': '/'
  };

  return str.replace(/&(amp|lt|gt|quot|#39|#x2F);/g, (entity) => htmlUnescapes[entity]);
};

/**
 * Strip HTML tags from string
 * @param {string} str - HTML string
 * @returns {string} Plain text string
 */
const stripHtmlTags = (str) => {
  return str.replace(/<[^>]*>/g, '');
};

/**
 * Encode string to Base64
 * @param {string} str - String to encode
 * @returns {string} Base64 encoded string
 */
const encodeBase64 = (str) => {
  return Buffer.from(str, 'utf8').toString('base64');
};

/**
 * Decode Base64 string
 * @param {string} str - Base64 string to decode
 * @returns {string} Decoded string
 */
const decodeBase64 = (str) => {
  return Buffer.from(str, 'base64').toString('utf8');
};

/**
 * URL encode string
 * @param {string} str - String to encode
 * @returns {string} URL encoded string
 */
const urlEncode = (str) => {
  return encodeURIComponent(str);
};

/**
 * URL decode string
 * @param {string} str - String to decode
 * @returns {string} URL decoded string
 */
const urlDecode = (str) => {
  return decodeURIComponent(str);
};

// =============================================================================
// RANDOM STRING GENERATION
// =============================================================================

/**
 * Generate random string
 * @param {number} length - Length of string
 * @param {string} charset - Character set to use
 * @returns {string} Random string
 */
const random = (length = 10, charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') => {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return result;
};

/**
 * Generate random alphanumeric string
 * @param {number} length - Length of string
 * @returns {string} Random alphanumeric string
 */
const randomAlphanumeric = (length = 10) => {
  return random(length, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
};

/**
 * Generate random alphabetic string
 * @param {number} length - Length of string
 * @returns {string} Random alphabetic string
 */
const randomAlpha = (length = 10) => {
  return random(length, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
};

/**
 * Generate random numeric string
 * @param {number} length - Length of string
 * @returns {string} Random numeric string
 */
const randomNumeric = (length = 10) => {
  return random(length, '0123456789');
};

/**
 * Generate secure random string using crypto
 * @param {number} length - Length of string
 * @returns {string} Secure random string
 */
const randomSecure = (length = 32) => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

// =============================================================================
// WORD AND SENTENCE UTILITIES
// =============================================================================

/**
 * Count words in string
 * @param {string} str - Input string
 * @returns {number} Word count
 */
const wordCount = (str) => {
  return str.trim().split(/\s+/).filter(word => word.length > 0).length;
};

/**
 * Count sentences in string
 * @param {string} str - Input string
 * @returns {number} Sentence count
 */
const sentenceCount = (str) => {
  return str.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
};

/**
 * Get first word from string
 * @param {string} str - Input string
 * @returns {string} First word
 */
const firstWord = (str) => {
  return str.trim().split(/\s+/)[0] || '';
};

/**
 * Get last word from string
 * @param {string} str - Input string
 * @returns {string} Last word
 */
const lastWord = (str) => {
  const words = str.trim().split(/\s+/);
  return words[words.length - 1] || '';
};

/**
 * Capitalize first letter of string
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Uncapitalize first letter of string
 * @param {string} str - Input string
 * @returns {string} Uncapitalized string
 */
const uncapitalize = (str) => {
  return str.charAt(0).toLowerCase() + str.slice(1);
};

module.exports = {
  // Case conversion
  toCamelCase,
  toPascalCase,
  toSnakeCase,
  toKebabCase,
  toConstantCase,
  toTitleCase,
  toSentenceCase,

  // String manipulation
  truncate,
  truncateWords,
  pad,
  reverse,
  repeat,
  trim,
  trimLeft,
  trimRight,
  normalizeWhitespace,

  // Validation and checking
  isEmpty,
  isAlphanumeric,
  isAlpha,
  isNumeric,
  isInteger,
  isFloat,
  isUpperCase,
  isLowerCase,
  startsWith,
  endsWith,
  contains,

  // Formatting
  slugify,
  format,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatFileSize,

  // Extraction and parsing
  extractUrls,
  extractEmails,
  extractPhoneNumbers,
  extractHashtags,
  extractMentions,
  parseQueryString,
  objectToQueryString,

  // HTML and encoding
  escapeHtml,
  unescapeHtml,
  stripHtmlTags,
  encodeBase64,
  decodeBase64,
  urlEncode,
  urlDecode,

  // Random string generation
  random,
  randomAlphanumeric,
  randomAlpha,
  randomNumeric,
  randomSecure,

  // Word and sentence utilities
  wordCount,
  sentenceCount,
  firstWord,
  lastWord,
  capitalize,
  uncapitalize
};
