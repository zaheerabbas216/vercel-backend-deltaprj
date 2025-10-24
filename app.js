/**
 * Delta-2 Backend Express Application Configuration
 *
 * This file configures the Express.js application with all necessary
 * middleware, routes, and error handling for the Delta-2 Backend API.
 *
 * @author Delta-2 Development Team
 * @version 1.0.0
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('express-async-errors');

// Import configuration and utilities
const config = require('./config/environment');
const logger = require('./src/utils/logger');
const apiResponse = require('./src/utils/apiResponse');

// Import middleware
const errorHandler = require('./src/middleware/errorHandler');
const corsMiddleware = require('./src/middleware/cors');
const authMiddleware = require('./src/middleware/auth');

// Import existing routes
const authRoutes = require('./src/routes/auth/authRoutes');
const passwordRoutes = require('./src/routes/auth/passwordRoutes');

// Create Express app
const app = express();

// =============================================================================
// TRUST PROXY (for production deployments behind reverse proxy)
// =============================================================================
// Always trust proxy on Vercel or in production
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  app.set('trust proxy', true);
}

// =============================================================================
// SECURITY MIDDLEWARE
// =============================================================================

// Helmet for security headers
if (config.security.helmetEnabled) {
  app.use(helmet({
    contentSecurityPolicy: config.security.cspEnabled ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'"],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        childSrc: ["'none'"],
        workerSrc: ["'none'"],
        frameSrc: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: []
      }
    } : false,
    hsts: config.security.hstsEnabled ? {
      maxAge: config.security.hstsMaxAge,
      includeSubDomains: true,
      preload: true
    } : false
  }));
}

// =============================================================================
// CORS CONFIGURATION
// =============================================================================
app.use(corsMiddleware.default);

// =============================================================================
// RATE LIMITING
// =============================================================================

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: config.rateLimiting.window * 60 * 1000, // Convert minutes to milliseconds
  max: config.rateLimiting.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health check endpoints
    return req.path === '/health' || req.path === '/api/health';
  }
});

// Authentication rate limiting (more restrictive)
const authLimiter = rateLimit({
  windowMs: config.rateLimiting.authWindow * 60 * 1000,
  max: config.rateLimiting.authMaxRequests,
  message: {
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Password reset rate limiting (very restrictive)
const passwordResetLimiter = rateLimit({
  windowMs: config.rateLimiting.passwordResetWindow * 60 * 1000,
  max: config.rateLimiting.passwordResetMaxRequests,
  message: {
    error: 'Too many password reset attempts',
    message: 'Too many password reset attempts from this IP, please try again later.',
    statusCode: 429
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting
app.use(generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/password/forgot', passwordResetLimiter);

// =============================================================================
// COMPRESSION
// =============================================================================
if (config.performance.compressionEnabled) {
  app.use(compression({
    threshold: config.performance.compressionThreshold,
    level: 6,
    memLevel: 8,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));
}

// =============================================================================
// REQUEST LOGGING
// =============================================================================
if (process.env.NODE_ENV === 'development') {
  // Development logging - detailed
  app.use(morgan('dev', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
} else {
  // Production logging - combined format
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    },
    skip: (req, res) => {
      // Skip logging for health checks in production
      return req.path === '/health' || req.path === '/api/health';
    }
  }));
}

// =============================================================================
// BODY PARSING MIDDLEWARE
// =============================================================================

// JSON body parser
app.use(bodyParser.json({
  limit: config.performance.jsonLimit,
  verify: (req, res, buf) => {
    // Store raw body for webhook verification
    req.rawBody = buf;
  }
}));

// URL encoded body parser
app.use(bodyParser.urlencoded({
  extended: true,
  limit: config.performance.urlEncodedLimit
}));

// Cookie parser
app.use(cookieParser(config.session.secret));

// =============================================================================
// STATIC FILE SERVING
// =============================================================================

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'storage/uploads'), {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Serve static assets
app.use('/static', express.static(path.join(__dirname, 'public'), {
  maxAge: '7d',
  etag: true,
  lastModified: true
}));

// =============================================================================
// HEALTH CHECK ENDPOINTS
// =============================================================================

// Basic health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('./package.json').version
  });
});

// Detailed health check with database status
app.get('/api/health', async (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: require('./package.json').version,
    system: {
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      platform: process.platform,
      nodeVersion: process.version
    },
    services: {
      database: 'SKIP',
      email: config.features.mockEmailEnabled ? 'MOCK' : 'OK',
      fileStorage: 'OK'
    }
  };

  // Skip database check on Vercel to prevent crashes
  if (!process.env.VERCEL) {
    try {
      const { createConnectionPool, testDatabaseConnection } = require('./config/database');
      const tempPool = createConnectionPool();
      const result = await testDatabaseConnection(tempPool);
      await tempPool.end();

      healthCheck.services.database = result.success ? 'OK' : 'ERROR';
      if (!result.success) {
        healthCheck.status = 'DEGRADED';
      }
    } catch (error) {
      healthCheck.services.database = 'ERROR';
      healthCheck.status = 'DEGRADED';
      logger.error('Database health check failed:', error);
    }
  }
  
  res.status(200).json(healthCheck);
});

// =============================================================================
// API ROUTES
// =============================================================================

// API root endpoint
app.get('/api', (req, res) => {
  const responseData = {
    success: true,
    message: 'Welcome to Delta-2 Backend API',
    data: {
      version: require('./package.json').version,
      environment: process.env.NODE_ENV,
      documentation: `${config.app.url}/api-docs`,
      endpoints: {
        health: '/api/health',
        authentication: '/api/auth',
        roles: '/api/roles',
        permissions: '/api/permissions',
        customers: '/api/customers',
        employees: '/api/employees',
        orders: '/api/orders',
        products: '/api/products'
      }
    }
  };

  try {
    apiResponse.success(res, responseData.data, responseData.message);
  } catch (error) {
    logger.error('Error using apiResponse utility:', error);
    res.status(200).json(responseData);
  }
});

// Mount all API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/password', passwordRoutes);

// =============================================================================
// API DOCUMENTATION (Swagger)
// =============================================================================
if (config.swagger.enabled) {
  const swaggerUi = require('swagger-ui-express');
  const swaggerSpec = require('./config/swagger');

  app.use('/api-docs', swaggerUi.serve);
  app.get('/api-docs', swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: config.swagger.title,
    explorer: true
  }));

  // Swagger JSON endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// =============================================================================
// ROOT ENDPOINT
// =============================================================================
app.get('/', (req, res) => {
  res.json({
    message: 'Delta-2 Backend API',
    version: require('./package.json').version,
    status: 'Running',
    documentation: `${config.app.url}/api-docs`,
    health: `${config.app.url}/health`
  });
});

// =============================================================================
// 404 HANDLER
// =============================================================================
app.all('*', (req, res) => {
  logger.warn(`404 - Route not found: ${req.method} ${req.originalUrl}`);

  const notFoundResponse = {
    success: false,
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    statusCode: 404,
    data: {
      availableEndpoints: {
        api: '/api',
        health: '/health',
        documentation: '/api-docs'
      }
    }
  };

  try {
    if (apiResponse && typeof apiResponse.notFound === 'function') {
      apiResponse.notFound(res, notFoundResponse.data, notFoundResponse.message);
    } else {
      res.status(404).json(notFoundResponse);
    }
  } catch (error) {
    logger.error('Error using apiResponse utility in 404 handler:', error);
    res.status(404).json(notFoundResponse);
  }
});

// =============================================================================
// ERROR HANDLING MIDDLEWARE
// =============================================================================

// Global error handler (must be last)
app.use(errorHandler.errorHandler);

// =============================================================================
// EXPORT APPLICATION
// =============================================================================
module.exports = app;
