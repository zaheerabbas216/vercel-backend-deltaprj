/**
 * File: src/services/rbac/roleService.js
 * Role Service - MySQL2 Business Logic
 *
 * This file handles all role management business logic including
 * role creation, updates, assignments, and hierarchy management.
 *
 * For beginners:
 * - Roles define what users can do in the system
 * - This service manages role CRUD operations and relationships
 * - Uses functional programming approach
 * - Integrates with Yup validation and MySQL2 models
 */

const { RoleModel, RolePermissionModel, UserRoleModel } = require('../../models');
const { RBAC: RBACSchemas } = require('../../schemas');

/**
 * Create a new role
 *
 * @param {Object} roleData - Role creation data
 * @param {string} createdBy - ID of user creating the role
 * @returns {Promise<Object>} Role creation result
 */
const createRole = async (roleData, createdBy) => {
  try {
    // Validate role data using Yup
    const validatedData = await RBACSchemas.roleCreateSchema.validate(roleData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if role name already exists
    const existingRole = await RoleModel.findByName(validatedData.name);
    if (existingRole) {
      return {
        success: false,
        message: 'Role with this name already exists',
        field: 'name'
      };
    }

    // If parent role is specified, verify it exists
    if (validatedData.parentId) {
      const parentRole = await RoleModel.findById(validatedData.parentId);
      if (!parentRole) {
        return {
          success: false,
          message: 'Parent role not found',
          field: 'parentId'
        };
      }
    }

    // Create role
    const newRole = await RoleModel.create({
      ...validatedData,
      createdBy
    });

    if (!newRole.success) {
      return {
        success: false,
        message: 'Failed to create role',
        error: newRole.error
      };
    }

    return {
      success: true,
      message: 'Role created successfully',
      data: newRole.data
    };

  } catch (error) {
    console.error('Error in createRole:', error);

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
      message: 'Role creation failed',
      error: error.message
    };
  }
};

/**
 * Update an existing role
 *
 * @param {string} roleId - Role ID
 * @param {Object} updateData - Role update data
 * @param {string} updatedBy - ID of user updating the role
 * @returns {Promise<Object>} Role update result
 */
const updateRole = async (roleId, updateData, updatedBy) => {
  try {
    // Validate update data using Yup
    const validatedData = await RBACSchemas.roleUpdateSchema.validate(updateData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if role exists
    const existingRole = await RoleModel.findById(roleId);
    if (!existingRole) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Check if role is system role and prevent certain updates
    if (existingRole.isSystem && (validatedData.name || validatedData.isSystem === false)) {
      return {
        success: false,
        message: 'Cannot modify name or system status of system roles'
      };
    }

    // If updating name, check for duplicates
    if (validatedData.name && validatedData.name !== existingRole.name) {
      const duplicateRole = await RoleModel.findByName(validatedData.name);
      if (duplicateRole) {
        return {
          success: false,
          message: 'Role with this name already exists',
          field: 'name'
        };
      }
    }

    // If updating parent, verify it exists and prevents circular hierarchy
    if (validatedData.parentId) {
      const parentRole = await RoleModel.findById(validatedData.parentId);
      if (!parentRole) {
        return {
          success: false,
          message: 'Parent role not found',
          field: 'parentId'
        };
      }

      // Check for circular hierarchy
      const wouldCreateCycle = await RoleModel.wouldCreateCircularHierarchy(roleId, validatedData.parentId);
      if (wouldCreateCycle) {
        return {
          success: false,
          message: 'Cannot set parent role as it would create a circular hierarchy',
          field: 'parentId'
        };
      }
    }

    // Update role
    const updateResult = await RoleModel.update(roleId, {
      ...validatedData,
      updatedBy
    });

    if (!updateResult.success) {
      return {
        success: false,
        message: 'Failed to update role',
        error: updateResult.error
      };
    }

    return {
      success: true,
      message: 'Role updated successfully',
      data: updateResult.data
    };

  } catch (error) {
    console.error('Error in updateRole:', error);

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
      message: 'Role update failed',
      error: error.message
    };
  }
};

/**
 * Get role by ID with optional details
 *
 * @param {string} roleId - Role ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Role data result
 */
const getRoleById = async (roleId, options = {}) => {
  try {
    const { includePermissions = false, includeUsers = false, includeHierarchy = false } = options;

    const role = await RoleModel.findById(roleId, {
      includePermissions,
      includeUsers,
      includeHierarchy
    });

    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    return {
      success: true,
      message: 'Role retrieved successfully',
      data: role
    };

  } catch (error) {
    console.error('Error in getRoleById:', error);
    return {
      success: false,
      message: 'Failed to retrieve role',
      error: error.message
    };
  }
};

/**
 * Get all roles with filtering and pagination
 *
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Roles list result
 */
const getAllRoles = async (options = {}) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      includeInactive = false,
      systemOnly = false,
      customOnly = false,
      sortBy = 'priority',
      sortOrder = 'asc'
    } = options;

    const rolesResult = await RoleModel.findAll({
      page,
      limit,
      search,
      includeInactive,
      systemOnly,
      customOnly,
      sortBy,
      sortOrder
    });

    return {
      success: rolesResult.success,
      message: rolesResult.success ? 'Roles retrieved successfully' : rolesResult.message,
      data: rolesResult.data
    };

  } catch (error) {
    console.error('Error in getAllRoles:', error);
    return {
      success: false,
      message: 'Failed to retrieve roles',
      error: error.message
    };
  }
};

/**
 * Delete a role (soft delete)
 *
 * @param {string} roleId - Role ID
 * @param {string} deletedBy - ID of user deleting the role
 * @returns {Promise<Object>} Role deletion result
 */
const deleteRole = async (roleId, deletedBy) => {
  try {
    // Check if role exists
    const existingRole = await RoleModel.findById(roleId);
    if (!existingRole) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Prevent deletion of system roles
    if (existingRole.isSystem) {
      return {
        success: false,
        message: 'Cannot delete system roles'
      };
    }

    // Check if role has active users
    const roleUsers = await UserRoleModel.getRoleUsers(roleId, { includeInactive: false });
    if (roleUsers.success && roleUsers.data.users.length > 0) {
      return {
        success: false,
        message: `Cannot delete role. It is assigned to ${roleUsers.data.users.length} user(s). Remove all user assignments first.`
      };
    }

    // Check if role has child roles
    const childRoles = await RoleModel.getChildRoles(roleId);
    if (childRoles.success && childRoles.data.length > 0) {
      return {
        success: false,
        message: `Cannot delete role. It has ${childRoles.data.length} child role(s). Remove child roles first.`
      };
    }

    // Soft delete the role
    const deleteResult = await RoleModel.softDelete(roleId, deletedBy);

    return {
      success: deleteResult.success,
      message: deleteResult.success ? 'Role deleted successfully' : deleteResult.message,
      data: deleteResult.success ? { roleId, deletedBy, deletedAt: new Date() } : null
    };

  } catch (error) {
    console.error('Error in deleteRole:', error);
    return {
      success: false,
      message: 'Role deletion failed',
      error: error.message
    };
  }
};

/**
 * Assign permissions to a role
 *
 * @param {string} roleId - Role ID
 * @param {Array} permissionIds - Array of permission IDs
 * @param {string} assignedBy - ID of user making the assignment
 * @returns {Promise<Object>} Permission assignment result
 */
const assignPermissions = async (roleId, permissionIds, assignedBy) => {
  try {
    // Validate input using Yup
    const validatedData = await RBACSchemas.rolePermissionAssignSchema.validate({
      roleId,
      permissionIds
    });

    // Check if role exists
    const role = await RoleModel.findById(validatedData.roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Assign permissions
    const assignResult = await RolePermissionModel.assignPermissions(
      validatedData.roleId,
      validatedData.permissionIds,
      assignedBy
    );

    return {
      success: assignResult.success,
      message: assignResult.success ? 'Permissions assigned successfully' : assignResult.message,
      data: assignResult.data
    };

  } catch (error) {
    console.error('Error in assignPermissions:', error);

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
      message: 'Permission assignment failed',
      error: error.message
    };
  }
};

/**
 * Remove permissions from a role
 *
 * @param {string} roleId - Role ID
 * @param {Array} permissionIds - Array of permission IDs to remove
 * @param {string} removedBy - ID of user removing the permissions
 * @returns {Promise<Object>} Permission removal result
 */
const removePermissions = async (roleId, permissionIds, removedBy) => {
  try {
    // Validate input using Yup
    const validatedData = await RBACSchemas.rolePermissionRemoveSchema.validate({
      roleId,
      permissionIds
    });

    // Check if role exists
    const role = await RoleModel.findById(validatedData.roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Remove permissions
    const removeResult = await RolePermissionModel.removePermissions(
      validatedData.roleId,
      validatedData.permissionIds,
      removedBy
    );

    return {
      success: removeResult.success,
      message: removeResult.success ? 'Permissions removed successfully' : removeResult.message,
      data: removeResult.data
    };

  } catch (error) {
    console.error('Error in removePermissions:', error);

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
      message: 'Permission removal failed',
      error: error.message
    };
  }
};

/**
 * Get role permissions with details
 *
 * @param {string} roleId - Role ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Role permissions result
 */
const getRolePermissions = async (roleId, options = {}) => {
  try {
    const { includeInherited = false, groupByModule = false } = options;

    // Check if role exists
    const role = await RoleModel.findById(roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Get role permissions
    const permissionsResult = await RolePermissionModel.getRolePermissions(roleId, {
      includeInherited,
      groupByModule
    });

    return {
      success: permissionsResult.success,
      message: permissionsResult.success ? 'Role permissions retrieved successfully' : permissionsResult.message,
      data: permissionsResult.data
    };

  } catch (error) {
    console.error('Error in getRolePermissions:', error);
    return {
      success: false,
      message: 'Failed to retrieve role permissions',
      error: error.message
    };
  }
};

/**
 * Get role hierarchy (parent and child roles)
 *
 * @param {string} roleId - Role ID
 * @param {Object} options - Query options
 * @returns {Promise<Object>} Role hierarchy result
 */
const getRoleHierarchy = async (roleId, options = {}) => {
  try {
    const { includePermissions = false, maxDepth = 5 } = options;

    // Check if role exists
    const role = await RoleModel.findById(roleId);
    if (!role) {
      return {
        success: false,
        message: 'Role not found'
      };
    }

    // Get role hierarchy
    const hierarchyResult = await RoleModel.getRoleHierarchy(roleId, {
      includePermissions,
      maxDepth
    });

    return {
      success: hierarchyResult.success,
      message: hierarchyResult.success ? 'Role hierarchy retrieved successfully' : hierarchyResult.message,
      data: hierarchyResult.data
    };

  } catch (error) {
    console.error('Error in getRoleHierarchy:', error);
    return {
      success: false,
      message: 'Failed to retrieve role hierarchy',
      error: error.message
    };
  }
};

/**
 * Get role statistics
 *
 * @param {string|null} roleId - Role ID (null for all roles)
 * @returns {Promise<Object>} Role statistics result
 */
const getRoleStatistics = async (roleId = null) => {
  try {
    const statsResult = await RoleModel.getStatistics(roleId);

    return {
      success: statsResult.success,
      message: statsResult.success ? 'Role statistics retrieved successfully' : statsResult.message,
      data: statsResult.data
    };

  } catch (error) {
    console.error('Error in getRoleStatistics:', error);
    return {
      success: false,
      message: 'Failed to retrieve role statistics',
      error: error.message
    };
  }
};

/**
 * Duplicate a role with new name
 *
 * @param {string} roleId - Source role ID
 * @param {Object} duplicateData - Duplication data
 * @param {string} createdBy - ID of user creating the duplicate
 * @returns {Promise<Object>} Role duplication result
 */
const duplicateRole = async (roleId, duplicateData, createdBy) => {
  try {
    // Validate duplicate data using Yup
    const validatedData = await RBACSchemas.roleDuplicateSchema.validate(duplicateData, {
      stripUnknown: true,
      abortEarly: false
    });

    // Check if source role exists
    const sourceRole = await RoleModel.findById(roleId, { includePermissions: true });
    if (!sourceRole) {
      return {
        success: false,
        message: 'Source role not found'
      };
    }

    // Check if new role name already exists
    const existingRole = await RoleModel.findByName(validatedData.name);
    if (existingRole) {
      return {
        success: false,
        message: 'Role with this name already exists',
        field: 'name'
      };
    }

    // Create duplicate role data
    const newRoleData = {
      name: validatedData.name,
      description: validatedData.description || `Copy of ${sourceRole.description}`,
      priority: validatedData.priority || sourceRole.priority + 1,
      isSystem: false, // Duplicated roles are never system roles
      isActive: validatedData.isActive !== undefined ? validatedData.isActive : sourceRole.isActive,
      parentId: validatedData.parentId || sourceRole.parentId
    };

    // Create the new role
    const newRole = await RoleModel.create({
      ...newRoleData,
      createdBy
    });

    if (!newRole.success) {
      return {
        success: false,
        message: 'Failed to create duplicate role',
        error: newRole.error
      };
    }

    // Copy permissions if requested
    if (validatedData.copyPermissions && sourceRole.permissions && sourceRole.permissions.length > 0) {
      const permissionIds = sourceRole.permissions.map(p => p.id);
      await RolePermissionModel.assignPermissions(newRole.data.id, permissionIds, createdBy);
    }

    return {
      success: true,
      message: 'Role duplicated successfully',
      data: {
        sourceRole: { id: roleId, name: sourceRole.name },
        newRole: newRole.data
      }
    };

  } catch (error) {
    console.error('Error in duplicateRole:', error);

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
      message: 'Role duplication failed',
      error: error.message
    };
  }
};

/**
 * Bulk create roles
 *
 * @param {Array} rolesData - Array of role data objects
 * @param {string} createdBy - ID of user creating the roles
 * @returns {Promise<Object>} Bulk creation result
 */
const bulkCreateRoles = async (rolesData, createdBy) => {
  try {
    // Validate bulk data using Yup
    const validatedData = await RBACSchemas.roleBulkCreateSchema.validate({ roles: rolesData });

    const results = {
      successful: [],
      failed: [],
      total: validatedData.roles.length
    };

    // Process each role
    for (const roleData of validatedData.roles) {
      try {
        const result = await createRole(roleData, createdBy);

        if (result.success) {
          results.successful.push({
            name: roleData.name,
            id: result.data.id
          });
        } else {
          results.failed.push({
            name: roleData.name,
            error: result.message
          });
        }
      } catch (error) {
        results.failed.push({
          name: roleData.name || 'Unknown',
          error: error.message
        });
      }
    }

    return {
      success: true,
      message: `Processed ${results.total} roles: ${results.successful.length} successful, ${results.failed.length} failed`,
      data: results
    };

  } catch (error) {
    console.error('Error in bulkCreateRoles:', error);

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
      message: 'Bulk role creation failed',
      error: error.message
    };
  }
};

module.exports = {
  createRole,
  updateRole,
  getRoleById,
  getAllRoles,
  deleteRole,
  assignPermissions,
  removePermissions,
  getRolePermissions,
  getRoleHierarchy,
  getRoleStatistics,
  duplicateRole,
  bulkCreateRoles
};
