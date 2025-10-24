/**
 * File: src/controllers/rbac/permissionController.js
 * Permission Controller - HTTP Request Handlers
 *
 * This file handles HTTP requests for permission management endpoints.
 * It processes permission CRUD operations and access control management.
 *
 * For beginners:
 * - Controllers handle HTTP requests and responses for permission operations
 * - They manage permission creation, updates, and module organization
 * - Uses functional programming approach with individual handler functions
 * - Each function handles one specific permission endpoint
 */

const permissionService = require('../../services/rbac/permissionService');
const { success, error, created, badRequest, unauthorized, notFound } = require('../../utils/apiResponse');
const { logError, logAuth, logSecurity } = require('../../utils/logger');
const { ERROR_CODES, createError } = require('../../utils/errorCodes');
const { calculatePagination, isEmpty } = require('../../utils/helpers');
const { PAGINATION } = require('../../utils/constants');

/**
 * Create a new permission
 * POST /api/permissions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const createPermission = async (req, res) => {
  const createdBy = req.user?.userId;
  try {
    const { body } = req;
    if (!createdBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    // Call permission service
    const result = await permissionService.createPermission(body, createdBy);

    if (result.success) {
      logAuth('Permission created', createdBy, { permission: body.name || body.code });
      logSecurity('New permission created in system', { createdBy, permission: body.name || body.code });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in createPermission controller', error, { body: req.body, createdBy });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during permission creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all permissions with filtering
 * GET /api/permissions
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAllPermissions = async (req, res) => {
  try {
    const {
      page = PAGINATION.DEFAULT_PAGE,
      limit = 50,
      search = '',
      module = '',
      accessLevel = '',
      includeInactive = false,
      systemOnly = false,
      customOnly = false,
      sortBy = 'module',
      sortOrder = 'asc'
    } = req.query;

    const parsedPage = parseInt(page);
    const parsedLimit = Math.min(parseInt(limit), PAGINATION.MAX_LIMIT);

    // Call permission service
    const result = await permissionService.getAllPermissions({
      page: parsedPage,
      limit: parsedLimit,
      search,
      module,
      accessLevel,
      includeInactive: includeInactive === 'true',
      systemOnly: systemOnly === 'true',
      customOnly: customOnly === 'true',
      sortBy,
      sortOrder
    });

    if (result.success) {
      // Enhance with pagination metadata if not provided by service
      const pagination = result.data.pagination ||
                calculatePagination(parsedPage, parsedLimit, result.data.totalCount || 0);

      return success(res, result.data, result.message, 200, { pagination });
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in getAllPermissions controller', error, { query: req.query });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get permission by ID
 * GET /api/permissions/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const includeRoles = req.query.includeRoles === 'true';

    if (isEmpty(id)) {
      return badRequest(res, 'Permission ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'id',
        details: 'Permission ID parameter is required'
      }));
    }

    // Call permission service
    const result = await permissionService.getPermissionById(id, { includeRoles });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.RESOURCE_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getPermissionById controller', error, { id: req.params.id });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving permission',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update permission
 * PUT /api/permissions/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const updatePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req;
    const updatedBy = req.user?.userId;

    if (!updatedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Permission ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'id',
        details: 'Permission ID parameter is required'
      }));
    }

    // Call permission service
    const result = await permissionService.updatePermission(id, body, updatedBy);

    if (result.success) {
      logAuth('Permission updated', updatedBy, { permissionId: id, updatedFields: Object.keys(body) });
      logSecurity('Permission modified', { updatedBy, permissionId: id });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in updatePermission controller', error, { id: req.params.id, body: req.body, updatedBy: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during permission update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete permission
 * DELETE /api/permissions/:id
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const deletePermission = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.userId;

    if (!deletedBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    if (isEmpty(id)) {
      return badRequest(res, 'Permission ID is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'id',
        details: 'Permission ID parameter is required'
      }));
    }

    // Call permission service
    const result = await permissionService.deletePermission(id, deletedBy);

    if (result.success) {
      logAuth('Permission deleted', deletedBy, { permissionId: id });
      logSecurity('Permission removed from system', { deletedBy, permissionId: id });
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in deletePermission controller', error, { id: req.params.id, deletedBy: req.user?.userId });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during permission deletion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get permissions by module
 * GET /api/permissions/module/:module
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getPermissionsByModule = async (req, res) => {
  try {
    const { module } = req.params;
    const includeInactive = req.query.includeInactive === 'true';
    const groupByAction = req.query.groupByAction === 'true';

    if (isEmpty(module)) {
      return badRequest(res, 'Module name is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'module',
        details: 'Module parameter is required'
      }));
    }

    // Call permission service
    const result = await permissionService.getPermissionsByModule(module, {
      includeInactive,
      groupByAction
    });

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return notFound(res, result.message, createError(ERROR_CODES.RESOURCE_NOT_FOUND.code));

  } catch (error) {
    logError('Error in getPermissionsByModule controller', error, { module: req.params.module });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving module permissions',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get available modules
 * GET /api/permissions/modules
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getAvailableModules = async (req, res) => {
  try {
    // Call permission service
    const result = await permissionService.getAvailableModules();

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in getAvailableModules controller', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving modules',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Create permissions for a module
 * POST /api/permissions/module/:module
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const createModulePermissions = async (req, res) => {
  try {
    const { module } = req.params;
    const { actions, description, accessLevel } = req.body;
    const createdBy = req.user?.userId;

    if (!createdBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    if (isEmpty(module)) {
      return badRequest(res, 'Module name is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'module',
        details: 'Module parameter is required'
      }));
    }

    if (!actions || !Array.isArray(actions)) {
      return badRequest(res, 'Actions array is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'actions',
        details: 'Actions must be provided as an array'
      }));
    }

    // Call permission service
    const result = await permissionService.createModulePermissions(
      module,
      actions,
      { description, accessLevel },
      createdBy
    );

    if (result.success) {
      logAuth('Module permissions created', createdBy, { module, actionsCount: actions.length });
      logSecurity('Bulk permissions created for module', { createdBy, module, actionsCount: actions.length });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      field: result.field,
      details: result.errors
    }));

  } catch (error) {
    logError('Error in createModulePermissions controller', error, { module: req.params.module, body: req.body });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during module permissions creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Check user permission
 * GET /api/permissions/check/:userId/:permission
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const checkUserPermission = async (req, res) => {
  try {
    const { userId, permission } = req.params;

    if (isEmpty(userId) || isEmpty(permission)) {
      return badRequest(res, 'User ID and permission are required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: isEmpty(userId) ? 'userId' : 'permission',
        details: 'Both user ID and permission parameters are required'
      }));
    }

    // Call permission service
    const result = await permissionService.checkUserPermission(userId, permission);

    if (result.success) {
      return success(res, result.data, 'Permission check completed');
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in checkUserPermission controller', error, { userId: req.params.userId, permission: req.params.permission });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during permission check',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get permission statistics
 * GET /api/permissions/stats
 * GET /api/permissions/module/:module/stats
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const getPermissionStatistics = async (req, res) => {
  try {
    const { module } = req.params; // Optional - if present, get stats for specific module

    // Call permission service
    const result = await permissionService.getPermissionStatistics(module || null);

    if (result.success) {
      return success(res, result.data, result.message);
    }

    return badRequest(res, result.message);

  } catch (error) {
    logError('Error in getPermissionStatistics controller', error, { module: req.params.module });
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving permission statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Bulk create permissions
 * POST /api/permissions/bulk
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {Promise<void>}
 */
const bulkCreatePermissions = async (req, res) => {
  try {
    const { permissions } = req.body;
    const createdBy = req.user?.userId;

    if (!createdBy) {
      return unauthorized(res, 'Authentication required', createError(ERROR_CODES.UNAUTHORIZED.code));
    }

    if (!permissions || !Array.isArray(permissions)) {
      return badRequest(res, 'Permissions array is required', createError(ERROR_CODES.VALIDATION_FAILED.code, {
        field: 'permissions',
        details: 'Permissions must be provided as an array'
      }));
    }

    // Call permission service
    const result = await permissionService.bulkCreatePermissions(permissions, createdBy);

    if (result.success) {
      logAuth('Bulk permissions created', createdBy, { count: permissions.length });
      logSecurity('Bulk permission creation completed', { createdBy, count: permissions.length });
      return created(res, result.data, result.message);
    }

    return badRequest(res, result.message, createError(ERROR_CODES.VALIDATION_FAILED.code, {
      details: result.errors
    }));

  } catch (error) {
    logError('Error in bulkCreatePermissions controller', error, { permissionsCount: req.body.permissions?.length });
    return res.status(500).json({
      success: false,
      message: 'Internal server error during bulk permission creation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createPermission,
  getAllPermissions,
  getPermissionById,
  updatePermission,
  deletePermission,
  getPermissionsByModule,
  getAvailableModules,
  createModulePermissions,
  checkUserPermission,
  getPermissionStatistics,
  bulkCreatePermissions
};
