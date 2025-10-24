/**
 * File: src/services/rbac/permissionService.js
 * Permission Service - MySQL2 Business Logic
 *
 * This file handles all permission management business logic including
 * permission creation, updates, and access control management.
 *
 * For beginners:
 * - Permissions define specific actions users can perform
 * - This service manages permission CRUD operations
 * - Uses functional programming approach
 * - Integrates with Yup validation and MySQL2 models
 */

const { PermissionModel, RolePermissionModel } = require('../../models');
const { RBAC: RBACSchemas } = require('../../schemas');

/**
 * Create a new permission
 *
 * @param {Object} permissionData - Permission creation data
 * @param {string} createdBy - ID of user creating the permission
 * @returns {Promise<Object>} Permission creation result
 */
const createPermission = async (permissionData, createdBy) => {
  try {
    // Validate permission data using Yup
    const validatedData = await RBACSchemas.permissionCreateSchema.validate(permissionData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if permission name already exists
    const existingPermission = await PermissionModel.findByName(validatedData.name);
    if (existingPermission) {
      return {
        success: false,
        message: 'Permission with this name already exists',
        field: 'name'
      };
    }

    // Create permission
    const newPermission = await PermissionModel.create({
      ...validatedData,
      createdBy
    });

    if (!newPermission.success) {
      return {
        success: false,
        message: 'Failed to create permission',
        error: newPermission.error
      };
    }

    return {
      success: true,
      message: 'Permission created successfully',
      data: newPermission.data
    };

  } catch (error) {
    console.error('Error in createPermission:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Permission creation failed',
      error: error.message
    };
  }
};

/**
 * Update an existing permission
 *
 * @param {string} permissionId - Permission ID
 * @param {Object} updateData - Permission update data
 * @param {string} updatedBy - ID of user updating the permission
 * @returns {Promise<Object>} Permission update result
 */
const updatePermission = async (permissionId, updateData, updatedBy) => {
  try {
    // Validate update data using Yup
    const validatedData = await RBACSchemas.permissionUpdateSchema.validate(updateData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if permission exists
    const existingPermission = await PermissionModel.findById(permissionId);
    if (!existingPermission) {
      return {
        success: false,
        message: 'Permission not found'
      };
    }

    // Check if permission is system permission and prevent certain updates
    if (existingPermission.isSystem && (validatedData.name || validatedData.module || validatedData.action)) {
      return {
        success: false,
        message: 'Cannot modify name, module, or action of system permissions'
      };
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingPermission.name) {
      const duplicatePermission = await PermissionModel.findByName(validatedData.name);
      if (duplicatePermission) {
        return {
          success: false,
          message: 'Permission with this name already exists',
          field: 'name'
        };
      }
    }

    // Update permission
    const updateResult = await PermissionModel.update(permissionId, {
      ...validatedData,
      updatedBy
    });

    if (!updateResult.success) {
      return {
        success: false,
        message: 'Failed to update permission',
        error: updateResult.error
      };
    }

    return {
      success: true,
      message: 'Permission updated successfully',
      data: updateResult.data
    };

  } catch (error) {
    console.error('Error in updatePermission:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Permission update failed',
      error: error.message
    };
  }
};

/**
 * Get permission by ID
 *
 * @param {string} permissionId - Permission ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Permission data result
 */
const getPermissionById = async (permissionId, options = {}) => {
  try {
    const { includeRoles = false } = options;

    const permission = await PermissionModel.findById(permissionId, { includeRoles });

    if (!permission) {
      return {
        success: false,
        message: 'Permission not found'
      };
    }

    return {
      success: true,
      message: 'Permission retrieved successfully',
      data: permission
    };

  } catch (error) {
    console.error('Error in getPermissionById:', error);
    return {
      success: false,
      message: 'Failed to retrieve permission',
      error: error.message
    };
  }
};

/**
 * Get all permissions with filtering and pagination
 *
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Permissions list result
 */
const getAllPermissions = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      module = '',
      accessLevel = '',
      includeInactive = false,
      systemOnly = false,
      customOnly = false,
      sortBy = 'module',
      sortOrder = 'asc'
    } = options;

    const permissionsResult = await PermissionModel.findAll({
      page,
      limit,
      search,
      module,
      accessLevel,
      includeInactive,
      systemOnly,
      customOnly,
      sortBy,
      sortOrder
    });

    return {
      success: permissionsResult.success,
      message: permissionsResult.success ? 'Permissions retrieved successfully' : permissionsResult.message,
      data: permissionsResult.data
    };

  } catch (error) {
    console.error('Error in getAllPermissions:', error);
    return {
      success: false,
      message: 'Failed to retrieve permissions',
      error: error.message
    };
  }
};

/**
 * Get permissions by module
 *
 * @param {string} module - Module name
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Module permissions result
 */
const getPermissionsByModule = async (module, options = {}) => {
  try {
    const { includeInactive = false, groupByAction = false } = options;

    const permissionsResult = await PermissionModel.findByModule(module, {
      includeInactive,
      groupByAction
    });

    return {
      success: permissionsResult.success,
      message: permissionsResult.success ? 'Module permissions retrieved successfully' : permissionsResult.message,
      data: permissionsResult.data
    };

  } catch (error) {
    console.error('Error in getPermissionsByModule:', error);
    return {
      success: false,
      message: 'Failed to retrieve module permissions',
      error: error.message
    };
  }
};

/**
 * Delete a permission (soft delete)
 *
 * @param {string} permissionId - Permission ID
 * @param {string} deletedBy - ID of user deleting the permission
 * @returns {Promise<Object>} Permission deletion result
 */
const deletePermission = async (permissionId, deletedBy) => {
  try {
    // Check if permission exists
    const existingPermission = await PermissionModel.findById(permissionId);
    if (!existingPermission) {
      return {
        success: false,
        message: 'Permission not found'
      };
    }

    // Prevent deletion of system permissions
    if (existingPermission.isSystem) {
      return {
        success: false,
        message: 'Cannot delete system permissions'
      };
    }

    // Check if permission is assigned to any roles
    const permissionRoles = await RolePermissionModel.getPermissionRoles(permissionId);
    if (permissionRoles.success && permissionRoles.data.roles.length > 0) {
      return {
        success: false,
        message: `Cannot delete permission. It is assigned to ${permissionRoles.data.roles.length} role(s). Remove from all roles first.`
      };
    }

    // Soft delete the permission
    const deleteResult = await PermissionModel.softDelete(permissionId, deletedBy);

    return {
      success: deleteResult.success,
      message: deleteResult.success ? 'Permission deleted successfully' : deleteResult.message,
      data: deleteResult.success ? { permissionId, deletedBy, deletedAt: new Date() } : null
    };

  } catch (error) {
    console.error('Error in deletePermission:', error);
    return {
      success: false,
      message: 'Permission deletion failed',
      error: error.message
    };
  }
};

/**
 * Get available modules
 *
 * @returns {Promise<Object>} Available modules result
 */
const getAvailableModules = async () => {
  try {
    const modulesResult = await PermissionModel.getModules();

    return {
      success: modulesResult.success,
      message: modulesResult.success ? 'Modules retrieved successfully' : modulesResult.message,
      data: modulesResult.data
    };

  } catch (error) {
    console.error('Error in getAvailableModules:', error);
    return {
      success: false,
      message: 'Failed to retrieve modules',
      error: error.message
    };
  }
};

/**
 * Create permissions for a module (bulk operation)
 *
 * @param {string} module - Module name
 * @param {Array} actions - Array of actions
 * @param {Object} options - Creation options
 * @param {string} createdBy - ID of user creating permissions
 * @returns {Promise<Object>} Bulk creation result
 */
const createModulePermissions = async (module, actions, options = {}, createdBy) => {
  try {
    const { description, accessLevel = 'user' } = options;

    // Validate input using Yup
    const validatedData = await RBACSchemas.modulePermissionCreateSchema.validate({
      module,
      actions,
      accessLevel
    });

    const results = {
      successful: [],
      failed: [],
      total: validatedData.actions.length
    };

    // Create permission for each action
    for (const action of validatedData.actions) {
      try {
        const permissionName = `${validatedData.module}.${action}`;

        const permissionData = {
          name: permissionName,
          description: description || `${action} permission for ${validatedData.module} module`,
          module: validatedData.module,
          action: action,
          accessLevel: validatedData.accessLevel
        };

        const result = await createPermission(permissionData, createdBy);

        if (result.success) {
          results.successful.push({
            name: permissionName,
            id: result.data.id
          });
        } else {
          results.failed.push({
            name: permissionName,
            error: result.message
          });
        }
      } catch (error) {
        results.failed.push({
          name: `${validatedData.module}.${action}`,
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.total} permissions: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    };

  } catch (error) {
    console.error('Error in createModulePermissions:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Module permissions creation failed',
      error: error.message
    };
  }
};

/**
 * Check if user has specific permission
 *
 * @param {string} userId - User ID
 * @param {string} permission - Permission name (module.action)
 * @returns {Promise<Object>} Permission check result
 */
const checkUserPermission = async (userId, permission) => {
  try {
    // This function coordinates with UserRoleModel to check permissions
    const { UserRoleModel } = require('../../models');

    // Get user roles with permissions
    const userRoles = await UserRoleModel.getUserRoles(userId, { includePermissions: true });

    if (!userRoles.success) {
      return {
        success: false,
        message: 'Failed to retrieve user roles'
      };
    }

    // Check if user has the specific permission through any role
    const hasPermission = userRoles.data.roles.some(role =>
      role.permissions && role.permissions.includes(permission)
    );

    return {
      success: true,
      data: {
        userId,
        permission,
        hasPermission,
        grantedThrough: hasPermission ?
          userRoles.data.roles.filter(role =>
            role.permissions && role.permissions.includes(permission)
          ).map(role => role.role_name) : []
      }
    };

  } catch (error) {
    console.error('Error in checkUserPermission:', error);
    return {
      success: false,
      message: 'Permission check failed',
      error: error.message
    };
  }
};

/**
 * Get permission statistics
 *
 * @param {string|null} module - Module name (null for all modules)
 * @returns {Promise<Object>} Permission statistics result
 */
const getPermissionStatistics = async (module = null) => {
  try {
    const statsResult = await PermissionModel.getStatistics(module);

    return {
      success: statsResult.success,
      message: statsResult.success ? 'Permission statistics retrieved successfully' : statsResult.message,
      data: statsResult.data
    };

  } catch (error) {
    console.error('Error in getPermissionStatistics:', error);
    return {
      success: false,
      message: 'Failed to retrieve permission statistics',
      error: error.message
    };
  }
};

/**
 * Bulk create permissions
 *
 * @param {Array} permissionsData - Array of permission data objects
 * @param {string} createdBy - ID of user creating permissions
 * @returns {Promise<Object>} Bulk creation result
 */
const bulkCreatePermissions = async (permissionsData, createdBy) => {
  try {
    // Validate bulk data using Yup
    const validatedData = await RBACSchemas.permissionBulkCreateSchema.validate({
      permissions: permissionsData
    });

    const results = {
      successful: [],
      failed: [],
      total: validatedData.permissions.length
    };

    // Process each permission
    for (const permissionData of validatedData.permissions) {
      try {
        const result = await createPermission(permissionData, createdBy);

        if (result.success) {
          results.successful.push({
            name: permissionData.name,
            id: result.data.id
          });
        } else {
          results.failed.push({
            name: permissionData.name,
            error: result.message
          });
        }
      } catch (error) {
        results.failed.push({
          name: permissionData.name || 'Unknown',
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.total} permissions: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    };

  } catch (error) {
    console.error('Error in bulkCreatePermissions:', error);

    // Handle Yup validation errors
    if (error.name === 'ValidationError') {
      return {
        success: false,
        message: 'Validation failed',
        errors: error.errors,
        field: error.path
      };
    }

    return {
      success: false,
      message: 'Bulk permission creation failed',
      error: error.message
    };
  }
};

module.exports = {
  createPermission,
  updatePermission,
  getPermissionById,
  getAllPermissions,
  getPermissionsByModule,
  deletePermission,
  getAvailableModules,
  createModulePermissions,
  checkUserPermission,
  getPermissionStatistics,
  bulkCreatePermissions
};
