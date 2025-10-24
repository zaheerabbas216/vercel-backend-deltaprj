/**
 * Delta-2 Backend Server Entry Point
 *
 * This is the main entry point for the Delta-2 Backend application.
 * It handles server initialization, graceful shutdown, and error handling.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

// Load environment variables first
require('dotenv').config();

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Stack Trace:', err.stack);
  process.exit(1);
});

// Import required modules
const app = require('./app');
const logger = require('./src/utils/logger');
const { createDirectories } = require('./src/utils/helpers');
const { createConnectionPool, closeDatabasePool } = require('./config/database');

// Server configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Create necessary directories on startup
 */
const initializeDirectories = () => {
  const directories = [
    './storage',
    './storage/uploads',
    './storage/uploads/profiles',
    './storage/uploads/products',
    './storage/uploads/documents',
    './storage/uploads/temp',
    './storage/logs',
    './storage/logs/access',
    './storage/logs/error',
    './storage/logs/application',
    './database',
    './database/backups'
  ];

  try {
    createDirectories(directories);
    logger.info('📁 Required directories created successfully');
  } catch (error) {
    logger.error('❌ Failed to create directories:', error);
    process.exit(1);
  }
};

let dbPool;

// Replace testDatabaseConnection function (around line 60-75)
const testDatabaseConnection = async () => {
  try {
    if (!dbPool) {
      dbPool = createConnectionPool();
    }

    const dbConfig = require('./config/database');
    const result = await dbConfig.testDatabaseConnection(dbPool);

    if (result.success) {
      logger.info('MySQL database connection successful');
      return true;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw error;
  }
};
/**
 * Start the server
 */
const startServer = async () => {
  try {
    // Test database connection first
    await testDatabaseConnection();

    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Server started successfully!`);
      logger.info(`📁 Environment: ${NODE_ENV}`);
      logger.info(`🌐 Server running at: http://${HOST}:${PORT}`);
      logger.info(`📚 API Documentation: http://${HOST}:${PORT}/api-docs`);
      logger.info(`💾 Database: MySQL`);
      logger.info(`🔑 JWT Authentication: ${process.env.JWT_SECRET ? 'Configured' : 'Not Configured'}`);

      if (NODE_ENV === 'development') {
        logger.info('🔧 Development mode features enabled');
        logger.info('🔧 Mock email service enabled');
      }

      console.log('\n=================================');
      console.log('🎉 Delta-2 Backend is ready!');
      console.log('=================================\n');
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? `Pipe ${PORT}` : `Port ${PORT}`;

      switch (error.code) {
        case 'EACCES':
          logger.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`❌ ${bind} is already in use`);
          process.exit(1);
          break;
        default:
          logger.error('❌ Server error:', error);
          throw error;
      }
    });

    return server;
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Update graceful shutdown to use closeDatabasePool
const gracefulShutdown = async (server, signal) => {
  logger.info(`\nReceived ${signal}. Starting graceful shutdown...`);

  server.close(async (err) => {
    if (err) {
      logger.error('Error during server shutdown:', err);
      process.exit(1);
    }

    logger.info('HTTP server closed.');

    if (dbPool) {
      try {
        await closeDatabasePool(dbPool);
        logger.info('Database connections closed.');
        process.exit(0);
      } catch (dbErr) {
        logger.error('Error closing database connections:', dbErr);
        process.exit(1);
      }
    } else {
      process.exit(0);
    }
  });
};
/**
 * Initialize and start the application
 */
const initialize = async () => {
  try {
    // Create required directories
    initializeDirectories();

    // Start the server
    const server = await startServer();

    // Setup graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown(server, 'SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown(server, 'SIGINT'));

  } catch (error) {
    logger.error('💥 Failed to initialize server:', error);
    process.exit(1);
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED PROMISE REJECTION! Shutting down...');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Stack Trace:', err.stack);
  process.exit(1);
});

// Handle SIGTERM signal (for Docker and process managers)
process.on('SIGTERM', () => {
  logger.info('👋 SIGTERM received. Starting graceful shutdown...');
});

// Handle SIGINT signal (Ctrl+C)
process.on('SIGINT', () => {
  logger.info('👋 SIGINT received. Starting graceful shutdown...');
});

// Production error handling
if (NODE_ENV === 'production') {
  process.on('uncaughtException', (err) => {
    logger.error('💥 UNCAUGHT EXCEPTION in production:', err);
    process.exit(1);
  });

  process.on('unhandledRejection', (err) => {
    logger.error('💥 UNHANDLED REJECTION in production:', err);
    process.exit(1);
  });
}

// Start the application
initialize();

module.exports = app;
