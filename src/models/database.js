/**
 * Database Connection Manager
 *
 * This file manages MySQL2 database connections using connection pooling.
 * Connection pooling helps manage multiple database connections efficiently
 * and prevents running out of connections under high load.
 *
 * For beginners:
 * - A connection pool maintains multiple database connections
 * - When you need to run a query, it borrows a connection from the pool
 * - After the query, the connection is returned to the pool for reuse
 * - This is much more efficient than creating new connections each time
 */

const mysql = require('mysql2/promise');
const { getDatabaseConfig } = require('../../config/database');

let pool = null;

/**
 * Create MySQL connection pool
 * A pool manages multiple connections automatically
 */
const createPool = () => {
  try {
    const config = getDatabaseConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      multipleStatements: true,

      // Connection pool settings
      connectionLimit: config.connectionLimit || 10,        // Maximum connections
      queueLimit: config.acquireTimeout || 30,         // Maximum queued requests
      acquireTimeout: config.timeout || 60000,     // Wait time for connection

      // Connection settings
      charset: 'utf8mb4',                             // Support emojis and special characters
      timezone: 'Z',                                  // Use UTC timezone

      // Automatic reconnection
      reconnect: true,
      idleTimeout: 300000,                            // Close idle connections after 5 minutes

      // Query settings
      multipleStatements: false,                      // Prevent SQL injection via multiple statements
      namedPlaceholders: true                        // Enable named parameters like :userId
    });

    // Log successful connection
    console.log('✅ MySQL connection pool created successfully');

    return pool;
  } catch (error) {
    console.error('❌ Failed to create MySQL connection pool:', error);
    throw error;
  }
};

/**
 * Get database connection from pool
 * Use this when you need to run a single query
 */
const  getConnection = async () => {
  try {
    if (!pool) {
      pool = createPool();
    }

    // Get connection from pool
    const connection = await pool.getConnection();
    // Add custom properties while preserving methods
    connection.customRelease = () => {
      console.log('Releasing connection...');
      connection.release();
    };

    return connection;
  } catch (error) {
    console.error('❌ Failed to get database connection:', error);
    throw new Error('Database connection failed');
  }
};

/**
 * Execute a single query
 * This is the most common way to run SQL queries
 *
 * @param {string} query - SQL query string
 * @param {Array|Object} params - Query parameters
 * @returns {Promise<Array>} Query results
 */
const executeQuery = async (query, params = []) => {
  let connection;

  try {
    connection = await getConnection();
    // Execute query with parameters to prevent SQL injection
    const [rows] = await connection.execute(query, params);

    // Return results
    return rows;
  } catch (error) {
    console.error('❌ Query execution failed:', error);
    console.error('Query:', query);
    console.error('Parameters:', params);
    throw error;
  } finally {
    // Always release connection back to pool
    if (connection) {
      connection.customRelease();
    }
  }
};

/**
 * Execute multiple queries in a transaction
 * Use this when you need multiple queries to succeed or fail together
 *
 * @param {Function} callback - Function containing queries to execute
 * @returns {Promise} Transaction result
 */
const executeTransaction = async (callback) => {
  let connection;

  try {
    connection = await getConnection();

    // Start transaction
    await connection.beginTransaction();

    // Execute queries in callback
    const result = await callback(connection);

    // Commit transaction if all queries succeeded
    await connection.commit();

    return result;
  } catch (error) {
    console.error('❌ Transaction failed:', error);

    // Rollback transaction if any query failed
    if (connection) {
      await connection.rollback();
    }

    throw error;
  } finally {
    // Always release connection back to pool
    if (connection) {
      connection.customRelease();
    }
  }
};

/**
 * Get a single record by ID
 * Common helper function for finding records by primary key
 *
 * @param {string} tableName - Name of the table
 * @param {number|string} id - Record ID
 * @param {string} idColumn - Name of ID column (default: 'id')
 * @returns {Promise<Object|null>} Record or null if not found
 */
const findById = async (tableName, id, idColumn = 'id') => {
  try {
    const query = `SELECT * FROM ${tableName} WHERE ${idColumn} = ? LIMIT 1`;
    const results = await executeQuery(query, [id]);

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    console.error(`❌ Failed to find record in ${tableName}:`, error);
    throw error;
  }
};

/**
 * Check if database connection is working
 * Useful for health checks and debugging
 */
const testConnection = async () => {
  try {
    const result = await executeQuery('SELECT 1 as connected');
    return result[0]?.connected === 1;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
};

/**
 * Close all connections in the pool
 * Use this when shutting down the application
 */
const closePool = async () => {
  try {
    if (pool) {
      await pool.end();
      pool = null;
      console.log('✅ Database connection pool closed');
    }
  } catch (error) {
    console.error('❌ Failed to close connection pool:', error);
  }
};

/**
 * Get pool status for monitoring
 * Useful for debugging connection issues
 */
const getPoolStatus = () => {
  if (!pool) {
    return { status: 'Pool not initialized' };
  }

  return {
    totalConnections: pool._allConnections?.length || 0,
    freeConnections: pool._freeConnections?.length || 0,
    acquiringConnections: pool._acquiringConnections?.length || 0,
    queuedRequests: pool._connectionQueue?.length || 0
  };
};

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🔄 Shutting down database connections...');
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Shutting down database connections...');
  await closePool();
  process.exit(0);
});

module.exports = {
  // Connection management
  createPool,
  getConnection,
  closePool,
  testConnection,

  // Query execution
  executeQuery,
  executeTransaction,

  // Helper functions
  findById,

  // Monitoring
  getPoolStatus,

  // Direct pool access (use cautiously)
  get pool() {
    return pool;
  }
};
