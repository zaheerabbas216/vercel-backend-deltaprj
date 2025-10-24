/**
 * File: src/middleware/rbac.js
 * RBAC Middleware - Role-Based Access Control
 *
 * This file contains middleware functions for role and permission-based authorization.
 * It validates user roles and permissions before allowing access to resources.
 *
 * For beginners:
 * - RBAC middleware runs after authentication to check permissions
 * - It verifies if users have required roles or permissions for endpoints
 * - Uses functional programming approach with individual middleware functions
 * - Integrates with MySQL2 models for permission verification
 */

const userRoleService = require('../services/rbac/userRoleService');
const permissionService = require('../services/rbac/permissionService');
const { unauthorized, forbidden, badRequest, internalServerError, tooManyRequests } = require('../utils/apiResponse');
const { ERROR_CODES, createError } = require('../utils/errorCodes');
const { logError, logAuth, logSecurity } = require('../utils/logger');
const { isEmpty, getCurrentTimestamp } = require('../utils/helpers');

/**
 * Require specific role middleware
 * Checks if user has a specific role
 *
 * @param {string|Array} requiredRoles - Required role(s) (name or array of names)
 * @returns {Function} Middleware function
 */
const requireRole = (requiredRoles) => {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required for role-based access'));
      }

      // Get user roles
      const userRoles = await userRoleService.getUserRoles(req.user.userId, {
        includeInactive: false,
        includeExpired: false
      });

      if (!userRoles.success || !userRoles.data.roles.length) {
        logSecurity('User with no active roles attempted access', {
          userId: req.user.userId,
          requiredRoles: roles,
          endpoint: req.path,
          ip: req.ip
        });
        return forbidden(res, 'User has no active roles', createError(ERROR_CODES.INSUFFICIENT_PERMISSIONS.code, 'User does not have any active roles assigned'));
      }

      // Check if user has any of the required roles
      const userRoleNames = userRoles.data.roles.map(role => role.role_name);
      const hasRequiredRole = roles.some(role => userRoleNames.includes(role));

      if (!hasRequiredRole) {
        logSecurity('Role access denied', {
          userId: req.user.userId,
          userRoles: userRoleNames,
          requiredRoles: roles,
          endpoint: req.path,
          ip: req.ip
        });
        return forbidden(res, `Access denied. Required role: ${roles.join(' or ')}`, createError(ERROR_CODES.ROLE_REQUIRED.code, 'User does not have required role for this resource', {
          userRoles: userRoleNames,
          requiredRoles: roles
        }));
      }

      // Set user roles in request for use in controllers
      req.userRoles = userRoleNames;
      req.primaryRole = userRoles.data.primary_role?.role_name || null;

      logAuth('Role access granted', req.user.userId, {
        roles: userRoleNames,
        primaryRole: req.primaryRole,
        endpoint: req.path
      });

      next();

    } catch (error) {
      logError('Error in requireRole middleware', error, {
        userId: req.user?.userId,
        requiredRoles: roles,
        endpoint: req.path
      });
      return internalServerError(res, 'Role validation error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role validation system error', {
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
    }
  };
};

/**
 * Require specific permission middleware
 * Checks if user has a specific permission
 *
 * @param {string|Array} requiredPermissions - Required permission(s) (name or array)
 * @param {Object} options - Permission check options
 * @returns {Function} Middleware function
 */
const requirePermission = (requiredPermissions, options = {}) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  const { requireAll = false } = options; // If true, user needs ALL permissions, not just one

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required for permission-based access'));
      }

      // Get user permissions from all roles
      const userPermissions = await userRoleService.getUserPermissions(req.user.userId, {
        groupByModule: false,
        includeRoleInfo: true
      });

      if (!userPermissions.success || !userPermissions.data.permissions.length) {
        logSecurity('User with no permissions attempted access', {
          userId: req.user.userId,
          requiredPermissions: permissions,
          endpoint: req.path,
          ip: req.ip
        });
        return forbidden(res, 'User has no permissions', createError(ERROR_CODES.INSUFFICIENT_PERMISSIONS.code, 'User does not have any permissions assigned'));
      }

      const userPerms = userPermissions.data.permissions;

      // Check permissions based on requireAll flag
      let hasRequiredPermissions;
      if (requireAll) {
        // User must have ALL required permissions
        hasRequiredPermissions = permissions.every(perm => userPerms.includes(perm));
      } else {
        // User needs at least ONE of the required permissions
        hasRequiredPermissions = permissions.some(perm => userPerms.includes(perm));
      }

      if (!hasRequiredPermissions) {
        logSecurity('Permission access denied', {
          userId: req.user.userId,
          userPermissions: userPerms,
          requiredPermissions: permissions,
          requireAll,
          endpoint: req.path,
          ip: req.ip
        });
        return forbidden(res, `Access denied. Required permission${permissions.length > 1 ? 's' : ''}: ${permissions.join(requireAll ? ' and ' : ' or ')}`, createError(ERROR_CODES.PERMISSION_DENIED.code, 'User does not have required permissions for this resource', {
          userPermissions: userPerms,
          requiredPermissions: permissions,
          requireAll
        }));
      }

      // Set user permissions in request for use in controllers
      req.userPermissions = userPerms;
      req.permissionSources = userPermissions.data.permissionSources;

      logAuth('Permission access granted', req.user.userId, {
        permissions: userPerms.length,
        requiredPermissions: permissions,
        endpoint: req.path
      });

      next();

    } catch (error) {
      logError('Error in requirePermission middleware', error, {
        userId: req.user?.userId,
        requiredPermissions: permissions,
        endpoint: req.path
      });
      return internalServerError(res, 'Permission validation error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Permission validation system error', {
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
    }
  };
};

/**
 * Check ownership middleware
 * Verifies if user owns the resource or has permission to access it
 *
 * @param {string} resourceParam - Request parameter containing resource ID
 * @param {string} ownershipField - Field name to check ownership (default: 'user_id')
 * @param {Array} bypassRoles - Roles that can bypass ownership check
 * @returns {Function} Middleware function
 */
const checkOwnership = (resourceParam, ownershipField = 'user_id', bypassRoles = ['admin', 'super_admin']) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required for ownership validation'));
      }

      const resourceId = req.params[resourceParam];
      if (isEmpty(resourceId)) {
        return badRequest(res, `Resource parameter '${resourceParam}' is required`, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Missing required resource parameter', {
          field: resourceParam,
          details: `The ${resourceParam} parameter is required for ownership validation`
        }));
      }

      // Get user roles to check for bypass
      const userRoles = await userRoleService.getUserRoles(req.user.userId, {
        includeInactive: false,
        includeExpired: false
      });

      if (userRoles.success && userRoles.data.roles.length) {
        const userRoleNames = userRoles.data.roles.map(role => role.role_name);

        // Check if user has bypass role
        if (bypassRoles.some(role => userRoleNames.includes(role))) {
          req.hasOwnershipBypass = true;
          logAuth('Ownership check bypassed by role', req.user.userId, {
            roles: userRoleNames,
            bypassRoles,
            resourceParam,
            resourceId
          });
          return next();
        }
      }

      // If accessing own user ID, allow access
      if (resourceParam === 'userId' && resourceId === req.user.userId.toString()) {
        req.isOwner = true;
        logAuth('Resource owner access granted', req.user.userId, {
          resourceParam,
          resourceId
        });
        return next();
      }

      // For other resources, you would typically check database ownership
      // This is a simplified example - in practice, you'd query the resource table
      req.resourceId = resourceId;
      req.ownershipField = ownershipField;
      req.bypassRoles = bypassRoles;

      logAuth('Ownership validation completed', req.user.userId, {
        resourceParam,
        resourceId,
        ownershipField
      });

      next();

    } catch (error) {
      logError('Error in checkOwnership middleware', error, {
        userId: req.user?.userId,
        resourceParam,
        resourceId: req.params[resourceParam]
      });
      return internalServerError(res, 'Ownership validation error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Ownership validation system error', {
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
    }
  };
};

/**
 * Admin access middleware
 * Shorthand for requiring admin or super_admin role
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const requireAdmin = requireRole(['admin', 'super_admin']);

/**
 * Super admin access middleware
 * Requires super_admin role
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const requireSuperAdmin = requireRole(['super_admin']);

/**
 * Create module permission middleware
 * Checks if user has permission for specific module actions
 *
 * @param {string} module - Module name
 * @param {string|Array} actions - Required action(s)
 * @returns {Function} Middleware function
 */
const requireModulePermission = (module, actions) => {
  const actionArray = Array.isArray(actions) ? actions : [actions];
  const permissions = actionArray.map(action => `${module}.${action}`);

  return requirePermission(permissions);
};

/**
 * Dynamic permission middleware
 * Builds permission name from request parameters
 *
 * @param {Function} permissionBuilder - Function that returns permission name from request
 * @returns {Function} Middleware function
 */
const requireDynamicPermission = (permissionBuilder) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required for dynamic permission validation'));
      }

      const permission = permissionBuilder(req);

      if (isEmpty(permission)) {
        logError('Dynamic permission builder returned empty permission', null, {
          userId: req.user.userId,
          endpoint: req.path,
          method: req.method,
          params: req.params
        });
        return badRequest(res, 'Could not determine required permission', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Dynamic permission validation failed', {
          details: 'Permission builder function returned empty or invalid permission'
        }));
      }

      logAuth('Dynamic permission determined', req.user.userId, {
        permission,
        endpoint: req.path
      });

      // Use requirePermission with the built permission
      const permissionMiddleware = requirePermission(permission);
      return await permissionMiddleware(req, res, next);

    } catch (error) {
      logError('Error in requireDynamicPermission middleware', error, {
        userId: req.user?.userId,
        endpoint: req.path
      });
      return internalServerError(res, 'Dynamic permission validation error', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Dynamic permission validation system error', {
        originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
      }));
    }
  };
};

/**
 * Optional role middleware
 * Sets role information without requiring specific roles
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 * @returns {Promise<void>}
 */
const optionalRole = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(); // No user, continue without role info
    }

    // Get user roles
    const userRoles = await userRoleService.getUserRoles(req.user.userId, {
      includeInactive: false,
      includeExpired: false
    });

    if (userRoles.success && userRoles.data.roles.length) {
      req.userRoles = userRoles.data.roles.map(role => role.role_name);
      req.primaryRole = userRoles.data.primary_role?.role_name || null;

      logAuth('Optional role information loaded', req.user.userId, {
        roles: req.userRoles,
        primaryRole: req.primaryRole
      });
    }

    next();

  } catch (error) {
    logError('Error in optionalRole middleware', error, {
      userId: req.user?.userId,
      continueWithoutRoles: true
    });
    // Continue without role info rather than failing
    next();
  }
};

/**
 * Rate limiting for role/permission operations
 * Limits sensitive RBAC operations per user
 *
 * @param {number} maxAttempts - Maximum attempts per window
 * @param {number} windowMinutes - Time window in minutes
 * @returns {Function} Middleware function
 */
const createRBACRateLimit = (maxAttempts = 10, windowMinutes = 60) => {
  const attempts = new Map();

  return (req, res, next) => {
    const userId = req.user?.userId;

    if (!userId) {
      return next(); // Skip rate limiting for unauthenticated requests
    }

    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // Clean up old entries
    for (const [key, value] of attempts.entries()) {
      if (now - value.firstAttempt > windowMs) {
        attempts.delete(key);
      }
    }

    // Get current attempts for this user
    let userAttempts = attempts.get(userId) || { count: 0, firstAttempt: now };

    // Reset if window has passed
    if (now - userAttempts.firstAttempt > windowMs) {
      userAttempts = { count: 0, firstAttempt: now };
    }

    // Check if limit exceeded
    if (userAttempts.count >= maxAttempts) {
      const resetTime = new Date(userAttempts.firstAttempt + windowMs);

      logSecurity('RBAC rate limit exceeded', {
        userId,
        attempts: userAttempts.count,
        maxAttempts,
        windowMinutes,
        endpoint: req.path
      });

      return tooManyRequests(res, `Too many role/permission operations. Try again after ${resetTime.toLocaleTimeString()}`, Math.ceil((userAttempts.firstAttempt + windowMs - now) / 1000), {
        retryAfter: Math.ceil((userAttempts.firstAttempt + windowMs - now) / 1000),
        resetTime: resetTime.toISOString(),
        operation: 'RBAC'
      });
    }

    // Increment attempt count
    userAttempts.count++;
    attempts.set(userId, userAttempts);

    next();
  };
};

/**
 * Log RBAC events middleware
 * Logs role and permission access attempts
 *
 * @param {string} operation - Type of RBAC operation
 * @returns {Function} Middleware function
 */
const logRBACEvent = (operation) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Parse response data
      const responseData = typeof data === 'string' ? JSON.parse(data) : data;

      // Log RBAC event with enhanced context
      logAuth(`RBAC Event: ${operation}`, req.user?.userId || null, {
        operation,
        userRoles: req.userRoles || [],
        primaryRole: req.primaryRole || null,
        userPermissions: req.userPermissions ? req.userPermissions.length : 0,
        resourceId: req.resourceId || null,
        hasOwnershipBypass: req.hasOwnershipBypass || false,
        isOwner: req.isOwner || false,
        ip: req.ip || req.connection.remoteAddress,
        timestamp: getCurrentTimestamp(),
        success: responseData.success,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode
      });

      // Log security events for access denials
      if (!responseData.success && (res.statusCode === 403 || res.statusCode === 401)) {
        logSecurity(`RBAC access denied: ${operation}`, {
          operation,
          userId: req.user?.userId,
          userRoles: req.userRoles,
          userPermissions: req.userPermissions?.length || 0,
          endpoint: req.path,
          ip: req.ip,
          reason: responseData.message
        });
      }

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  requireRole,
  requirePermission,
  checkOwnership,
  requireAdmin,
  requireSuperAdmin,
  requireModulePermission,
  requireDynamicPermission,
  optionalRole,
  createRBACRateLimit,
  logRBACEvent
};
