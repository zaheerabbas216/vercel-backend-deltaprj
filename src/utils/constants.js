/**
 * Application Constants for Delta-2 Backend
 *
 * Centralized constants for the entire application including
 * error codes, status values, validation rules, and system defaults.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

// =============================================================================
// HTTP STATUS CODES
// =============================================================================
const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

// =============================================================================
// ERROR CODES
// =============================================================================
const ERROR_CODES = {
  // General Errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE: 'DUPLICATE_RESOURCE',
  OPERATION_FAILED: 'OPERATION_FAILED',

  // Authentication Errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  TOKEN_MISSING: 'TOKEN_MISSING',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  PASSWORD_EXPIRED: 'PASSWORD_EXPIRED',

  // Authorization Errors
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
  ROLE_REQUIRED: 'ROLE_REQUIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',

  // User Management Errors
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS: 'USERNAME_ALREADY_EXISTS',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_MISMATCH: 'PASSWORD_MISMATCH',
  WEAK_PASSWORD: 'WEAK_PASSWORD',

  // Database Errors
  DATABASE_ERROR: 'DATABASE_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  QUERY_ERROR: 'QUERY_ERROR',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  FOREIGN_KEY_VIOLATION: 'FOREIGN_KEY_VIOLATION',

  // File Upload Errors
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // External Service Errors
  EMAIL_SERVICE_ERROR: 'EMAIL_SERVICE_ERROR',
  SMS_SERVICE_ERROR: 'SMS_SERVICE_ERROR',
  PAYMENT_SERVICE_ERROR: 'PAYMENT_SERVICE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR'
};

// =============================================================================
// USER ROLES
// =============================================================================
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MANAGER: 'manager',
  EMPLOYEE: 'employee',
  CUSTOMER: 'customer',
  GUEST: 'guest'
};

// =============================================================================
// USER PERMISSIONS
// =============================================================================
const PERMISSIONS = {
  // User Management
  USERS_CREATE: 'users:create',
  USERS_READ: 'users:read',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',
  USERS_LIST: 'users:list',

  // Role Management
  ROLES_CREATE: 'roles:create',
  ROLES_READ: 'roles:read',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',
  ROLES_ASSIGN: 'roles:assign',

  // Customer Management
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_LIST: 'customers:list',

  // Employee Management
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_READ: 'employees:read',
  EMPLOYEES_UPDATE: 'employees:update',
  EMPLOYEES_DELETE: 'employees:delete',
  EMPLOYEES_LIST: 'employees:list',

  // Order Management
  ORDERS_CREATE: 'orders:create',
  ORDERS_READ: 'orders:read',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_DELETE: 'orders:delete',
  ORDERS_LIST: 'orders:list',
  ORDERS_PROCESS: 'orders:process',
  ORDERS_CANCEL: 'orders:cancel',

  // Product Management
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_READ: 'products:read',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  PRODUCTS_LIST: 'products:list',
  INVENTORY_MANAGE: 'inventory:manage',

  // System Administration
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_LOGS: 'system:logs',
  SYSTEM_BACKUP: 'system:backup',
  SYSTEM_REPORTS: 'system:reports'
};

// =============================================================================
// USER STATUS
// =============================================================================
const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  PENDING: 'pending',
  DELETED: 'deleted'
};

// =============================================================================
// ORDER STATUS
// =============================================================================
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  RETURNED: 'returned',
  REFUNDED: 'refunded'
};

// =============================================================================
// PAYMENT STATUS
// =============================================================================
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded'
};

// =============================================================================
// EMPLOYEE STATUS
// =============================================================================
const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ON_LEAVE: 'on_leave',
  TERMINATED: 'terminated',
  SUSPENDED: 'suspended'
};

// =============================================================================
// CUSTOMER STATUS
// =============================================================================
const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  VIP: 'vip',
  BLOCKED: 'blocked',
  SUSPENDED: 'suspended'
};

// =============================================================================
// PRODUCT STATUS
// =============================================================================
const PRODUCT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DISCONTINUED: 'discontinued',
  OUT_OF_STOCK: 'out_of_stock',
  DRAFT: 'draft'
};

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================
const NOTIFICATION_TYPES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH: 'push',
  IN_APP: 'in_app',
  SYSTEM: 'system'
};

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================
const EMAIL_TEMPLATES = {
  // Authentication
  WELCOME: 'welcome',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  PASSWORD_CHANGED: 'password_changed',
  LOGIN_ALERT: 'login_alert',

  // Orders
  ORDER_CONFIRMATION: 'order_confirmation',
  ORDER_SHIPPED: 'order_shipped',
  ORDER_DELIVERED: 'order_delivered',
  ORDER_CANCELLED: 'order_cancelled',

  // System
  SYSTEM_ALERT: 'system_alert',
  MAINTENANCE_NOTICE: 'maintenance_notice'
};

// =============================================================================
// FILE TYPES
// =============================================================================
const FILE_TYPES = {
  // Images
  JPEG: 'image/jpeg',
  JPG: 'image/jpg',
  PNG: 'image/png',
  GIF: 'image/gif',
  WEBP: 'image/webp',

  // Documents
  PDF: 'application/pdf',
  DOC: 'application/msword',
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // Spreadsheets
  CSV: 'text/csv',
  XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  XLS: 'application/vnd.ms-excel'
};

// =============================================================================
// VALIDATION RULES
// =============================================================================
const VALIDATION_RULES = {
  // Password Requirements
  PASSWORD: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 128,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SYMBOLS: false
  },

  // Email
  EMAIL: {
    MAX_LENGTH: 254,
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  // Names
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 50,
    PATTERN: /^[a-zA-Z\s'-]+$/
  },

  // Phone Numbers
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 15,
    PATTERN: /^\+?[1-9]\d{1,14}$/
  },

  // Product Code
  PRODUCT_CODE: {
    MIN_LENGTH: 3,
    MAX_LENGTH: 20,
    PATTERN: /^[A-Z0-9-_]+$/
  },

  // Order Number
  ORDER_NUMBER: {
    LENGTH: 12,
    PATTERN: /^[A-Z0-9]+$/
  }
};

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
  MIN_LIMIT: 1
};

// =============================================================================
// DATE FORMATS
// =============================================================================
const DATE_FORMATS = {
  ISO: 'DD-MMM-YYYYTHH:mm:ss.SSSZ',
  DATE_ONLY: 'DD-MMM-YYYY',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'DD/MMM/YYYY HH:mm:ss',
  FILENAME: 'DDMMMYYYY_HHmmss'
};

// =============================================================================
// LOG LEVELS
// =============================================================================
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  VERBOSE: 'verbose',
  DEBUG: 'debug',
  SILLY: 'silly'
};

// =============================================================================
// CACHE KEYS
// =============================================================================
const CACHE_KEYS = {
  USER_PROFILE: 'user:profile:',
  USER_PERMISSIONS: 'user:permissions:',
  PRODUCT_DETAILS: 'product:details:',
  ORDER_STATUS: 'order:status:',
  SYSTEM_CONFIG: 'system:config'
};

// =============================================================================
// CACHE TTL (Time To Live in seconds)
// =============================================================================
const CACHE_TTL = {
  SHORT: 300,      // 5 minutes
  MEDIUM: 1800,    // 30 minutes
  LONG: 3600,      // 1 hour
  VERY_LONG: 86400 // 24 hours
};

// =============================================================================
// RATE LIMITING
// =============================================================================
const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5
  },
  PASSWORD_RESET: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 3
  }
};

// =============================================================================
// SYSTEM DEFAULTS
// =============================================================================
const SYSTEM_DEFAULTS = {
  TIMEZONE: 'UTC',
  LANGUAGE: 'en',
  CURRENCY: 'USD',
  DATE_FORMAT: 'MM/DD/YYYY',
  TIME_FORMAT: '12h'
};

// =============================================================================
// REGEX PATTERNS
// =============================================================================
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[1-9]\d{1,14}$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// =============================================================================
// ENVIRONMENT TYPES
// =============================================================================
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
  TEST: 'test'
};

// =============================================================================
// SUPPORTED LOCALES
// =============================================================================
const LOCALES = {
  ENGLISH: 'en',
  SPANISH: 'es',
  FRENCH: 'fr',
  GERMAN: 'de',
  ITALIAN: 'it',
  PORTUGUESE: 'pt',
  CHINESE: 'zh',
  JAPANESE: 'ja'
};

// =============================================================================
// MIME TYPES
// =============================================================================
const MIME_TYPES = {
  JSON: 'application/json',
  XML: 'application/xml',
  HTML: 'text/html',
  TEXT: 'text/plain',
  CSV: 'text/csv',
  PDF: 'application/pdf',
  JPEG: 'image/jpeg',
  PNG: 'image/png',
  GIF: 'image/gif'
};
// List of allowed admin email domains
const COMMON_ALLOWED_DOMAINS = [
  'gmail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'protonmail.com',
  'proton.me',
  'icloud.com',
  'aol.com',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'fastmail.com',
  'tutanota.com',
  'mail.ru',
  'live.com',
  'msn.com',
  'me.com',
  'mac.com',
  // Search Engines
  'google.com',
  'bing.com',
  'duckduckgo.com',
  'yahoo.com',

  // Social Media
  'facebook.com',
  'twitter.com',
  'x.com',
  'instagram.com',
  'linkedin.com',
  'reddit.com',
  'pinterest.com',
  'tiktok.com',

  // Video & Media
  'youtube.com',
  'vimeo.com',
  'twitch.tv',
  'dailymotion.com',

  // News & Information
  'wikipedia.org',
  'bbc.com',
  'cnn.com',
  'nytimes.com',
  'reuters.com',
  'theguardian.com',

  // Technology & Development
  'github.com',
  'stackoverflow.com',
  'gitlab.com',
  'bitbucket.org',
  'npmjs.com',
  'pypi.org',

  // Cloud & Storage
  'dropbox.com',
  'drive.google.com',
  'onedrive.live.com',
  'box.com',
  'icloud.com',

  // E-commerce
  'amazon.com',
  'ebay.com',
  'etsy.com',
  'shopify.com',

  // Productivity
  'docs.google.com',
  'office.com',
  'notion.so',
  'trello.com',
  'slack.com',

  // Education
  'coursera.org',
  'udemy.com',
  'edx.org',
  'khanacademy.org',

  // Content Delivery Networks
  'cloudflare.com',
  'jsdelivr.net',
  'unpkg.com',
  'cdnjs.com'
];

// =============================================================================
// EXPORT ALL CONSTANTS
// =============================================================================
module.exports = {
  HTTP_STATUS,
  ERROR_CODES,
  USER_ROLES,
  PERMISSIONS,
  USER_STATUS,
  ORDER_STATUS,
  PAYMENT_STATUS,
  EMPLOYEE_STATUS,
  CUSTOMER_STATUS,
  PRODUCT_STATUS,
  NOTIFICATION_TYPES,
  EMAIL_TEMPLATES,
  FILE_TYPES,
  VALIDATION_RULES,
  PAGINATION,
  DATE_FORMATS,
  LOG_LEVELS,
  CACHE_KEYS,
  CACHE_TTL,
  RATE_LIMITS,
  SYSTEM_DEFAULTS,
  REGEX_PATTERNS,
  ENVIRONMENTS,
  LOCALES,
  MIME_TYPES,
  COMMON_ALLOWED_DOMAINS
};
