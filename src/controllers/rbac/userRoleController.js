/**
 * File: src/controllers/rbac/userRoleController.js
 * User Role Controller - HTTP Request Handlers
 *
 * This file handles HTTP requests for user-role assignment endpoints.
 * It processes role assignments, revocations, and user permission management.
 *
 * For beginners:
 * - Controllers handle HTTP requests and responses for user-role operations
 * - They manage the relationship between users and their assigned roles
 * - Uses functional programming approach with individual handler functions
 * - Each function handles one specific user-role endpoint
 */

const userRoleService = require('../../services/rbac/userRoleService');
const { success, error, created, badRequest, unauthorized, notFound } = require('../../utils/apiResponse');
const { logError, logAuth, logSecurity } = require('../../utils/logger');
const { ERROR_CODES, createError } = require('../../utils/errorCodes');
const { calculatePagination, isEmpty } = require('../../utils/helpers');
const { PAGINATION } = require('../../utils/constants');

/**
 * Assign role to user
 * POST /api/user-roles/assign
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const assignRole = async (req, res) => {
  try {
    const { body } = req;
    const assignedBy = req.user?.userId;

    if (!assignedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call user role service
    const result = await userRoleService.assignRole(body, assignedBy);

    if (result.success) {
      logAuth('Role assigned to user', assignedBy, {
        targetUserId: body.userId,
        roleId: body.roleId
      });
      logSecurity('User role assignment', {
        assignedBy,
        targetUserId: body.userId,
        roleId: body.roleId
      });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in assignRole controller', error, { body: req.body, assignedBy: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during role assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Revoke role from user
 * POST /api/user-roles/revoke
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const revokeRole = async (req, res) => {
  try {
    const { body } = req;
    const revokedBy = req.user?.userId;

    if (!revokedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call user role service
    const result = await userRoleService.revokeRole(body, revokedBy);

    if (result.success) {
      logAuth('Role revoked from user', revokedBy, {
        targetUserId: body.userId,
        roleId: body.roleId
      });
      logSecurity('User role revocation', {
        revokedBy,
        targetUserId: body.userId,
        roleId: body.roleId
      });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in revokeRole controller', error, { body: req.body, revokedBy: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during role revocation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's roles
 * GET /api/user-roles/user/:userId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getUserRoles = async (req, res) => {
  try {
    const { userId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const includeExpired = req.query.includeExpired === 'true';
    const includePermissions = req.query.includePermissions === 'true';

    if (isEmpty(userId)) {
      return badRequest(res, 'User ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'userId',
        details: 'User ID parameter is required'
      }));
    }

    // Call user role service
    const result = await userRoleService.getUserRoles(userId, {
      includeInactive,
      includeExpired,
      includePermissions
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.USER_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getUserRoles controller', error, { userId: req.params.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving user roles',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get role's assigned users
 * GET /api/user-roles/role/:roleId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getRoleUsers = async (req, res) => {
  try {
    const { roleId } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const includeExpired = req.query.includeExpired === 'true';
    const page = parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE;
    const limit = Math.min(parseInt(req.query.limit) || 50, PAGINATION.MAX_LIMIT);
    const search = req.query.search || '';

    if (isEmpty(roleId)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'roleId',
        details: 'Role ID parameter is required'
      }));
    }

    // Call user role service
    const result = await userRoleService.getRoleUsers(roleId, {
      includeInactive,
      includeExpired,
      page,
      limit,
      search
    });

    if (result.success) {
      // Enhance with pagination metadata if not provided by service
      const pagination = result.data.pagination ||
                calculatePagination(page, limit, result.data.totalCount || 0);

      return success(res, result.data, result.message, 200, { pagination });
    }

    return notFound(res, result.message, createError(ERROR_CODES.RESOURCE_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getRoleUsers controller', error, { roleId: req.params.roleId, query: req.query });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving role users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check if user has specific role
 * GET /api/user-roles/check/:userId/:roleId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const checkUserRole = async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    if (isEmpty(userId) || isEmpty(roleId)) {
      return badRequest(res, 'User ID and Role ID are required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: isEmpty(userId) ? 'userId' : 'roleId',
        details: 'Both user ID and role ID parameters are required'
      }));
    }

    // Call user role service
    const result = await userRoleService.checkUserRole(userId, roleId);

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in checkUserRole controller', error, { userId: req.params.userId, roleId: req.params.roleId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during role check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Set user's primary role
 * PUT /api/user-roles/primary
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const setPrimaryRole = async (req, res) => {
  try {
    const { body } = req;
    const updatedBy = req.user?.userId;

    if (!updatedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call user role service
    const result = await userRoleService.setPrimaryRole(body, updatedBy);

    if (result.success) {
      logAuth('Primary role set for user', updatedBy, {
        targetUserId: body.userId,
        roleId: body.roleId
      });
      logSecurity('User primary role changed', {
        updatedBy,
        targetUserId: body.userId,
        roleId: body.roleId
      });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in setPrimaryRole controller', error, { body: req.body, updatedBy: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while setting primary role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user's primary role
 * GET /api/user-roles/primary/:userId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getUserPrimaryRole = async (req, res) => {
  try {
    const { userId } = req.params;

    if (isEmpty(userId)) {
      return badRequest(res, 'User ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'userId',
        details: 'User ID parameter is required'
      }));
    }

    // Call user role service
    const result = await userRoleService.getUserPrimaryRole(userId);

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.USER_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getUserPrimaryRole controller', error, { userId: req.params.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving primary role',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user permissions from all assigned roles
 * GET /api/user-roles/permissions/:userId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getUserPermissions = async (req, res) => {
  try {
    const { userId } = req.params;
    const groupByModule = req.query.groupByModule === 'true';
    const includeRoleInfo = req.query.includeRoleInfo === 'true';

    if (isEmpty(userId)) {
      return badRequest(res, 'User ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'userId',
        details: 'User ID parameter is required'
      }));
    }

    // Call user role service
    const result = await userRoleService.getUserPermissions(userId, {
      groupByModule,
      includeRoleInfo
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.USER_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getUserPermissions controller', error, { userId: req.params.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving user permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Transfer user roles to another user
 * POST /api/user-roles/transfer
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const transferUserRoles = async (req, res) => {
  try {
    const { body } = req;
    const transferredBy = req.user?.userId;

    if (!transferredBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call user role service
    const result = await userRoleService.transferUserRoles(body, transferredBy);

    if (result.success) {
      logAuth('User roles transferred', transferredBy, {
        fromUserId: body.fromUserId,
        toUserId: body.toUserId
      });
      logSecurity('Role transfer completed', {
        transferredBy,
        fromUserId: body.fromUserId,
        toUserId: body.toUserId
      });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in transferUserRoles controller', error, { body: req.body, transferredBy: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during role transfer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bulk assign roles to multiple users
 * POST /api/user-roles/bulk-assign
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const bulkAssignRoles = async (req, res) => {
  try {
    const { body } = req;
    const assignedBy = req.user?.userId;

    if (!assignedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call user role service
    const result = await userRoleService.bulkAssignRoles(body, assignedBy);

    if (result.success) {
      logAuth('Bulk role assignment completed', assignedBy, {
        assignmentsCount: body.assignments?.length || 0
      });
      logSecurity('Bulk user role assignment', {
        assignedBy,
        assignmentsCount: body.assignments?.length || 0
      });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in bulkAssignRoles controller', error, { assignmentsCount: req.body.assignments?.length });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during bulk role assignment',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get user role statistics
 * GET /api/user-roles/stats
 * GET /api/user-roles/stats/:userId
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getUserRoleStatistics = async (req, res) => {
  try {
    const { userId } = req.params; // Optional - if present, get stats for specific user

    // Call user role service
    const result = await userRoleService.getUserRoleStatistics(userId || null);

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in getUserRoleStatistics controller', error, { userId: req.params.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving role statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  assignRole,
  revokeRole,
  getUserRoles,
  getRoleUsers,
  checkUserRole,
  setPrimaryRole,
  getUserPrimaryRole,
  getUserPermissions,
  transferUserRoles,
  bulkAssignRoles,
  getUserRoleStatistics
};
