/**
 * File: config/database.js
 * Database Configuration - MySQL2 Only
 *
 * This file contains all database connection settings for MySQL2.
 * It handles different environments (development, testing, production).
 *
 * For beginners:
 * - This file tells our app how to connect to the MySQL database
 * - Different environments use different database settings
 * - Connection pooling helps manage multiple database connections efficiently
 * - SSL and security settings are configured here
 */

const mysql = require("mysql2/promise");
require("dotenv").config();

/**
 * Database Configuration Object
 * Contains settings for different environments
 */
const databaseConfig = {
  development: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "delta2_backend_dev",
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    timezone: "+00:00",

    // Connection Pool Settings

    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,

    // Query Settings
    multipleStatements: false,
    dateStrings: false,

    // Development specific settings
    debug: process.env.DB_DEBUG === "true",
    trace: process.env.DB_TRACE === "true",

    // SSL Configuration (optional for development)
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  },

  testing: {
    host: process.env.TEST_DB_HOST || "localhost",
    port: parseInt(process.env.TEST_DB_PORT) || 3306,
    user: process.env.TEST_DB_USER || "root",
    password: process.env.TEST_DB_PASS || "",
    database: process.env.TEST_DB_NAME || "delta2_backend_test",
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    timezone: "+00:00",

    // Testing Pool Settings (smaller for testing)
    connectionLimit: 5,
    acquireTimeout: 30000,
    timeout: 30000,
    reconnect: true,

    // Query Settings
    multipleStatements: false,
    dateStrings: false,

    // Testing specific settings
    debug: false,
    trace: false,

    // SSL Configuration
    ssl:
      process.env.TEST_DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
  },

  production: {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    collation: "utf8mb4_unicode_ci",
    timezone: "+00:00",

    // Production Pool Settings (larger for production)
    connectionLimit: 20,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true,
    queueLimit: 0,

    // Query Settings
    multipleStatements: false,
    dateStrings: false,

    // Production specific settings
    debug: false,
    trace: false,

    // SSL Configuration (required for production)
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DB_SSL_CA || undefined,
      cert: process.env.DB_SSL_CERT || undefined,
      key: process.env.DB_SSL_KEY || undefined,
    },
  },
};

/**
 * Get database configuration for current environment
 *
 * @returns {Object} Database configuration object
 */
function getDatabaseConfig() {
  const environment = process.env.NODE_ENV || "development";
  const config = databaseConfig[environment];

  if (!config) {
    throw new Error(
      `No database configuration found for environment: ${environment}`
    );
  }

  // Validate required configuration
  validateDatabaseConfig(config, environment);

  return config;
}

/**
 * Validate database configuration
 * Ensures all required fields are present
 *
 * @param {Object} config - Database configuration
 * @param {string} environment - Environment name
 */
function validateDatabaseConfig(config, environment) {
  const requiredFields = ["host", "user", "database"];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!config[field]) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(
      `Missing required database configuration fields for ${environment}: ${missingFields.join(", ")}`
    );
  }

  // Production-specific validation
  if (environment === "production") {
    if (!config.password) {
      throw new Error(
        "Database password is required in production environment"
      );
    }

    if (!config.ssl || config.ssl === false) {
      console.warn("⚠️ WARNING: SSL is disabled in production environment");
    }
  }
}

/**
 * Create database connection pool
 *
 * @returns {Object} MySQL2 connection pool
 */
function createConnectionPool() {
  const config = getDatabaseConfig();
  const environment = process.env.NODE_ENV || "development";

  console.log(
    `🔗 Creating MySQL2 connection pool for ${environment} environment`
  );
  console.log(`📍 Database: ${config.host}:${config.port}/${config.database}`);

  try {
    const pool = mysql.createPool(config);

    // Test the connection pool
    pool.on("connection", (connection) => {
      console.log(
        `🔌 New database connection established: ${connection.threadId}`
      );
    });

    pool.on("error", (error) => {
      console.error("❌ Database pool error:", error);

      // Handle specific connection errors
      if (error.code === "PROTOCOL_CONNECTION_LOST") {
        console.error("💥 Database connection was closed.");
      }
      if (error.code === "ER_CON_COUNT_ERROR") {
        console.error("🚫 Database has too many connections.");
      }
      if (error.code === "ECONNREFUSED") {
        console.error("🔒 Database connection was refused.");
      }
    });

    return pool;
  } catch (error) {
    console.error("❌ Failed to create database connection pool:", error);
    throw new Error(`Database pool creation failed: ${error.message}`);
  }
}

/**
 * Test database connection
 * Verifies that the database is accessible
 *
 * @param {Object} pool - Database connection pool
 * @returns {Promise<Object>} Connection test result
 */
async function testDatabaseConnection(pool) {
  try {
    console.log("🧪 Testing database connection...");

    const connection = await pool.getConnection();

    // Test basic query
    const [rows] = await connection.execute(
      "SELECT 1 as test, NOW() as current_datetime"
    );

    // Get server information
    const [serverInfo] = await connection.execute(
      "SELECT VERSION() as version"
    );

    connection.release();

    const result = {
      success: true,
      message: "Database connection successful",
      serverVersion: serverInfo[0].version,
      currentTime: rows[0].current_datetime,
      testQuery: rows[0].test === 1,
    };

    console.log("✅ Database connection test passed");
    console.log(`📊 MySQL Server Version: ${result.serverVersion}`);

    return result;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);

    return {
      success: false,
      message: `Database connection failed: ${error.message}`,
      error: error.message,
      errorCode: error.code,
    };
  }
}

/**
 * Get database pool statistics
 *
 * @param {Object} pool - Database connection pool
 * @returns {Object} Pool statistics
 */
function getPoolStatistics(pool) {
  if (!pool || typeof pool._allConnections === "undefined") {
    return {
      available: false,
      message: "Pool statistics not available",
    };
  }

  return {
    available: true,
    totalConnections: pool._allConnections.length,
    activeConnections:
      pool._allConnections.length - pool._freeConnections.length,
    freeConnections: pool._freeConnections.length,
    queuedRequests: pool._connectionQueue ? pool._connectionQueue.length : 0,
    connectionLimit: pool.config.connectionLimit,
    acquireTimeout: pool.config.acquireTimeout,
    timeout: pool.config.timeout,
  };
}

/**
 * Close database connection pool gracefully
 *
 * @param {Object} pool - Database connection pool
 * @returns {Promise<void>}
 */
async function closeDatabasePool(pool) {
  try {
    console.log("🔒 Closing database connection pool...");

    await pool.end();

    console.log("✅ Database connection pool closed successfully");
  } catch (error) {
    console.error("❌ Error closing database connection pool:", error);
    throw new Error(`Failed to close database pool: ${error.message}`);
  }
}

/**
 * Get database configuration for environment
 * Used by external modules that need database config
 *
 * @param {string} environment - Environment name (optional)
 * @returns {Object} Database configuration
 */
function getConfigForEnvironment(environment = null) {
  const env = environment || process.env.NODE_ENV || "development";
  const config = databaseConfig[env];

  if (!config) {
    throw new Error(`No database configuration found for environment: ${env}`);
  }

  // Return a copy to prevent modification
  return { ...config };
}

/**
 * Check if database configuration exists for environment
 *
 * @param {string} environment - Environment name
 * @returns {boolean} True if configuration exists
 */
function hasConfigForEnvironment(environment) {
  return !!databaseConfig[environment];
}

module.exports = {
  // Main configuration functions
  getDatabaseConfig,
  createConnectionPool,
  testDatabaseConnection,
  closeDatabasePool,

  // Utility functions
  validateDatabaseConfig,
  getPoolStatistics,
  getConfigForEnvironment,
  hasConfigForEnvironment,

  // Environment configurations (for reference)
  environments: Object.keys(databaseConfig),

  // Current environment info
  currentEnvironment: process.env.NODE_ENV || "development",

  // Configuration validation
  isProduction: (process.env.NODE_ENV || "development") === "production",
  isTesting: (process.env.NODE_ENV || "development") === "testing",
  isDevelopment: (process.env.NODE_ENV || "development") === "development",
};
