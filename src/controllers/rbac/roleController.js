/**
 * File: src/controllers/rbac/roleController.js
 * Role Controller - HTTP Request Handlers
 *
 * This file handles HTTP requests for role management endpoints.
 * It processes role CRUD operations, permissions, and hierarchy management.
 *
 * For beginners:
 * - Controllers handle HTTP requests and responses for role operations
 * - They manage role creation, updates, assignments, and relationships
 * - Uses functional programming approach with individual handler functions
 * - Each function handles one specific role endpoint
 */

const roleService = require('../../services/rbac/roleService');
const { success, created, badRequest, unauthorized, notFound, internalServerError } = require('../../utils/apiResponse');
const { ERROR_CODES, createError } = require('../../utils/errorCodes');
const { logError, logAuth, logSecurity } = require('../../utils/logger');
const { calculatePagination, isEmpty } = require('../../utils/helpers');
const { PAGINATION } = require('../../utils/constants');

/**
 * Create a new role
 * POST /api/roles
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const createRole = async (req, res) => {
  const createdBy = req.user?.userId;
  try {
    const { body } = req;
    if (!createdBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to create roles'));
    }

    // Call role service
    const result = await roleService.createRole(body, createdBy);

    if (result.success) {
      logAuth('Role created', createdBy, { roleName: body.name || body.code });
      logSecurity('New role created in system', { createdBy, roleName: body.name || body.code });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Role creation failed', {
      field: result.field,
      validationErrors: result.errors
    }));

  } catch (error) {
    logError('Error in createRole controller', error, {
      userId: createdBy,
      requestBody: req.body
    });
    return internalServerError(res, 'Internal server error during role creation', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role creation failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Get all roles with filtering
 * GET /api/roles
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAllRoles = async (req, res) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = 50,
      search = '',
      includeInactive = false,
      systemOnly = false,
      customOnly = false,
      sortBy = 'priority',
      sortOrder = 'asc'
    } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

    // Call role service
    const result = await roleService.getAllRoles({
      page: parsedPage,
      limit: parsedLimit,
      search,
      includeInactive: includeInactive === 'true',
      systemOnly: systemOnly === 'true',
      customOnly: customOnly === 'true',
      sortBy,
      sortOrder
    });

    if (result.success) {
      // Enhanced pagination metadata if not provided by service
      const pagination = result.data.pagination ||
                calculatePagination(parsedPage, parsedLimit, result.data.totalCount || 0);

      return success(res, result.data, result.message, 200, { pagination });
    }

    return badRequest(res, result.message, createError(ERROR_CODES.BAD_REQUEST.code, 'Failed to retrieve roles'));

  } catch (error) {
    logError('Error in getAllRoles controller', error, {
      userId: req.user?.userId,
      queryParams: req.query
    });
    return internalServerError(res, 'Internal server error while retrieving roles', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role retrieval failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Get role by ID
 * GET /api/roles/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const includePermissions = req.query.includePermissions === 'true';
    const includeUsers = req.query.includeUsers === 'true';
    const includeHierarchy = req.query.includeHierarchy === 'true';

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    // Call role service
    const result = await roleService.getRoleById(id, {
      includePermissions,
      includeUsers,
      includeHierarchy
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.RESOURCE_NOT_FOUND.code, 'The specified role could not be found'));

  } catch (error) {
    logError('Error in getRoleById controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      queryParams: req.query
    });
    return internalServerError(res, 'Internal server error while retrieving role', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role retrieval failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Update role
 * PUT /api/roles/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const updatedBy = req.user?.userId;

    if (!updatedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to update roles'));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    // Call role service
    const result = await roleService.updateRole(id, body, updatedBy);

    if (result.success) {
      logAuth('Role updated', updatedBy, { roleId: id, updatedFields: Object.keys(body) });
      logSecurity('Role modified in system', { updatedBy, roleId: id, changeCount: Object.keys(body).length });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Role update failed', {
      field: result.field,
      validationErrors: result.errors
    }));

  } catch (error) {
    logError('Error in updateRole controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      requestBody: req.body
    });
    return internalServerError(res, 'Internal server error during role update', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role update failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Delete role
 * DELETE /api/roles/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.userId;

    if (!deletedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to delete roles'));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    // Call role service
    const result = await roleService.deleteRole(id, deletedBy);

    if (result.success) {
      logAuth('Role deleted', deletedBy, { roleId: id });
      logSecurity('Role removed from system', { deletedBy, roleId: id });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.BAD_REQUEST.code, 'Role deletion failed'));

  } catch (error) {
    logError('Error in deleteRole controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId
    });
    return internalServerError(res, 'Internal server error during role deletion', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role deletion failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Assign permissions to role
 * POST /api/roles/:id/permissions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const assignPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const assignedBy = req.user?.userId;

    if (!assignedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to assign permissions'));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return badRequest(res, 'Permission IDs array is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid permission data', {
        field: 'permissionIds',
        details: 'Permission IDs must be provided as a non-empty array'
      }));
    }

    // Call role service
    const result = await roleService.assignPermissions(id, permissionIds, assignedBy);

    if (result.success) {
      logAuth('Permissions assigned to role', assignedBy, { roleId: id, permissionsCount: permissionIds.length });
      logSecurity('Role permissions modified - assignment', { assignedBy, roleId: id, permissionsAdded: permissionIds.length });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Permission assignment failed', {
      field: result.field,
      validationErrors: result.errors
    }));

  } catch (error) {
    logError('Error in assignPermissions controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      permissionIds: req.body.permissionIds
    });
    return internalServerError(res, 'Internal server error during permission assignment', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Permission assignment failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Remove permissions from role
 * DELETE /api/roles/:id/permissions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const removePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    const removedBy = req.user?.userId;

    if (!removedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to remove permissions'));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    if (!permissionIds || !Array.isArray(permissionIds)) {
      return badRequest(res, 'Permission IDs array is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid permission data', {
        field: 'permissionIds',
        details: 'Permission IDs must be provided as a non-empty array'
      }));
    }

    // Call role service
    const result = await roleService.removePermissions(id, permissionIds, removedBy);

    if (result.success) {
      logAuth('Permissions removed from role', removedBy, { roleId: id, permissionsCount: permissionIds.length });
      logSecurity('Role permissions modified - removal', { removedBy, roleId: id, permissionsRemoved: permissionIds.length });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Permission removal failed', {
      field: result.field,
      validationErrors: result.errors
    }));

  } catch (error) {
    logError('Error in removePermissions controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      permissionIds: req.body.permissionIds
    });
    return internalServerError(res, 'Internal server error during permission removal', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Permission removal failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Get role permissions
 * GET /api/roles/:id/permissions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getRolePermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const includeInherited = req.query.includeInherited === 'true';
    const groupByModule = req.query.groupByModule === 'true';

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    // Call role service
    const result = await roleService.getRolePermissions(id, {
      includeInherited,
      groupByModule
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.RESOURCE_NOT_FOUND.code, 'The specified role could not be found'));

  } catch (error) {
    logError('Error in getRolePermissions controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      queryParams: req.query
    });
    return internalServerError(res, 'Internal server error while retrieving role permissions', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role permissions retrieval failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Get role hierarchy
 * GET /api/roles/:id/hierarchy
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getRoleHierarchy = async (req, res) => {
  try {
    const { id } = req.params;
    const includePermissions = req.query.includePermissions === 'true';
    const maxDepth = parseInt(req.query.maxDepth) || 5;

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    // Call role service
    const result = await roleService.getRoleHierarchy(id, {
      includePermissions,
      maxDepth
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.RESOURCE_NOT_FOUND.code, 'The specified role could not be found'));

  } catch (error) {
    logError('Error in getRoleHierarchy controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      queryParams: req.query
    });
    return internalServerError(res, 'Internal server error while retrieving role hierarchy', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role hierarchy retrieval failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Duplicate role
 * POST /api/roles/:id/duplicate
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const duplicateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const createdBy = req.user?.userId;

    if (!createdBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to duplicate roles'));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Role ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid role ID', {
        field: 'id',
        details: 'Role ID parameter is required and cannot be empty'
      }));
    }

    // Call role service
    const result = await roleService.duplicateRole(id, body, createdBy);

    if (result.success) {
      logAuth('Role duplicated', createdBy, { originalRoleId: id, newRoleId: result.data?.id });
      logSecurity('Role duplicated in system', { createdBy, originalRoleId: id, newRoleId: result.data?.id });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Role duplication failed', {
      field: result.field,
      validationErrors: result.errors
    }));

  } catch (error) {
    logError('Error in duplicateRole controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId,
      requestBody: req.body
    });
    return internalServerError(res, 'Internal server error during role duplication', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role duplication failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Get role statistics
 * GET /api/roles/stats
 * GET /api/roles/:id/stats
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getRoleStatistics = async (req, res) => {
  try {
    const { id } = req.params; // Optional - if present, get stats for specific role

    // Call role service
    const result = await roleService.getRoleStatistics(id || null);

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.BAD_REQUEST.code, 'Failed to retrieve role statistics'));

  } catch (error) {
    logError('Error in getRoleStatistics controller', error, {
      roleId: req.params.id,
      userId: req.user?.userId
    });
    return internalServerError(res, 'Internal server error while retrieving role statistics', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Role statistics retrieval failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

/**
 * Bulk create roles
 * POST /api/roles/bulk
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const bulkCreateRoles = async (req, res) => {
  try {
    const { roles } = req.body;
    const createdBy = req.user?.userId;

    if (!createdBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code, 'User authentication is required to create roles'));
    }

    if (!roles || !Array.isArray(roles)) {
      return badRequest(res, 'Roles array is required', createError(ERROR_CODES.VALIDATION_FAILED.code, 'Invalid roles data', {
        field: 'roles',
        details: 'Roles must be provided as a non-empty array'
      }));
    }

    // Call role service
    const result = await roleService.bulkCreateRoles(roles, createdBy);

    if (result.success) {
      logAuth('Bulk roles created', createdBy, { roleCount: roles.length });
      logSecurity('Bulk role creation completed', { createdBy, roleCount: roles.length });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, 'Bulk role creation failed', {
      validationErrors: result.errors
    }));

  } catch (error) {
    logError('Error in bulkCreateRoles controller', error, {
      userId: req.user?.userId,
      roleCount: req.body?.roles?.length
    });
    return internalServerError(res, 'Internal server error during bulk role creation', createError(ERROR_CODES.INTERNAL_SERVER_ERROR.code, 'Bulk role creation failed', {
      originalError: process.env.NODE_ENV === 'development' ? error.message : undefined
    }));
  }
};

module.exports = {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  assignPermissions,
  removePermissions,
  getRolePermissions,
  getRoleHierarchy,
  duplicateRole,
  getRoleStatistics,
  bulkCreateRoles
};
