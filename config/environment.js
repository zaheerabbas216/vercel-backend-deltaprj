/**
 * File: config/environment.js
 * Environment Configuration for Delta-2 Backend - MySQL2 Only
 *
 * Centralized configuration management for all application settings.
 * Loads and validates environment variables with sensible defaults.
 *
 * For beginners:
 * - This file manages all settings that change between environments
 * - Database type switching has been removed - MySQL2 only
 * - Environment variables are loaded from .env files
 * - Validation ensures required settings are present
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

require('dotenv').config();

// Helper function to parse boolean environment variables
const parseBoolean = (value, defaultValue = false) => {
  if (typeof value === 'undefined') return defaultValue;
  return value.toLowerCase() === 'true';
};

// Helper function to parse integer environment variables
const parseInteger = (value, defaultValue = 0) => {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Helper function to parse array from comma-separated string
const parseArray = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return value.split(',').map(item => item.trim());
};

const config = {
  // =============================================================================
  // APPLICATION CONFIGURATION
  // =============================================================================
  app: {
    name: process.env.APP_NAME || 'Delta-2 Backend',
    version: require('../package.json').version,
    environment: process.env.NODE_ENV || 'development',
    port: parseInteger(process.env.PORT, 3000),
    host: process.env.HOST || 'localhost',
    url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
    apiVersion: process.env.API_VERSION || 'v1'
  },

  // =============================================================================
  // DATABASE CONFIGURATION - MySQL2 ONLY
  // =============================================================================
  database: {
    // Connection settings
    host: process.env.DB_HOST || 'localhost',
    port: parseInteger(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'delta2_backend',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',

    // Character set and timezone
    charset: process.env.DB_CHARSET || 'utf8mb4',
    collation: process.env.DB_COLLATION || 'utf8mb4_unicode_ci',
    timezone: process.env.DB_TIMEZONE || '+00:00',

    // Connection pool settings
    pool: {
      connectionLimit: parseInteger(process.env.DB_CONNECTION_LIMIT, process.env.NODE_ENV === 'production' ? 20 : 10),
      acquireTimeout: parseInteger(process.env.DB_ACQUIRE_TIMEOUT, 60000),
      timeout: parseInteger(process.env.DB_TIMEOUT, 60000),
      reconnect: parseBoolean(process.env.DB_RECONNECT, true),
      queueLimit: parseInteger(process.env.DB_QUEUE_LIMIT, 0)
    },

    // SSL configuration
    ssl: process.env.DB_SSL === 'false' ? false : {
      rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, process.env.NODE_ENV === 'production'),
      ca: process.env.DB_SSL_CA || undefined,
      cert: process.env.DB_SSL_CERT || undefined,
      key: process.env.DB_SSL_KEY || undefined
    },

    // Query settings
    multipleStatements: parseBoolean(process.env.DB_MULTIPLE_STATEMENTS, false),
    dateStrings: parseBoolean(process.env.DB_DATE_STRINGS, false),
    debug: parseBoolean(process.env.DB_DEBUG, false) && process.env.NODE_ENV === 'development',
    trace: parseBoolean(process.env.DB_TRACE, false) && process.env.NODE_ENV === 'development',

    // Migration settings
    migrationsPath: process.env.DB_MIGRATIONS_PATH || './database/migrations',
    seedersPath: process.env.DB_SEEDERS_PATH || './database/seeders'
  },

  // =============================================================================
  // JWT AUTHENTICATION CONFIGURATION
  // =============================================================================
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: process.env.JWT_ALGORITHM || 'HS256',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    issuer: process.env.JWT_ISSUER || 'Delta-2 Backend',
    audience: process.env.JWT_AUDIENCE || 'Delta-2 Users'
  },

  // =============================================================================
  // PASSWORD & TOKEN CONFIGURATION
  // =============================================================================
  auth: {
    passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN || '15m',
    emailVerificationExpiresIn: process.env.EMAIL_VERIFICATION_EXPIRES_IN || '24h',
    bcryptRounds: parseInteger(process.env.BCRYPT_ROUNDS, 12),
    maxLoginAttempts: parseInteger(process.env.MAX_LOGIN_ATTEMPTS, 5),
    lockoutTime: parseInteger(process.env.LOCKOUT_TIME, 900000), // 15 minutes
    sessionTimeout: parseInteger(process.env.SESSION_TIMEOUT, 86400000) // 24 hours
  },

  // =============================================================================
  // EMAIL CONFIGURATION
  // =============================================================================
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInteger(process.env.EMAIL_PORT, 587),
    secure: parseBoolean(process.env.EMAIL_SECURE, false),
    username: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@delta2.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Delta-2 Backend',
    templateDir: process.env.EMAIL_TEMPLATE_DIR || 'src/templates/email',
    enabled: parseBoolean(process.env.EMAIL_ENABLED, true),
    testMode: parseBoolean(process.env.EMAIL_TEST_MODE, process.env.NODE_ENV === 'test')
  },

  // =============================================================================
  // FRONTEND & CORS CONFIGURATION
  // =============================================================================
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
    loginUrl: process.env.FRONTEND_LOGIN_URL || 'http://localhost:3000/login',
    resetPasswordUrl: process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:3000/reset-password'
  },

  cors: {
    origin: parseArray(process.env.CORS_ORIGIN, ['http://localhost:3000']),
    methods: parseArray(process.env.CORS_METHODS, ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS']),
    allowedHeaders: parseArray(process.env.CORS_ALLOWED_HEADERS, ['Content-Type', 'Authorization', 'X-Requested-With']),
    credentials: parseBoolean(process.env.CORS_CREDENTIALS, true),
    optionsSuccessStatus: 200
  },

  // =============================================================================
  // FILE UPLOAD CONFIGURATION
  // =============================================================================
  upload: {
    maxSize: parseInteger(process.env.UPLOAD_MAX_SIZE, 10485760), // 10MB
    maxFiles: parseInteger(process.env.UPLOAD_MAX_FILES, 10),
    allowedTypes: parseArray(process.env.UPLOAD_ALLOWED_TYPES, [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]),
    directories: {
      base: process.env.UPLOAD_DIR || './storage/uploads',
      temp: process.env.UPLOAD_TEMP_DIR || './storage/uploads/temp',
      profiles: process.env.UPLOAD_PROFILE_DIR || './storage/uploads/profiles',
      products: process.env.UPLOAD_PRODUCT_DIR || './storage/uploads/products',
      documents: process.env.UPLOAD_DOCUMENT_DIR || './storage/uploads/documents'
    }
  },

  // =============================================================================
  // RATE LIMITING CONFIGURATION
  // =============================================================================
  rateLimiting: {
    window: parseInteger(process.env.RATE_LIMIT_WINDOW, 15), // minutes
    maxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    authWindow: parseInteger(process.env.AUTH_RATE_LIMIT_WINDOW, 15),
    authMaxRequests: parseInteger(process.env.AUTH_RATE_LIMIT_MAX_REQUESTS, 5),
    passwordResetWindow: parseInteger(process.env.PASSWORD_RESET_RATE_LIMIT_WINDOW, 60),
    passwordResetMaxRequests: parseInteger(process.env.PASSWORD_RESET_RATE_LIMIT_MAX_REQUESTS, 3)
  },

  // =============================================================================
  // LOGGING CONFIGURATION
  // =============================================================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: parseBoolean(process.env.LOG_FILE, true),
    console: parseBoolean(process.env.LOG_CONSOLE, true),
    directory: process.env.LOG_DIR || './storage/logs',
    maxSize: process.env.LOG_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_MAX_FILES || '14d',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
    files: {
      access: process.env.ACCESS_LOG_FILE || 'access.log',
      error: process.env.ERROR_LOG_FILE || 'error.log',
      application: process.env.APPLICATION_LOG_FILE || 'application.log'
    }
  },

  // =============================================================================
  // SESSION CONFIGURATION
  // =============================================================================
  session: {
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    maxAge: parseInteger(process.env.SESSION_MAX_AGE, 86400000), // 24 hours
    storeType: process.env.SESSION_STORE_TYPE || 'memory',
    secure: parseBoolean(process.env.SESSION_SECURE, process.env.NODE_ENV === 'production'),
    httpOnly: parseBoolean(process.env.SESSION_HTTP_ONLY, true),
    sameSite: process.env.SESSION_SAME_SITE || 'lax'
  },

  // =============================================================================
  // SECURITY CONFIGURATION
  // =============================================================================
  security: {
    helmetEnabled: parseBoolean(process.env.HELMET_ENABLED, true),
    cspEnabled: parseBoolean(process.env.CSP_ENABLED, false),
    xssProtectionEnabled: parseBoolean(process.env.XSS_PROTECTION_ENABLED, true),
    hstsEnabled: parseBoolean(process.env.HSTS_ENABLED, process.env.NODE_ENV === 'production'),
    hstsMaxAge: parseInteger(process.env.HSTS_MAX_AGE, 31536000), // 1 year
    encryptionAlgorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-encryption-key'
  },

  // =============================================================================
  // PERFORMANCE CONFIGURATION
  // =============================================================================
  performance: {
    compressionEnabled: parseBoolean(process.env.COMPRESSION_ENABLED, true),
    compressionThreshold: parseInteger(process.env.COMPRESSION_THRESHOLD, 1024),
    requestTimeout: parseInteger(process.env.REQUEST_TIMEOUT, 30000),
    bodyParserLimit: process.env.BODY_PARSER_LIMIT || '50mb',
    jsonLimit: process.env.JSON_LIMIT || '10mb',
    urlEncodedLimit: process.env.URL_ENCODED_LIMIT || '10mb'
  },

  // =============================================================================
  // SWAGGER DOCUMENTATION CONFIGURATION
  // =============================================================================
  swagger: {
    enabled: parseBoolean(process.env.SWAGGER_ENABLED, process.env.NODE_ENV !== 'production'),
    title: process.env.SWAGGER_TITLE || 'Delta-2 Backend API',
    description: process.env.SWAGGER_DESCRIPTION || 'Comprehensive API documentation for Delta-2 Backend',
    version: process.env.SWAGGER_VERSION || '1.0.0',
    contactName: process.env.SWAGGER_CONTACT_NAME || 'Delta-2 Development Team',
    contactEmail: process.env.SWAGGER_CONTACT_EMAIL || 'dev@delta2.com',
    licenseName: process.env.SWAGGER_LICENSE_NAME || 'MIT',
    serverUrl: process.env.SWAGGER_SERVER_URL || 'http://localhost:3000'
  },

  // =============================================================================
  // EXTERNAL SERVICES CONFIGURATION
  // =============================================================================
  services: {
    // Redis (if used)
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInteger(process.env.REDIS_PORT, 6379),
      password: process.env.REDIS_PASSWORD || '',
      db: parseInteger(process.env.REDIS_DB, 0),
      enabled: parseBoolean(process.env.REDIS_ENABLED, false)
    },

    // Twilio SMS
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
      enabled: parseBoolean(process.env.TWILIO_ENABLED, false)
    },

    // Stripe Payment
    stripe: {
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      enabled: parseBoolean(process.env.STRIPE_ENABLED, false)
    },

    // AWS S3
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      region: process.env.AWS_REGION || 'us-east-1',
      s3Bucket: process.env.AWS_S3_BUCKET || '',
      enabled: parseBoolean(process.env.AWS_ENABLED, false)
    }
  },

  // =============================================================================
  // FEATURE FLAGS
  // =============================================================================
  features: {
    customerModuleEnabled: parseBoolean(process.env.CUSTOMER_MODULE_ENABLED, true),
    employeeModuleEnabled: parseBoolean(process.env.EMPLOYEE_MODULE_ENABLED, true),
    orderModuleEnabled: parseBoolean(process.env.ORDER_MODULE_ENABLED, true),
    productModuleEnabled: parseBoolean(process.env.PRODUCT_MODULE_ENABLED, true),
    realTimeNotificationsEnabled: parseBoolean(process.env.REAL_TIME_NOTIFICATIONS_ENABLED, false),
    analyticsEnabled: parseBoolean(process.env.ANALYTICS_ENABLED, false),
    auditLoggingEnabled: parseBoolean(process.env.AUDIT_LOGGING_ENABLED, true),
    mockEmailEnabled: parseBoolean(process.env.MOCK_EMAIL_ENABLED, false),
    mockSmsEnabled: parseBoolean(process.env.MOCK_SMS_ENABLED, false),
    mockPaymentEnabled: parseBoolean(process.env.MOCK_PAYMENT_ENABLED, false)
  },

  // =============================================================================
  // DEVELOPMENT & TESTING CONFIGURATION
  // =============================================================================
  development: {
    debugEnabled: parseBoolean(process.env.DEBUG_ENABLED, process.env.NODE_ENV === 'development'),
    prettyPrintJson: parseBoolean(process.env.PRETTY_PRINT_JSON, true),
    testDbName: process.env.TEST_DB_NAME || 'delta2_backend_test',
    testTimeout: parseInteger(process.env.TEST_TIMEOUT, 30000)
  }
};

/**
 * Validate required configuration values for MySQL2 setup
 */
const validateConfig = () => {
  const requiredVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_NAME'
  ];

  const missingVars = requiredVars.filter(varName => {
    return !process.env[varName];
  });

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Production-specific validation
  if (config.app.environment === 'production') {
    const productionRequiredVars = [
      'DB_PASS'
    ];

    const missingProdVars = productionRequiredVars.filter(varName => {
      return !process.env[varName];
    });

    if (missingProdVars.length > 0) {
      console.error('❌ Missing required production environment variables:');
      missingProdVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('Production environment requires additional security variables.');
      process.exit(1);
    }

    // Warn about default secrets in production
    if (config.jwt.secret === 'your-super-secret-jwt-key') {
      console.error('❌ Using default JWT_SECRET in production is not secure!');
      process.exit(1);
    }

    if (config.session.secret === 'your-session-secret') {
      console.error('❌ Using default SESSION_SECRET in production is not secure!');
      process.exit(1);
    }
  }

  console.log(`✅ Configuration validated for ${config.app.environment} environment`);
  console.log(`📊 Database: MySQL2 at ${config.database.host}:${config.database.port}/${config.database.name}`);
};

/**
 * Get configuration for specific environment
 */
const getEnvironmentConfig = (env = process.env.NODE_ENV) => {
  return {
    ...config,
    isDevelopment: env === 'development',
    isProduction: env === 'production',
    isTest: env === 'test'
  };
};

/**
 * Get database configuration specifically for MySQL2
 */
const getDatabaseConfig = () => {
  return {
    ...config.database,
    // Ensure MySQL2-specific settings
    type: 'mysql2',
    dialect: 'mysql',
    // Remove any SQLite references
    sqlitePath: undefined
  };
};

// Validate configuration on load (skip in test environment)
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = {
  ...config,
  validateConfig,
  getEnvironmentConfig,
  getDatabaseConfig,
  isDevelopment: config.app.environment === 'development',
  isProduction: config.app.environment === 'production',
  isTest: config.app.environment === 'test'
};
